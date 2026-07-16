# Product Analyser — Investment-Grade AI Analysis Platform

Two tools, one repo. Paste user feedback or upload a document, **or** type a company name — get a full investment-grade brief in seconds, powered by autonomous AI research.

**Live:** [product-fb-analyser.vercel.app](https://product-fb-analyser.vercel.app)

---

## What Is This?

A landing page at `/` lets users choose between two tools:

**Tool 1 — Feedback Analyser** (`/feedback`)
Paste raw user feedback (reviews, NPS comments, support tickets) or upload a `.txt`, `.pdf`, or `.docx` file. The AI scores the product across 5 investment dimensions, generates a bull & bear case, flags risks, draws a radar chart, and lets you chat with an AI analyst about the results. Product name is auto-inferred from the uploaded filename or from the feedback content if left blank.

**Tool 2 — Company Analyser** (`/company`)
Type any company name. The AI autonomously searches the live web — funding history, customer reviews, competitors, market signals — and generates a full investment brief without you pasting a single thing. Supports multi-company comparison (comma-separated names) with a side-by-side dashboard. Live Groq token bar in the header.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Next.js)                        │
│                                                                 │
│  /  (landing — tool picker)                                     │
│  ├─ /feedback   → /result          Feedback Analyser            │
│  └─ /company    → /company/result  Company Analyser             │
│                   /company/compare (multi-company)              │
│                                                                 │
│  SplashScreen ("Product Analyser", ~4 sec, once per session)    │
│  TokenBar (polls /token-usage every 60s, pre-warms /health)     │
└─────────────────────────────────────────────────────────────────┘
              │ HTTP POST (axios, 90s timeout)
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FastAPI Backend (Python)                       │
│                                                                 │
│  POST /analyse          → score feedback via Groq + RAG         │
│  POST /chat             → AI analyst chat for feedback results  │
│  POST /analyse-company  → research + score a company via Groq   │
│  POST /company-chat     → AI analyst chat for single company    │
│  POST /compare-chat     → AI analyst chat across N companies    │
│  POST /extract-text     → extract text from .pdf/.docx uploads  │
│  GET  /token-usage      → cached token quota (no Groq call)     │
│  GET  /health           → health check (used for pre-warming)   │
│                                                                 │
│  ┌──────────────────┐   ┌────────────────────────────────────┐  │
│  │     rag.py       │   │        company_analyser.py         │  │
│  │  BM25 keyword    │   │  _research()  → 5 Tavily searches  │  │
│  │  retrieval over  │   │  analyse_company() → Groq LLM      │  │
│  │  VC frameworks   │   │  response_format: json_object      │  │
│  └──────────────────┘   └────────────────────────────────────┘  │
└──────────────┬───────────────────────────────┬──────────────────┘
               │                               │
               ▼                               ▼
        ┌─────────────┐               ┌──────────────────┐
        │  Groq API   │               │   Tavily API     │
        │ llama-3.1   │               │  Web Search +    │
        │ -8b-instant │               │  Summarisation   │
        └─────────────┘               └──────────────────┘
