from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from prompt import build_prompt, build_chat_system_prompt
from rag import retrieve_context
from company_analyser import analyse_company
import os
import re
import json
import io
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, List

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://product-fb-analyser.vercel.app", "https://product-fb-analyser-q6c77ew7l-app-demo1.vercel.app", "http://localhost:3000", "http://localhost:3001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class FeedbackRequest(BaseModel):
    feedback: str
    product_name: Optional[str] = ""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    product_name: str
    feedback: str
    analysis: dict
    message: str
    history: List[ChatMessage] = []


@app.post("/analyse")
async def analyse(request: FeedbackRequest):
    if not request.feedback.strip():
        raise HTTPException(status_code=400, detail="Feedback cannot be empty")

    try:
        # Truncate to stay within Groq free-tier TPM limit (6000 tokens/min)
        feedback_trimmed = request.feedback[:3000]
        query = f"{request.product_name} {feedback_trimmed[:400]}"
        vc_context = retrieve_context(query, n_results=2)

        prompt = build_prompt(
            feedback=feedback_trimmed,
            product_name=request.product_name or "",
            vc_context=vc_context,
        )

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1000,
            response_format={"type": "json_object"},
        )

        if response.usage:
            _add_tokens(response.usage.total_tokens)
        raw = response.choices[0].message.content.strip()
        raw = re.sub(r"^```json\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"^```\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
        raw = raw.strip()
        try:
            result = json.loads(raw)
        except json.JSONDecodeError:
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if m:
                result = json.loads(m.group())
            else:
                raise HTTPException(status_code=422, detail=f"LLM returned invalid JSON: {raw[:200]}")
        # Use LLM-inferred name if user didn't provide one
        if not request.product_name:
            inferred = result.get("product_name", "").strip()
            if not inferred:
                # Regex fallback: scan first 600 chars for common header patterns
                patterns = [
                    r"—\s*([A-Z][a-zA-Z0-9.]+(?:\s[A-Z][a-zA-Z0-9.]+)?)\s*$",
                    r"(?:Reviews?|Tickets?|Feedback|Support)[^\n—]*—\s*([A-Z][a-zA-Z0-9.]+(?:\s[A-Z][a-zA-Z0-9.]+)?)",
                    r"^#+\s*([A-Z][a-zA-Z0-9.]+(?:\s[A-Z][a-zA-Z0-9.]+)?)\s+(?:Reviews?|Tickets?|Feedback|Support)",
                ]
                head = request.feedback[:600]
                for pat in patterns:
                    m = re.search(pat, head, re.MULTILINE | re.IGNORECASE)
                    if m and m.group(1):
                        inferred = m.group(1).strip()
                        break
            result["product_name"] = inferred
        else:
            result["product_name"] = request.product_name
        return result

    except HTTPException:
        raise
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="LLM returned invalid JSON")
    except Exception as e:
        _parse_rate_limit_error(str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat")
async def chat(request: ChatRequest):
    system_prompt = build_chat_system_prompt(
        product_name=request.product_name,
        feedback=request.feedback,
        analysis=request.analysis,
    )
    messages = [{"role": "system", "content": system_prompt}]
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        if response.usage:
            _add_tokens(response.usage.total_tokens)
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        _parse_rate_limit_error(str(e))
        raise HTTPException(status_code=500, detail=str(e))


class CompanyRequest(BaseModel):
    company_name: str
    url: Optional[str] = None
    raw_data: Optional[str] = None


class CompanyChatRequest(BaseModel):
    company_name: str
    analysis: dict
    message: str
    history: List[ChatMessage] = []


_executor = ThreadPoolExecutor(max_workers=5)

_token_cache: dict = {"limit": 500000, "used": 0, "remaining": 500000, "pct_used": 0.0, "reset": "", "rate_limited": False}

def _add_tokens(n: int):
    _token_cache["used"] = min(_token_cache["used"] + n, _token_cache["limit"])
    _token_cache["remaining"] = max(0, _token_cache["limit"] - _token_cache["used"])
    _token_cache["pct_used"] = round((_token_cache["used"] / _token_cache["limit"]) * 100, 1)
    _token_cache["rate_limited"] = False

def _parse_rate_limit_error(error_msg: str):
    m = re.search(r"Used (\d+).*?Limit (\d+).*?Please try again in (.+?)\.", str(error_msg))
    if m:
        used, limit, reset = int(m.group(1)), int(m.group(2)), m.group(3).strip()
        _token_cache.update({"limit": limit, "used": used, "remaining": limit - used,
                             "pct_used": round((used / limit) * 100, 1), "reset": reset, "rate_limited": True})

def _split_companies(name: str) -> list:
    parts = re.split(r",|\s+and\s+", name, flags=re.IGNORECASE)
    return [p.strip() for p in parts if p.strip()]


@app.post("/analyse-company")
async def analyse_company_endpoint(request: CompanyRequest):
    if not request.company_name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")
    try:
        companies = _split_companies(request.company_name)
        loop = asyncio.get_event_loop()

        if len(companies) > 1:
            tasks = [
                loop.run_in_executor(_executor, analyse_company, name, request.raw_data)
                for name in companies[:5]
            ]
            raw_results = list(await asyncio.gather(*tasks))
            results = [r[0] for r in raw_results]
            _add_tokens(sum(r[1] for r in raw_results))
            return {"mode": "compare", "companies": results}
        else:
            result, tokens = await loop.run_in_executor(
                _executor, analyse_company, request.company_name, request.raw_data
            )
            _add_tokens(tokens)
            return {"mode": "single", **result}
    except Exception as e:
        _parse_rate_limit_error(str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/company-chat")
async def company_chat(request: CompanyChatRequest):
    a = request.analysis
    system = f"""You are a senior investment analyst who just completed a full research brief on {request.company_name}.

Your analysis:
- Verdict: {a.get('verdict')} | Investment Score: {a.get('investment_score')}/10 | Confidence: {a.get('confidence')}
- Moat Score: {a.get('moat_score')}/10 | Market Timing: {a.get('market_timing_score')}/10
- Company: {a.get('company_summary', '')}
- Bull Case: {a.get('bull_case', '')}
- Bear Case: {a.get('bear_case', '')}
- Key Risks: {', '.join(a.get('key_risks', []))}
- Funding Stage: {a.get('funding_stage')} | Exit Potential: {a.get('exit_potential')}

Answer questions about this company as a VC analyst. Be concise and direct — 2-3 sentences max."""

    messages = [{"role": "system", "content": system}]
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        if response.usage:
            _add_tokens(response.usage.total_tokens)
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        _parse_rate_limit_error(str(e))
        raise HTTPException(status_code=500, detail=str(e))


class CompareChatRequest(BaseModel):
    companies: list
    message: str
    history: List[ChatMessage] = []


@app.post("/compare-chat")
async def compare_chat(request: CompareChatRequest):
    cs = request.companies
    scores = "\n".join([
        f"- {c.get('company_name')}: Verdict={c.get('verdict')} | Investment={c.get('investment_score')}/10 | Moat={c.get('moat_score')}/10 | Timing={c.get('market_timing_score')}/10 | Growth={c.get('growth_signal')} | Churn={c.get('churn_risk')}"
        for c in cs
    ])
    summaries = "\n".join([
        f"{c.get('company_name')}: {c.get('company_summary', '')} Bull: {c.get('bull_case', '')} Bear: {c.get('bear_case', '')}"
        for c in cs
    ])
    system = f"""You are a senior VC investment analyst who has just completed a comparative investment analysis of {len(cs)} companies.

SCORES:
{scores}

SUMMARIES:
{summaries}

Answer comparative questions with conviction. Be direct and concise — 2-3 sentences max. Cite specific scores or signals when comparing."""

    messages = [{"role": "system", "content": system}]
    for msg in request.history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": request.message})

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        if response.usage:
            _add_tokens(response.usage.total_tokens)
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        _parse_rate_limit_error(str(e))
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/token-usage")
async def token_usage():
    # Returns cached data from real API calls — does NOT make a Groq request
    return _token_cache


@app.post("/extract-text")
async def extract_text(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    content = await file.read()
    try:
        if filename.endswith(".txt"):
            text = content.decode("utf-8", errors="ignore")
        elif filename.endswith(".pdf"):
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        elif filename.endswith(".docx"):
            from docx import Document
            doc = Document(io.BytesIO(content))
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Use .txt, .pdf, or .docx")
        text = text.strip()
        if not text:
            raise HTTPException(status_code=422, detail="No readable text found in the file.")
        return {"text": text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract text: {str(e)}")


@app.get("/health")
def health():
    return {"status": "ok"}