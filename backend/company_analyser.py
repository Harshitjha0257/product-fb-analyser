import os
import json
import re
import time
from groq import Groq
from tavily import TavilyClient
from dotenv import load_dotenv

load_dotenv()

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY", ""))
tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY", ""))

_QUERIES = [
    "{name} company product overview what they do",
    "{name} funding raised investors growth stage 2024 2025",
    "{name} customer reviews ratings G2 Capterra Trustpilot",
    "{name} competitors alternatives comparison market",
    "{name} news expansion announcement 2024 2025",
]

# Compact schema — produces ~400-500 token responses, safe for parallel calls
_PROMPT = """\
You are a VC analyst. Analyse "{name}" using the data below. Return ONLY valid compact JSON, no markdown.

DATA:
{context}

JSON schema (fill real values for {name}):
{{"verdict":"INVEST","confidence":"High","investment_score":7,"moat_score":6,"market_timing_score":8,"growth_signal":"Accelerating","revenue_signal":"Strong","churn_risk":"Low","exit_potential":"Acquisition Target","funding_stage":"Series B","company_summary":"2 sentence overview.","swot":{{"strengths":["S1","S2"],"weaknesses":["W1"],"opportunities":["O1"],"threats":["T1"]}},"competitive_map":[{{"name":"CompA","positioning":"1 sentence.","threat_level":"High"}},{{"name":"CompB","positioning":"1 sentence.","threat_level":"Medium"}}],"bull_case":"1-2 sentence upside.","bear_case":"1-2 sentence downside.","investment_reasoning":"2 sentence thesis.","key_risks":["R1","R2"],"follow_up_questions":["Q1?","Q2?"]}}

Rules: verdict must be INVEST(7-10), WATCH(4-6), or PASS(1-3). Be concise — short strings only.\
"""


def _research(company_name: str) -> str:
    sections = []
    for tmpl in _QUERIES:
        query = tmpl.format(name=company_name)
        try:
            r = tavily_client.search(
                query=query,
                max_results=2,
                search_depth="basic",
                include_answer=True,
            )
            lines = []
            if r.get("answer"):
                lines.append(f"{r['answer'][:150]}")
            for item in r.get("results", []):
                lines.append(f"- {item.get('content', '')[:120]}")
            if lines:
                sections.append("\n".join(lines))
        except Exception:
            continue
    return "\n\n".join(sections) or f"Limited public data found for {company_name}."


def _parse(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"^```\s*", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"```\s*$", "", raw, flags=re.MULTILINE)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group())
            except Exception:
                pass
    return {}


def analyse_company(company_name: str, raw_data: str = None) -> tuple:
    if raw_data and raw_data.strip():
        context = f"Data about {company_name}:\n{raw_data[:800]}"
        data_source = "user_provided"
    else:
        context = _research(company_name)
        data_source = "autonomous_research"

    prompt = _PROMPT.format(name=company_name, context=context)

    for attempt in range(3):
        try:
            response = groq_client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=600,
                response_format={"type": "json_object"},
            )
            tokens = response.usage.total_tokens if response.usage else 0
            result = _parse(response.choices[0].message.content)
            result["company_name"] = company_name
            result["data_source"] = data_source
            return result, tokens
        except Exception as e:
            if "429" in str(e) and attempt < 2:
                time.sleep(40)
                continue
            result = {"company_name": company_name, "data_source": data_source,
                      "verdict": "WATCH", "investment_score": 0, "moat_score": 0,
                      "market_timing_score": 0, "company_summary": f"Analysis failed: {str(e)[:100]}",
                      "error": str(e)[:200]}
            return result, 0
