import os
import json
import re
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

_PROMPT = """\
You are a senior investment analyst at a top-tier VC firm. Analyse "{name}" using the research data below.

RESEARCH DATA:
{context}

Return ONLY valid JSON — no markdown fences, no extra text. Use this exact schema (replace every example value with real analysis of {name}):

{{
  "verdict": "INVEST",
  "confidence": "High",
  "investment_score": 7,
  "moat_score": 6,
  "market_timing_score": 8,
  "growth_signal": "Accelerating",
  "revenue_signal": "Strong",
  "churn_risk": "Low",
  "exit_potential": "Acquisition Target",
  "funding_stage": "Series B",
  "company_summary": "Two to three sentence plain-English overview of what this company does and their market position.",
  "swot": {{
    "strengths": ["Specific strength one.", "Specific strength two.", "Specific strength three."],
    "weaknesses": ["Specific weakness one.", "Specific weakness two."],
    "opportunities": ["Market opportunity one.", "Growth opportunity two."],
    "threats": ["Competitive threat one.", "Market risk two."]
  }},
  "competitive_map": [
    {{"name": "Competitor A", "positioning": "One sentence on how Competitor A competes differently.", "threat_level": "High"}},
    {{"name": "Competitor B", "positioning": "One sentence on how Competitor B competes differently.", "threat_level": "Medium"}},
    {{"name": "Competitor C", "positioning": "One sentence on how Competitor C competes differently.", "threat_level": "Low"}}
  ],
  "bull_case": "Two to three sentence optimistic scenario grounded in research.",
  "bear_case": "Two to three sentence realistic downside risk scenario.",
  "moat_reasoning": "Two sentences explaining the moat score and what makes or breaks defensibility.",
  "market_timing_reasoning": "Two sentences on whether market timing is too early, right, or late.",
  "investment_reasoning": "Two to three sentence bottom-line investment thesis.",
  "tam_signal": "One to two sentences on total addressable market size and ceiling.",
  "key_risks": ["Primary risk.", "Secondary risk.", "Third risk."],
  "follow_up_questions": ["Due diligence question one?", "Due diligence question two?", "Due diligence question three?"]
}}

verdict must be exactly one of: INVEST, WATCH, PASS.
verdict=INVEST for strong opportunity (score 7-10), WATCH for promising but uncertain (4-6), PASS for weak (1-3).\
"""


def _research(company_name: str) -> str:
    sections = []
    for tmpl in _QUERIES:
        query = tmpl.format(name=company_name)
        try:
            r = tavily_client.search(
                query=query,
                max_results=3,
                search_depth="basic",
                include_answer=True,
            )
            lines = [f"Topic: {query}"]
            if r.get("answer"):
                lines.append(f"Summary: {r['answer']}")
            for item in r.get("results", []):
                lines.append(f"- {item.get('title', '')}: {item.get('content', '')[:400]}")
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


def analyse_company(company_name: str, url: str = None, raw_data: str = None) -> dict:
    if raw_data and raw_data.strip():
        context = f"User-provided data about {company_name}:\n\n{raw_data}"
        data_source = "user_provided"
    else:
        context = _research(company_name)
        data_source = "autonomous_research"

    prompt = _PROMPT.format(name=company_name, context=context)
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=1500,
    )
    result = _parse(response.choices[0].message.content)
    result["company_name"] = company_name
    result["data_source"] = data_source
    return result