```

---

## AI Tools Used

### Groq — LLM Inference
**What it does:** Runs the `llama-3.1-8b-instant` language model to generate all scored analysis, SWOT, bull/bear cases, verdicts, and chat responses.

**Why Groq over OpenAI/Anthropic?** Groq runs on custom LPU (Language Processing Unit) hardware, making it 10–20× faster than GPU-based inference. For a tool where users are waiting for analysis, speed is critical.

**Model choice — why `llama-3.1-8b-instant`?** The 8b-instant model gives **500,000 tokens/day** on Groq's free tier vs 100,000 for the 70b model. For structured JSON output (which this app uses), the 8b model performs nearly identically to the 70b at a fraction of the quota cost.

**JSON mode:** All Groq calls use `response_format={"type": "json_object"}`, which forces the model to output valid JSON at the API level — no markdown fences, no prose, no parsing failures.

**Token tracking:** Every successful Groq response reads `response.usage.total_tokens` and updates a shared `_token_cache` in memory. The `/token-usage` endpoint returns this cache — it never makes a Groq call just to check quota. The TokenBar in the header shows live usage and polls every 60 seconds.

**TPM limit:** Groq's free tier allows 6,000 tokens per minute (input + output). Feedback is trimmed to 3,000 characters and RAG context is capped at 2 results before sending to the LLM, keeping total prompt + output well under the limit.

---

### Tavily — Autonomous Web Research
**What it does:** When you type a company name without pasting data, Tavily searches the live web — Google, news sites, review platforms, Crunchbase — and returns clean, summarised results. We run 5 targeted searches per company:
1. Company overview & product
2. Funding raised & growth stage
3. Customer reviews (G2, Capterra, Trustpilot)
4. Competitors & alternatives
5. Recent news & announcements

**Why Tavily over regular Google search?** Tavily is purpose-built for AI agents. Regular search APIs return raw HTML and URLs — you'd have to scrape and parse each page yourself. Tavily returns clean, ready-to-use text summaries that go straight into the LLM prompt. It also has an `include_answer` field that gives a short direct answer — perfect for dense prompts.

---

## Tech Stack

### Frontend — Next.js 14
| Technology | Role |
|---|---|
| **Next.js 14** (App Router) | Page routing, server/client component split |
| **TypeScript** | Type safety across all components |
| **Tailwind CSS v3** | Utility-first styling with custom animations in `globals.css` |
| **axios** | HTTP calls to FastAPI backend (90s timeout, auto-retry on network failure) |
| **Custom SVG components** | Radar chart, grouped bar chart, investment gauge — no charting library |
| **sessionStorage** | Pass analysis results between pages without a database |
| **localStorage** | Persist analysis history per tool (up to 20 entries each) |
| **CSS keyframe animations** | `fade-up`, `ticker`, `scan`, `pulse-red` — defined in `globals.css` |

### Backend — FastAPI
| Technology | Role |
|---|---|
| **FastAPI** | HTTP API framework, async request handling |
| **Pydantic** | Request/response validation and schema enforcement |
| **Groq Python SDK** | LLM completions (`llama-3.1-8b-instant`) with JSON mode |
| **tavily-python** | Autonomous web research for company analysis |
| **pypdf** | Extract text from uploaded PDF files |
| **python-docx** | Extract text from uploaded Word (.docx) files |
| **python-multipart** | Handle `multipart/form-data` file uploads in FastAPI |
| **python-dotenv** | Load API keys from `.env` without exposing them in code |
| **asyncio + ThreadPoolExecutor** | Run multiple company analyses in parallel |

---

## File-by-File Explanation

### Backend (`/backend`)

| File | What it does |
|---|---|
| `main.py` | The entire API. All routes, CORS config, token cache, file extraction endpoint. Feedback is trimmed to 3,000 chars before LLM call. JSON mode enforced on all Groq calls. Token cache updated from `response.usage.total_tokens` after every successful call. |
| `company_analyser.py` | Brain of the Company Analyser. `_research()` fires 5 Tavily searches. `analyse_company()` calls Groq with JSON mode. Returns `(result, tokens)` tuple so `main.py` can accumulate token counts from parallel analyses. |
| `prompt.py` | Builds the structured prompt for the Feedback Analyser. When no product name is provided, instructs the LLM to infer it from the feedback and return it as `product_name` in the JSON. Also builds the chat system prompt. |
| `rag.py` | BM25 keyword retrieval over VC framework documents. Returns top 2 most relevant chunks for a given query. |
| `knowledge_base.py` | VC knowledge library — PMF theory, moat models, retention analysis, churn frameworks, investor scoring rubrics. |
| `requirements.txt` | `fastapi`, `uvicorn`, `groq`, `python-dotenv`, `pydantic`, `tavily-python`, `pypdf`, `python-docx`, `python-multipart` |

---

### Frontend (`/frontend`)

#### Pages (`/app`)

| File | What it does |
|---|---|
| `app/layout.tsx` | Root layout. Dark mode script, `SplashWrapper`. |
| `app/globals.css` | Global styles, keyframes, light-mode overrides (`html:not(.dark)` selectors for pages that use hardcoded dark Tailwind classes). |
| `app/page.tsx` | **Landing page.** Two centered tool cards (red = Feedback Analyser → `/feedback`, blue = Company Analyser → `/company`). Live scrolling ticker pulls from both tools' `localStorage` history. Fires a `/health` ping on load to pre-warm the Render backend. |
| `app/feedback/page.tsx` | Feedback Analyser. Tab toggle between paste and file upload. `.txt` files read in-browser; `.pdf`/`.docx` sent to `/extract-text`. Product name auto-inferred from filename. Auto-retry with 55s countdown on network failure (Render cold start). Calls `/analyse`, stores result in `sessionStorage`, routes to `/result`. |
| `app/result/page.tsx` | Feedback results. Radar chart, 5 score bars, bull/bear cases, risk flags, investment memo, AI analyst chat. **Verdict legend** (INVEST / WATCH / PASS with definitions) shown below the verdict banner, with the current result highlighted. |
| `app/company/page.tsx` | Company Analyser input. Same cold-start auto-retry as feedback page. Multi-company compare mode via comma-separated names. |
| `app/company/result/page.tsx` | Single-company result. INVEST/WATCH/PASS verdict, 3 scores, SWOT 2×2, competitive threat map, bull/bear, chat. |
| `app/company/compare/page.tsx` | Multi-company comparison. Grouped bar chart, per-company score cards, SWOT sub-tabs, ranked verdict cards, shared AI analyst. |

#### Components (`/components`)

| File | What it does |
|---|---|
| `SplashScreen.tsx` | Intro animation. "Product Analyser" title, ~4 second duration, red/black theme, progress bar. |
| `SplashWrapper.tsx` | Shows `SplashScreen` once per tab session (checks `sessionStorage`). |
| `RadarChart.tsx` | Pure SVG pentagon radar chart. 5 colour-coded dimensions, score labels inside dots. |
| `ScoreBar.tsx` | Animated score bar. Label, score, definition text, accent colour, reasoning text. |
| `ChatBox.tsx` | Reusable chat UI. `apiEndpoint` + `buildPayload` props — works for feedback and company chat. |
| `InvestmentGauge.tsx` | SVG semicircle gauge. Animated needle. |
| `TokenBar.tsx` | Groq token quota bar in the header. Polls `/token-usage` every 60s. Colour-coded green → amber → red. Tooltip shows used / remaining / limit / reset time. Visible in both light and dark modes. |
| `ThemeToggle.tsx` | Dark/light toggle. Persists to `localStorage`. |
| `VerdictBadge.tsx` | Hero verdict banner (INVEST / WATCH / PASS) with score and confidence. |

---

## What Is RAG? (Plain English)

**RAG = Retrieval-Augmented Generation.**

Without RAG, the LLM scores based on whatever investment knowledge leaked into its training — unpredictable and hard to audit.

**RAG works in 3 steps:**

1. **Store** — `knowledge_base.py` contains text documents: PMF theory, moat models, retention analysis, churn frameworks, VC scoring rubrics.

2. **Retrieve** — When a user submits feedback, `rag.py` uses BM25 (keyword overlap) to find the top 2 most relevant framework documents for that specific product.

3. **Augment** — Those documents are injected at the top of the LLM prompt: *"Here are the relevant VC frameworks. Now score this feedback."*

Every score is explicitly grounded in the same frameworks a real VC analyst would use — not just vibes.

---

## Verdict Guide

| Verdict | Score | Meaning |
|---|---|---|
| **INVEST** | 7–10 | Strong conviction — compelling investment opportunity with clear PMF and growth signals |
| **WATCH** | 4–6 | Promising but not proven — monitor the space and wait for stronger signals |
| **PASS** | 1–3 | Weak fundamentals or poor PMF — not a compelling opportunity at this stage |

---

## Live Deployment

| Service | URL |
|---|---|
| **Frontend** (Vercel) | https://product-fb-analyser.vercel.app |
| **Backend** (Render) | https://product-fb-analyser.onrender.com |

The frontend auto-deploys from `main` via Vercel. The backend auto-deploys from `main` via Render.

> **Render free tier note:** The backend sleeps after 15 minutes of inactivity. The app mitigates this by firing a silent `/health` ping on every page load to pre-warm the backend. If a request still fails (cold start takes up to 60s), both tools automatically retry after a 55-second countdown — no user action needed.

---

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with your keys
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
- Groq: https://console.groq.com (free tier: 500K tokens/day)
- Tavily: https://app.tavily.com (free tier: 1,000 searches/month)

### `.gitignore`
```
node_modules/
.venv/
frontend/.next/
frontend/node_modules/
__pycache__/
*.pyc
.env
```
