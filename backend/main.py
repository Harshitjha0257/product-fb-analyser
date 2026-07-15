from fastapi import FastAPI, HTTPException
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
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, List

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
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
        query = f"{request.product_name} {request.feedback[:600]}"
        vc_context = retrieve_context(query, n_results=3)

        prompt = build_prompt(
            feedback=request.feedback,
            product_name=request.product_name or "",
            vc_context=vc_context,
        )

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=1500,
        )

        raw = response.choices[0].message.content.strip()
        # Strip markdown code fences if the model wraps output
        if raw.startswith("```"):
            parts = raw.split("```")
            raw = parts[1].lstrip("json").strip() if len(parts) > 1 else raw
        result = json.loads(raw)
        result["product_name"] = request.product_name or ""
        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON")
    except Exception as e:
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
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
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
                loop.run_in_executor(_executor, analyse_company, name, None, request.raw_data)
                for name in companies[:5]
            ]
            results = list(await asyncio.gather(*tasks))
            return {"mode": "compare", "companies": results}
        else:
            result = await loop.run_in_executor(
                _executor, analyse_company, request.company_name, request.url, request.raw_data
            )
            return {"mode": "single", **result}
    except Exception as e:
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
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
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
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,
            max_tokens=400,
        )
        return {"reply": response.choices[0].message.content.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/token-usage")
async def token_usage():
    try:
        raw = client.chat.completions.with_raw_response.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=1,
        )
        h = dict(raw.headers)
        limit = int(h.get("x-ratelimit-limit-tokens-day", 100000))
        remaining = int(h.get("x-ratelimit-remaining-tokens-day", 0))
        used = limit - remaining
        reset = h.get("x-ratelimit-reset-tokens-day", "")
        return {
            "limit": limit,
            "used": used,
            "remaining": remaining,
            "pct_used": round((used / limit) * 100, 1),
            "reset": reset,
        }
    except Exception as e:
        msg = str(e)
        import re as _re
        m = _re.search(r"Used (\d+).*Limit (\d+)", msg)
        if m:
            used, limit = int(m.group(1)), int(m.group(2))
            return {"limit": limit, "used": used, "remaining": limit - used,
                    "pct_used": round((used / limit) * 100, 1), "reset": "~1h", "rate_limited": True}
        return {"limit": 100000, "used": 100000, "remaining": 0, "pct_used": 100, "reset": "unknown", "rate_limited": True}


@app.get("/health")
def health():
    return {"status": "ok"}