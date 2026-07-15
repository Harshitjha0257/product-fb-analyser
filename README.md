# FB Analyser — Investment-Grade AI Analysis Platform

Two tools, one repo. Paste user feedback **or** type a company name — get a full investment-grade brief in seconds, powered by autonomous AI research.

---

## What Is This?

**Tool 1 — Feedback Analyser**
Paste raw user feedback (reviews, NPS comments, support tickets). The AI scores the product across 5 investment dimensions, generates a bull & bear case, flags risks, and lets you chat with an AI analyst about the results. Uses a red/black dashboard UI with a live preview panel showing a sample analysis.

**Tool 2 — Company Analyser**
Type any company name. The AI autonomously searches the web — funding history, customer reviews, competitors, market signals — and generates a full investment brief without you pasting a single thing. Supports multi-company comparison (comma-separated names) with a side-by-side 3-tile dashboard. Includes a live Groq token usage bar in the header.

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
│                                                                 │
│  SplashScreen (3D intro animation, once per session)            │
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
│  GET  /token-usage      → cached token quota (no Groq call)     │
│  GET  /health           → health check                          │
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
        │ llama-3.1   │               │  Web Search +    │
        │ -8b-instant │               │  Summarisation   │
        └─────────────┘               └──────────────────┘
```

---

## AI Tools Used

### Groq — LLM Inference
**What it does:** Runs the `llama-3.1-8b-instant` language model to generate all scored analysis, SWOT, bull/bear cases, verdicts, and chat responses.

**Why Groq over OpenAI/Anthropic?** Groq runs on custom LPU (Language Processing Unit) hardware, making it 10–20× faster than GPU-based inference. For a tool where users are waiting for analysis, speed is critical.

**Model choice — why `llama-3.1-8b-instant`?** The 8b-instant model gives **500,000 tokens/day** on Groq's free tier vs 100,000 for the 70b model. For structured JSON output (which this app uses), the 8b model performs nearly identically to the 70b at a fraction of the quota cost. The token bar in the UI shows live usage.

**Token usage design:** The `/token-usage` endpoint returns a cached dict — it does **not** make a Groq API call on every request. The cache is updated automatically whenever a real 429 rate-limit error occurs, so checking quota never burns your daily quota.

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
| **axios** | HTTP calls to FastAPI backend |
| **Custom SVG components** | Radar chart, grouped bar chart, investment gauge — no charting library |
| **sessionStorage** | Pass analysis results between pages without a database |
| **CSS keyframe animations** | `fade-up`, `ticker`, `scan`, `pulse-red` — defined in `globals.css` |

### Backend — FastAPI
| Technology | Role |
|---|---|
| **FastAPI** | HTTP API framework, async request handling |
| **Pydantic** | Request/response validation and schema enforcement |
| **Groq Python SDK** | LLM completions (`llama-3.1-8b-instant`) |
| **tavily-python** | Autonomous web research for company analysis |
| **python-dotenv** | Load API keys from `.env` without exposing them in code |
| **asyncio + ThreadPoolExecutor** | Run multiple company analyses in parallel (Tavily+Groq calls are synchronous, so they run in a thread pool) |

---

## File-by-File Explanation

### Backend (`/backend`)

| File | What it does |
|---|---|
| `main.py` | The entire API. Defines all routes. Holds `_token_cache` (updated on 429 errors — never makes a Groq call just to check quota). Handles multi-company splitting (comma or "and" separated names), parallel async execution via `ThreadPoolExecutor`, and CORS for `localhost:3000/3001`. |
| `company_analyser.py` | Brain of the Company Analyser. `_research()` fires 5 Tavily searches and compiles context. `analyse_company()` chooses between user-pasted data or autonomous research, then calls Groq with a structured JSON prompt. `_parse()` strips markdown fences and extracts valid JSON. Uses `llama-3.1-8b-instant` with `max_tokens=1500` to preserve quota. |
| `prompt.py` | Builds the structured prompt for the Feedback Analyser. Contains VC-framework scoring instructions and the JSON schema the LLM must return. Also builds the chat system prompt with full analysis context injected. |
| `rag.py` | Retrieval-Augmented Generation engine. Given a query, scores all VC framework documents using BM25 keyword overlap and returns the top 3 most relevant chunks to inject into the LLM prompt. Pure Python — no vector DB needed. |
| `knowledge_base.py` | The VC knowledge library — text documents covering PMF theory, moat models, retention analysis, churn frameworks, and investor scoring rubrics. These ground the LLM in real investment frameworks rather than generic knowledge. |
| `.env` | Stores `GROQ_API_KEY` and `TAVILY_API_KEY`. Excluded from git via `.gitignore`. |
| `requirements.txt` | `fastapi`, `uvicorn`, `groq`, `python-dotenv`, `pydantic`, `tavily-python` |

---

### Frontend (`/frontend`)

#### Pages (`/app`)

| File | What it does |
|---|---|
| `app/layout.tsx` | Root layout. Injects dark mode script (reads `localStorage`). Wraps all pages in `SplashWrapper` so the 3D intro animation shows once per session. |
| `app/globals.css` | Global styles + custom CSS keyframes: `fade-up`, `fade-in`, `ticker` (scrolling marquee), `scan` (scan-line effect), `pulse-red`. Also defines `.bg-red-grid` (subtle red dot-grid background) and `.glow-red` utility classes. |
| `app/page.tsx` | Feedback Analyser home. Full-width 2-column layout: left = headline + form, right = live sample analysis preview panel. Red/black theme. Scrolling ticker bar — shows your real past analyses from `localStorage` (`fb_history`); falls back to hardcoded samples on first visit. Recent analyses list with per-item delete button. Calls `/analyse`, stores result in `sessionStorage`, routes to `/result`. |
| `app/result/page.tsx` | Feedback results page. Renders radar chart, 5 score bars (each a unique colour), bull/bear cases, risk flags, investment memo, and AI analyst chat. |
| `app/company/page.tsx` | Company Analyser input. Red/black theme matching Feedback Analyser. Full-width 2-column layout: left = form, right = "What AI Researches" preview panel. Scrolling ticker — pulls real past company analyses from `localStorage` (`company_history`), falls back to samples on first visit. Recent analyses list with per-item delete button and click-to-reload. Live `TokenBar` in header. Comma or "and" separated names trigger compare mode. |
| `app/company/result/page.tsx` | Single-company result page. Shows INVEST/WATCH/PASS verdict, 3 scores, SWOT 2×2 grid, competitive threat map, bull/bear case, and chat. |
| `app/company/compare/page.tsx` | Multi-company comparison — full-width, 3 titled sections: (1) grouped SVG bar chart + signal snapshot + per-company score cards, (2) SWOT sub-tabs + competitive map, (3) ranked verdict cards + inline AI analyst chat knowing all companies. |

#### Components (`/components`)

| File | What it does |
|---|---|
| `SplashScreen.tsx` | Full-screen 3D intro animation. Black background with red grid, scan-line, radial glows. "FB Analyser" title zooms in using CSS `perspective` + `rotateX`. Progress bar fills over 2.2s. Fades out after ~3s. |
| `SplashWrapper.tsx` | Client component wrapping all pages. Checks `sessionStorage` for `splash_shown` — if not set, renders `SplashScreen` and fades in the page content behind it. Shows splash only once per browser tab session. |
| `RadarChart.tsx` | Pure SVG radar/spider chart. Plots 5 dimensions on a pentagon. Each dot is coloured per metric with the score number inside. Ring scale labels at 2.5, 5, 7.5, 10. |
| `ScoreBar.tsx` | Animated horizontal progress bar for a single score. Accepts label, score, definition text, and accent colour. Animates from 0 on mount. |
| `ChatBox.tsx` | Reusable chat UI. Accepts `apiEndpoint` and `buildPayload` props — works for feedback chat (`/chat`) and company chat (`/company-chat`) without code duplication. |
| `InvestmentGauge.tsx` | SVG semicircle gauge showing overall investment score. Needle animates to score position on mount. |
| `TokenBar.tsx` | Live Groq token quota indicator in the Company Analyser header. Polls `/token-usage` on mount and every 5 minutes. Colour-coded bar (green → amber → red as quota fills). Hover tooltip shows used / remaining / daily limit / reset time. Does not burn tokens — endpoint returns cached data only. |
| `ThemeToggle.tsx` | Dark/light mode toggle. Writes `dark` class to `<html>` and persists preference to `localStorage`. |

---

## What Is RAG? (Plain English)

**RAG stands for Retrieval-Augmented Generation.**

Think of the AI as a very smart person who can write well but doesn't have a specific textbook in front of them. Without RAG, if you ask the AI to score product-market fit, it uses general knowledge from its training — which might be vague or inconsistent.

**RAG solves this by handing the AI the right pages from the right textbook before it answers.**

Analogy: imagine you ask a consultant to score a startup. Without prep, they'll give a generic answer. But if you hand them the Y Combinator PMF checklist, Andreessen Horowitz's moat framework, and a churn analysis rubric *before* they respond — their answer is grounded, specific, and far more useful.

**That's exactly what RAG does here:**

1. **Store** — `knowledge_base.py` contains text documents covering PMF theory, moat models, retention analysis, and VC scoring frameworks.

2. **Retrieve** — When a user submits feedback, `rag.py` uses BM25 scoring (keyword overlap) to find the 2–3 most relevant framework documents for that specific product and feedback.

3. **Augment** — Those documents are injected into the top of the LLM prompt: *"Here are the relevant VC frameworks. Now score this feedback."*

4. **Generate** — Groq's LLM reads the frameworks AND the feedback, then produces scores grounded in actual investment logic — not just vibes.

**Why use RAG in this app?** Without it, the LLM scores are based on whatever investment knowledge leaked into its training — unpredictable and hard to audit. With RAG, every score is explicitly grounded in the same frameworks a real VC analyst would use, making the output trustworthy and consistent run-to-run.

---

## Live Deployment

| Service | URL |
|---|---|
| **Frontend** (Vercel) | https://product-fb-analyser-q6c77ew7l-app-demo1.vercel.app |
| **Backend** (Render) | https://product-fb-analyser.onrender.com |

The frontend auto-deploys from `main` via Vercel. The backend auto-deploys from `main` via Render. All API calls in the frontend point to the Render URL; CORS is configured to allow the Vercel origin.

> **Note:** Render's free tier spins down after 15 minutes of inactivity. The first request after a cold start may take 30–60 seconds to respond.

---

## Running Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
# Create .env with your keys (see below)
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
- Groq: https://console.groq.com (free tier: 500K tokens/day with `llama-3.1-8b-instant`)
- Tavily: https://app.tavily.com (free tier: 1,000 searches/month)

### What's in `.gitignore`
```
node_modules/
.venv/
frontend/.next/
frontend/node_modules/
__pycache__/
*.pyc
.env
```
