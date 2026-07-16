def build_prompt(feedback: str, product_name: str = "", vc_context: str = "") -> str:
    product_line = f"Product Name: {product_name}\n" if product_name else "Product Name: (not provided — infer it from the feedback and include it as the \"product_name\" field in your JSON)\n"
    context_block = (
        f"RELEVANT VC INVESTMENT FRAMEWORKS (use these to ground your analysis):\n{vc_context}\n\n"
        if vc_context
        else ""
    )

    return f"""You are a senior venture capital analyst at a top-tier firm (Sequoia, a16z, Benchmark). \
Write a rigorous investment memo. Cite specific evidence from the feedback. Be opinionated and direct.

{context_block}{product_line}USER FEEDBACK:
\"\"\"
{feedback}
\"\"\"

Return ONLY valid JSON — no markdown, no code fences, no extra text.

{{
  "verdict": "INVEST" or "PASS",
  "investment_score": <integer 1-10>,
  "sentiment_score": <integer 1-10>,
  "pmf_score": <integer 1-10>,
  "confidence": "Low" or "Medium" or "High",
  "score_reasoning": {{
    "investment": "<X/10: one sentence citing specific evidence from the feedback that justifies this exact score>",
    "pmf": "<X/10: one sentence citing specific evidence>",
    "sentiment": "<X/10: one sentence citing specific evidence>"
  }},
  "market_signal": "<one sentence on market opportunity and pull>",
  "revenue_signal": "Strong" or "Moderate" or "Weak",
  "churn_risk": "Low" or "Medium" or "High",
  "growth_signal": "Accelerating" or "Steady" or "Declining",
  "moat_signal": "<one sentence on defensibility and switching costs>",
  "tam_signal": "<one sentence on total addressable market>",
  "exit_potential": "IPO Candidate" or "Acquisition Target" or "PE Buyout" or "Early Stage",
  "moat_score": <integer 1-10, how defensible is this product — switching costs, network effects, data moat>,
  "retention_score": <integer 1-10, how likely are existing users to stay long-term based on feedback>,
  "investment_thesis": "<2-3 sentences: specific bull case grounded in the feedback evidence>",
  "bear_case": "<2-3 sentences: specific realistic downside scenario grounded in the feedback>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "risk_flags": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "key_metrics": ["<specific quantified or qualified observation from feedback>", "<observation 2>", "<observation 3>", "<observation 4>"],
  "comparable": "<comparable funded or failed company and the specific reason why>",
  "investor_summary": "<3 sentences: direct investment recommendation with specific reasoning>",
  "follow_up_questions": ["<question 1 a VC partner would demand answered before term sheet>", "<question 2>", "<question 3>"]
}}"""


def build_chat_system_prompt(product_name: str, feedback: str, analysis: dict) -> str:
    return f"""You are a senior VC analyst. You already completed an investment analysis on a product \
and are now in a follow-up Q&A with a junior analyst or founder. Answer concisely and with conviction — 2-3 sentences max per answer.

Product: {product_name or "Unknown"}

Original feedback (excerpt): {feedback[:800]}

Your prior analysis:
- Verdict: {analysis.get("verdict")}
- Investment Score: {analysis.get("investment_score")}/10
- PMF Score: {analysis.get("pmf_score")}/10
- Churn Risk: {analysis.get("churn_risk")}
- Revenue Signal: {analysis.get("revenue_signal")}
- Growth Signal: {analysis.get("growth_signal")}
- Exit Potential: {analysis.get("exit_potential")}
- Investor Summary: {analysis.get("investor_summary")}

Stay in the VC analyst persona. Be direct, opinionated, and grounded in the feedback evidence."""