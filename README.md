# FB Analyser — Investment-Grade AI Analysis Platform

Two tools, one repo. Paste user feedback **or** type a company name — get a full investment-grade brief in seconds, powered by autonomous AI research.

---

## What Is This?

**Tool 1 — Feedback Analyser**
Paste raw user feedback (reviews, NPS comments, support tickets). The AI scores the product across 5 investment dimensions, generates a bull & bear case, flags risks, and lets you chat with an AI analyst about the results.

**Tool 2 — Company Analyser**
Type any company name. The AI autonomously searches the web — funding history, customer reviews, competitors, market signals — and generates a full investment brief without you pasting a single thing. Compare multiple companies side by side with a statistical breakdown.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                        │
│                                                                 │
│  ┌─────────────────────┐     ┌─────────────────────────────┐   │
│  │  Feedback Analyser  │     │     Company Analyser         │   │
│  │  /  →  /result      │     │  /company  →  /company/result│   │
│  │                     │     │  /company/compare            │   │
│  └──────────┬──────────┘     └──────────────┬──────────────┘   │
└─────────────┼────────────────────────────────┼─────────────────┘
              │ HTTP POST (axios)              │ HTTP POST (axios)
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Python)                       │
│                                                                 │
│  POST /analyse          → score feedback via Groq + RAG         │
│  POST /chat             → AI analyst chat for feedback results  │
│  POST /analyse-company  → research + score a company via Groq   │
│  POST /company-chat     → AI analyst chat for single company    │
│  POST /compare-chat     → AI analyst chat across N companies    │
│  GET  /token-usage      → live Groq daily token quota status    │
│                                                                 │
│  ┌──────────────────┐   ┌────────────────────────────────────┐  │
│  │     rag.py       │   │        company_analyser.py         │  │
│  │  BM25 keyword    │   │  _research()  → 5 Tavily searches  │  │
│  │  retrieval over  │   │  analyse_company() → Groq LLM      │  │
│  │  VC frameworks   │   │  _parse()     → JSON extraction    │  │
│  └──────────────────┘   └────────────────────────────────────┘  │
└──────────────┬───────────────────────────────┬──────────────────┘
               │                               │
               ▼                               ▼
        ┌─────────────┐               ┌──────────────────┐
        │  Groq API   │               │   Tavily API     │
        │ llama-3.3   │               │  Web Search +    │
        │ -70b-versatile              │  Summarisation   │
        └─────────────┘               └──────────────────┘
```

---

## AI Tools Used

### Groq — LLM Inference
**What it does:** Runs the `llama-3.3-70b-versatile` language model to generate all scored analysis, SWOT, bull/bear cases, verdicts, and chat responses.

**Why Groq over OpenAI/Anthropic?** Groq runs on custom LPU (Language Processing Unit) hardware, making it 10–20× faster than GPU-based inference. For a tool where users are waiting for analysis, speed is critical. Groq's free tier also provides 100,000 tokens/day — enough for prototyping without a credit card.

**Free tier limit:** 100,000 tokens/day. The token bar in the UI shows live usage so you know when you're close.

---

### Tavily — Autonomous Web Research
**What it does:** When you type a company name without pasting data, Tavily searches the live web — Google, news sites, review platforms, Crunchbase — and returns clean, summarised results. We run 5 targeted searches per company:
1. Company overview & product
2. Funding raised & growth stage
3. Customer reviews (G2, Capterra, Trustpilot)
4. Competitors & alternatives
5. Recent news & announcements

**Why Tavily over regular Google search?** Tavily is purpose-built for AI agents. Regular search APIs return raw HTML and URLs — you'd have to scrape and parse each page yourself. Tavily returns clean, ready-to-use text summaries that go straight into the LLM prompt. It also has an `include_answer` field that gives a short direct answer before the detailed results — perfect for dense prompts.

---

## Tech Stack

### Frontend — Next.js 14
| Technology | Role |
|---|---|
| **Next.js 14** (App Router) | Page routing, server/client component split |
| **TypeScript** | Type safety across all components |
| **Tailwind CSS v3** | Utility-first styling, dark mode via `class` strategy |
| **axios** | HTTP calls to FastAPI backend |
| **Custom SVG components** | Radar chart, bar chart, investment gauge — no charting library needed |
| **sessionStorage** | Pass analysis results between pages without a database |
| **localStorage** | Persist analysis history across sessions |

### Backend — FastAPI
| Technology | Role |
|---|---|
| **FastAPI** | HTTP API framework, async request handling |
| **Pydantic** | Request/response validation and schema enforcement |
| **Groq Python SDK** | LLM completions and rate-limit header access |
| **tavily-python** | Autonomous web research for company analysis |
| **python-dotenv** | Load API keys from `.env` without exposing them in code |
| **asyncio + ThreadPoolExecutor** | Run multiple company analyses in parallel (Tavily+Groq calls are synchronous, so they run in a thread pool) |

---

## File-by-File Explanation

### Backend (`/backend`)

| File | What it does |
|---|---|
| `main.py` | The entire API. Defines all routes (`/analyse`, `/chat`, `/analyse-company`, `/company-chat`, `/compare-chat`, `/token-usage`). Handles multi-company splitting (comma or "and" separated), parallel async execution, and CORS. |
| `company_analyser.py` | Brain of the Company Analyser. `_research()` fires 5 Tavily searches and compiles context. `analyse_company()` chooses between user-pasted data or autonomous research, then calls Groq with a structured JSON prompt. `_parse()` strips markdown fences and extracts valid JSON from the LLM response. |
| `prompt.py` | Builds the structured prompt for the Feedback Analyser. Contains the VC-framework scoring instructions and JSON schema the LLM must return. Also builds the chat system prompt with full analysis context. |
| `rag.py` | Retrieval-Augmented Generation engine. Given a query, scores all VC framework documents using BM25 keyword overlap and returns the top 3 most relevant chunks to inject into the LLM prompt. |
| `knowledge_base.py` | The VC knowledge library — a list of text documents covering PMF theory, moat models, retention analysis, churn frameworks, and investor scoring rubrics. These ground the LLM in real investment frameworks rather than generic advice. |
| `.env` | Stores `GROQ_API_KEY` and `TAVILY_API_KEY`. Never committed to git. |
| `requirements.txt` | `fastapi`, `uvicorn`, `groq`, `python-dotenv`, `pydantic`, `tavily-python` |

---

### Frontend (`/frontend`)

#### Pages (`/app`)

| File | What it does |
|---|---|
| `app/page.tsx` | Home page — Feedback Analyser input form. Collects product name + raw feedback, calls `/analyse`, stores result in `sessionStorage`, navigates to `/result`. |
| `app/result/page.tsx` | Feedback analysis results page. Renders radar chart, 5 score bars (each a different colour), bull/bear cases, risk flags, investment memo, and the RAG chat panel. |
| `app/company/page.tsx` | Company Analyser input form. Accepts company name(s) — comma or "and" separated triggers compare mode. Optional raw data paste switches from AI Research to Manual mode. Shows live token usage bar. |
| `app/company/result/page.tsx` | Single-company result page. Shows verdict (INVEST/WATCH/PASS), 3 scores, SWOT grid, competitive threat map, bull/bear case, and chat. |
| `app/company/compare/page.tsx` | Multi-company comparison page. 3 full-width sections: (1) grouped SVG bar chart + signal snapshot table + per-company score cards, (2) SWOT sub-tabs + competitive map side by side, (3) ranked verdict cards + AI analyst chat knowing all companies. |

#### Components (`/components`)

| File | What it does |
|---|---|
| `RadarChart.tsx` | Pure SVG radar/spider chart. Plots 5 dimensions on a pentagon. Each axis dot is coloured per metric with the score number inside. Ring scale labels at 2.5, 5, 7.5, 10. |
| `ScoreBar.tsx` | Animated horizontal progress bar for a single score. Accepts a label, score, definition text, and accent colour. Animates from 0 on mount. |
| `ChatBox.tsx` | Reusable chat UI. Accepts `apiEndpoint` and `buildPayload` props so it works for both feedback chat (`/chat`) and company chat (`/company-chat`) without duplication. |
| `InvestmentGauge.tsx` | SVG semicircle gauge showing overall investment score. Needle animates to the score position. |
| `TokenBar.tsx` | Live Groq token usage indicator. Calls `/token-usage` on mount and every 60s. Shows a colour-coded bar (green → amber → red) with a hover tooltip showing used/remaining/reset time. |
| `ThemeToggle.tsx` | Dark/light mode toggle button. Writes `dark` class to `<html>` and persists to `localStorage`. |

---

## What Is RAG? (Plain English)

**RAG stands for Retrieval-Augmented Generation.**

Think of the AI as a very smart person who can write well but doesn't have a specific textbook in front of them. Without RAG, if you ask the AI to score product-market fit, it uses general knowledge from its training — which might be vague or off.

**RAG solves this by handing the AI the right pages from the right textbook before it answers.**

Here's the analogy: imagine you ask a consultant to score a startup. Without prep, they'll give a generic answer. But if you hand them the Y Combinator PMF checklist, Andreessen Horowitz's moat framework, and a churn analysis rubric *before* they respond — their answer will be grounded, specific, and far more useful.

**That's exactly what RAG does here:**

1. **Store** — `knowledge_base.py` contains text documents covering PMF theory, moat models, retention analysis, and VC scoring frameworks. These are real investment-thinking frameworks, not fluff.

2. **Retrieve** — When a user submits feedback, `rag.py` uses BM25 scoring (keyword overlap) to find the 2–3 most relevant framework documents for that specific product/feedback.

3. **Augment** — Those documents are injected into the top of the LLM prompt: *"Here are the relevant VC frameworks. Now score this feedback."*

4. **Generate** — Groq's LLM reads the frameworks AND the feedback, then produces scores that are grounded in actual investment logic — not just vibes.

**Why use RAG in this app?** Without it, the LLM scores are based on whatever investment knowledge leaked into its training. With it, every score is explicitly grounded in the same frameworks a real VC analyst would use — making the output trustworthy and consistent.

---

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
# Add your keys to .env
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`

### Environment Variables (`.env` in `/backend`)
```
GROQ_API_KEY=your_groq_key_here
TAVILY_API_KEY=your_tavily_key_here
```

Get keys at:
- Groq: https://console.groq.com
- Tavily: https://app.tavily.com
