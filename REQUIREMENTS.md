# Product Analyser — Software Requirements Document

**Version:** 1.0  
**Date:** July 2026  
**Status:** Live (Deployed)  
**Live URL:** https://product-fb-analyser.vercel.app

---

## 1. Project Overview

### 1.1 Purpose

Product Analyser is an AI-powered investment intelligence platform that gives venture capital analysts, founders, and product managers a structured, evidence-grounded investment verdict on any product or company — in seconds. It replaces hours of manual research and subjective scoring with a reproducible, framework-backed analysis.

### 1.2 Problem Statement

Investment decisions on early-stage products are typically slow, inconsistent, and gut-driven. Analysts spend hours reading reviews, compiling SWOT tables, and forming opinions that vary significantly between individuals. There is no standard, repeatable process for generating an investment-grade brief from raw product feedback or a company name.

### 1.3 Solution

Two AI-powered tools in a single platform:

- **Feedback Analyser** — paste raw user feedback (reviews, NPS, support tickets) or upload a file. The AI produces a scored investment memo in under 10 seconds.
- **Company Analyser** — type a company name. The AI autonomously searches the live web and produces a full investment brief with competitive analysis, financial signals, and a verdict.

### 1.4 Target Users

| User Type | Primary Use Case |
|---|---|
| VC Analysts | Quick first-pass scoring on portfolio candidates |
| Founders | Understand how investors will read their user feedback |
| Product Managers | Identify PMF gaps and churn risk from customer feedback |
| Consultants | Rapid competitive intelligence on client markets |

---

## 2. Functional Requirements

### 2.1 Landing Page

| ID | Requirement |
|---|---|
| FR-01 | Display two tool entry cards: Feedback Analyser and Company Analyser |
| FR-02 | Show a live scrolling ticker of recent analyses pulled from browser localStorage |
| FR-03 | Fire a silent `/health` ping to the backend on page load to pre-warm the Render server |
| FR-04 | Support dark mode and light mode toggle, persisted to localStorage |

---

### 2.2 Feedback Analyser (`/feedback`)

#### Input

| ID | Requirement |
|---|---|
| FR-10 | Accept raw text feedback via a textarea (paste mode) |
| FR-11 | Accept file uploads: `.txt`, `.pdf`, `.docx` formats only |
| FR-12 | `.txt` files must be read client-side without a backend call |
| FR-13 | `.pdf` and `.docx` files must be sent to the `/extract-text` backend endpoint for text extraction |
| FR-14 | Display a character counter showing how much of the feedback will be processed |
| FR-15 | Auto-infer the product name from the uploaded filename (strip extension, filter noise words like "reviews", "feedback", "tickets") |
| FR-16 | Auto-infer the product name from pasted text by scanning the first 600 characters for patterns: `— ProductName`, `Reviews — ProductName`, `# ProductName Support` |
| FR-17 | Allow the user to manually override the inferred product name via a text input field |
| FR-18 | Allow toggling between paste mode and file upload mode |

#### Analysis

| ID | Requirement |
|---|---|
| FR-19 | Send feedback (truncated to 3,000 characters) and product name to the `/analyse` backend endpoint |
| FR-20 | Display a loading spinner during analysis |
| FR-21 | On network failure (Render cold start), display a 55-second auto-retry countdown and retry automatically — do not require user action |
| FR-22 | On HTTP error (backend returned a 4xx/5xx), display the server error message immediately without the retry countdown |
| FR-23 | On success, store the full analysis result in `sessionStorage` and navigate to `/result` |

---

### 2.3 Feedback Result Page (`/result`)

#### Verdict & Scores

| ID | Requirement |
|---|---|
| FR-30 | Display the INVEST / WATCH / PASS verdict prominently as the hero element |
| FR-31 | Show a verdict legend (INVEST 7–10, WATCH 4–6, PASS 1–3) with definitions, with the current result highlighted |
| FR-32 | Display the Investment Score (1–10) and Confidence level (Low / Medium / High) |
| FR-33 | Display an animated SVG radar chart with 5 axes: PMF, Investment, Moat, Retention, Sentiment |
| FR-34 | Display animated score bars for all 5 dimensions with label, score, definition, and one-sentence reasoning |
| FR-35 | Display an SVG semicircle gauge showing the investment score with animated needle |

#### Analysis Sections

| ID | Requirement |
|---|---|
| FR-36 | Section 01 — Performance Scorecard: 5 score bars (Investment, PMF, Sentiment, Moat, Retention) |
| FR-37 | Section 02 — Investment Thesis: Bull Case and Bear Case cards |
| FR-38 | Section 03 — Risk Flags: numbered list of key risks from the feedback |
| FR-39 | Section 04 — Key Metrics: specific quantified observations extracted from feedback |
| FR-40 | Section 05 — Market Signals: revenue signal, churn risk, growth signal, exit potential, comparable company |
| FR-41 | Section 06 — Due Diligence: follow-up questions a VC partner would ask before a term sheet |
| FR-42 | Section 07 — AI Analyst Chat: freeform Q&A against the analysis, with suggested starter questions |

#### History & Export

| ID | Requirement |
|---|---|
| FR-43 | Save every analysis to `localStorage` under key `feedback_history`, capped at 20 entries |
| FR-44 | Display history in the left sidebar, most recent first, with product name, verdict, score, and date |
| FR-45 | Clicking a history entry must reload that analysis into the page without a new API call |
| FR-46 | Export the current analysis as a JSON file (all fields) via a header button |
| FR-47 | Export the current analysis as a CSV file (key fields as columns) via a header button |

---

### 2.4 Company Analyser (`/company`)

#### Input

| ID | Requirement |
|---|---|
| FR-50 | Accept one to three company names, comma-separated, in a single text input |
| FR-51 | Display a warning and disable the Analyse button if more than 3 company names are entered |
| FR-52 | Pre-fill the input from the `?q=` URL query parameter (used by the compare navigation flow) |
| FR-53 | Fire a silent `/health` ping on page load to pre-warm the backend |
| FR-54 | Apply the same 55-second auto-retry countdown as the Feedback Analyser on network failure |
| FR-55 | For a single company, navigate to `/company/result` on success |
| FR-56 | For 2–3 companies, navigate to `/company/compare` on success |

---

### 2.5 Company Result Page (`/company/result`)

#### Verdict & Compare

| ID | Requirement |
|---|---|
| FR-60 | Display a verdict guide strip (INVEST / WATCH / PASS with ranges and definitions) as the first visible element, with the current result highlighted |
| FR-61 | Display a prominent Compare Panel immediately below the verdict guide containing: locked current-company chip, up to 4 AI-suggested competitor chips (toggleable, max 2 selectable), a free-text input for adding a custom company, a "Compare →" button, and a 3-slot progress indicator |
| FR-62 | The Compare Panel must enforce a maximum of 3 total companies (current + selected) |
| FR-63 | Clicking "Compare →" must navigate to `/company?q=company1,comp2,comp3` |
| FR-64 | Display the verdict banner with company name, verdict, score, summary, and funding stage |

#### Analysis Sections

| ID | Requirement |
|---|---|
| FR-65 | Section 01 — Performance Scores: animated score bars for Investment, Moat, and Market Timing |
| FR-66 | Section 02 — Financial Signals: Revenue, EBITDA, Profitability, Market Cap, Stock Trend — colour-coded green (positive), red (negative), neutral (unknown) |
| FR-67 | Section 03 — SWOT Analysis: 2×2 grid (Strengths, Weaknesses, Opportunities, Threats) |
| FR-68 | Section 04 — Competitive Threat Map: table of competitors with positioning and threat level badge |
| FR-69 | Section 05 — Investment Thesis: Bull Case and Bear Case cards |
| FR-70 | Section 06 — Key Risks: numbered risk list |
| FR-71 | Section 07 — Market Opportunity: TAM signal (if available) |
| FR-72 | Section 08 — Due Diligence Questions: VC follow-up questions |
| FR-73 | Section 09 — AI Analyst Chat: company-specific freeform Q&A |

#### History & Export

| ID | Requirement |
|---|---|
| FR-74 | Save to `localStorage` under `company_history`, capped at 20 entries |
| FR-75 | Left sidebar shows company history with avatar, verdict, score, date |
| FR-76 | Export as JSON and CSV from header buttons |

---

### 2.6 Company Compare Page (`/company/compare`)

| ID | Requirement |
|---|---|
| FR-80 | Display a verdict legend strip (INVEST / WATCH / PASS) at the top, just below the header |
| FR-81 | Section 00 — Individual Analyses: one card per company, each showing verdict badge, animated score strips in the company's assigned colour, financial signals, that company's own specific competitors (not shared), and bull/bear cases |
| FR-82 | Each company must have a distinct colour from the palette `[blue, green, orange, purple, pink]` |
| FR-83 | Section 01 — Performance Analysis: grouped SVG bar chart comparing Investment, Moat, and Market Timing scores across all companies; signal snapshot table; per-company animated score cards |
| FR-84 | Section 02 — SWOT & Competition: sub-tab switcher (Strengths / Weaknesses / Opportunities / Threats) showing each company's SWOT side by side; competitive threat map per company |
| FR-85 | Section 03 — Verdict & AI Analyst: companies ranked by investment score with reasoning; shared AI analyst chat for cross-company questions |
| FR-86 | Bottom panel: if fewer than 3 companies, show "Add Company →" button that pre-fills `/company?q=` with existing names; if 3 companies, show "max reached" warning |
| FR-87 | Export all companies as a single JSON file and as a multi-row CSV from header buttons |

---

### 2.7 Token Usage Bar

| ID | Requirement |
|---|---|
| FR-90 | Display a Groq token quota bar in the header on all pages that make LLM calls |
| FR-91 | Poll `/token-usage` every 60 seconds — do not make a Groq API call just to check quota |
| FR-92 | Colour-code the bar: green (0–60%), amber (60–85%), red (85–100%) |
| FR-93 | Show tooltip with: tokens used, tokens remaining, daily limit, estimated reset time |

---

## 3. Non-Functional Requirements

### 3.1 Performance

| ID | Requirement |
|---|---|
| NFR-01 | Feedback analysis must complete within 10 seconds under normal conditions (backend awake) |
| NFR-02 | Single-company analysis must complete within 20 seconds under normal conditions |
| NFR-03 | Multi-company analysis (3 companies) must complete within 60 seconds — companies are analysed in parallel |
| NFR-04 | Frontend pages must load in under 3 seconds on a standard broadband connection |
| NFR-05 | All score bar and gauge animations must complete within 1.5 seconds of page load |

### 3.2 Reliability

| ID | Requirement |
|---|---|
| NFR-06 | The system must gracefully handle Render cold starts (50–60 second delay) without showing a crash error — use the pre-warm + auto-retry pattern |
| NFR-07 | The system must not lose user-entered feedback or company names during the retry countdown |
| NFR-08 | LLM JSON parsing must use a regex fallback if the model wraps its output in markdown fences |
| NFR-09 | All Groq calls must use `response_format={"type": "json_object"}` to enforce valid JSON at the API level |

### 3.3 Token Budget

| ID | Requirement |
|---|---|
| NFR-10 | Total tokens per feedback analysis must not exceed 4,500 (well under the 6,000 TPM free tier limit) |
| NFR-11 | Feedback input must be truncated to 3,000 characters before being sent to the LLM |
| NFR-12 | RAG context must be capped at 2 results per query |
| NFR-13 | Feedback analysis max output tokens: 1,000 |
| NFR-14 | Company analysis max output tokens: 750 |

### 3.4 Security

| ID | Requirement |
|---|---|
| NFR-15 | API keys (GROQ_API_KEY, TAVILY_API_KEY) must never be exposed to the browser — backend-only via `.env` |
| NFR-16 | CORS must be configured on the FastAPI backend to allow only the Vercel frontend origin |
| NFR-17 | No user data is persisted server-side — all history lives in browser localStorage only |

### 3.5 Usability

| ID | Requirement |
|---|---|
| NFR-18 | The application must be fully functional on desktop browsers (Chrome, Firefox, Edge, Safari) |
| NFR-19 | The layout must be responsive and usable on screens from 768px width upward |
| NFR-20 | Dark mode must be the default; light mode toggle must persist across page navigations |
| NFR-21 | All loading states must show a visible spinner or progress indicator |
| NFR-22 | All error messages must be human-readable — never expose raw stack traces to the user |

### 3.6 Verdict Calibration

| ID | Requirement |
|---|---|
| NFR-23 | INVEST verdict must only be assigned for investment_score 7–10 |
| NFR-24 | WATCH verdict must only be assigned for investment_score 4–6 |
| NFR-25 | PASS verdict must only be assigned for investment_score 1–3 |
| NFR-26 | Mixed feedback (positive and negative signals present) must produce a WATCH verdict, not INVEST or PASS |

---

## 4. System Architecture

### 4.1 Component Overview

```
Browser (Next.js 14 — Vercel)
│
├── / (Landing)           — Tool picker, pre-warm ping, history ticker
├── /feedback             — Feedback Analyser input
├── /result               — Feedback analysis result
├── /company              — Company Analyser input
├── /company/result       — Single-company result + compare panel
└── /company/compare      — Multi-company side-by-side analysis
         │
         │ HTTP POST (axios, 90s timeout)
         ▼
FastAPI Backend (Python — Render)
│
├── POST /analyse          — Feedback analysis via Groq + RAG
├── POST /chat             — AI chat for feedback results
├── POST /analyse-company  — Company research via Tavily + Groq
├── POST /company-chat     — AI chat for single company
├── POST /compare-chat     — AI chat across N companies
├── POST /extract-text     — PDF/DOCX text extraction
├── GET  /token-usage      — Cached token quota (no LLM call)
└── GET  /health           — Pre-warm health check
         │
         ├── Groq API (llama-3.1-8b-instant) — LLM inference
         ├── Tavily API — Autonomous web research
         └── BM25 RAG — VC framework document retrieval
```

### 4.2 Data Flow — Feedback Analyser

```
1. User pastes feedback → frontend extracts product name from text
2. POST /analyse { feedback, product_name }
3. Backend: truncate feedback → BM25 RAG retrieval (top 2 chunks)
4. Backend: build prompt with VC frameworks + product name instruction
5. Groq LLM → JSON response with verdict, scores, analysis
6. Backend: regex JSON fallback if needed → return result
7. Frontend: store in sessionStorage → navigate to /result
8. /result: render charts, scores, AI chat available
```

### 4.3 Data Flow — Company Analyser

```
1. User types company names (1–3, comma-separated)
2. POST /analyse-company { companies: ["Apple", "Google"] }
3. Backend: parallel analysis per company
   a. 5 Tavily searches per company (overview, funding, reviews, competitors, news)
   b. Groq LLM with combined context → JSON with financials, SWOT, competitors
4. Return { companies: [...] }
5. 1 company → /company/result ; 2-3 companies → /company/compare
```

---

## 5. API Specification

### 5.1 POST /analyse

**Request:**
```json
{
  "feedback": "string (truncated to 3000 chars server-side)",
  "product_name": "string (optional — inferred if empty)"
}
```

**Response:**
```json
{
  "verdict": "INVEST | WATCH | PASS",
  "investment_score": 7,
  "pmf_score": 6,
  "sentiment_score": 5,
  "moat_score": 7,
  "retention_score": 6,
  "confidence": "High | Medium | Low",
  "revenue_signal": "Strong | Moderate | Weak",
  "churn_risk": "Low | Medium | High",
  "growth_signal": "Accelerating | Steady | Declining",
  "exit_potential": "IPO Candidate | Acquisition Target | PE Buyout | Early Stage",
  "investment_thesis": "string",
  "bear_case": "string",
  "strengths": ["string"],
  "risk_flags": ["string"],
  "key_metrics": ["string"],
  "market_signal": "string",
  "moat_signal": "string",
  "tam_signal": "string",
  "comparable": "string",
  "investor_summary": "string",
  "follow_up_questions": ["string"],
  "score_reasoning": { "investment": "string", "pmf": "string", "sentiment": "string" },
  "product_name": "string"
}
```

### 5.2 POST /analyse-company

**Request:**
```json
{ "companies": ["Apple", "Google", "Microsoft"] }
```

**Response:**
```json
{
  "companies": [
    {
      "company_name": "Apple",
      "verdict": "INVEST | WATCH | PASS",
      "investment_score": 9,
      "moat_score": 9,
      "market_timing_score": 8,
      "confidence": "High",
      "growth_signal": "Accelerating",
      "revenue_signal": "Strong",
      "churn_risk": "Low",
      "exit_potential": "IPO Candidate",
      "funding_stage": "Public",
      "company_summary": "string",
      "swot": { "strengths": [], "weaknesses": [], "opportunities": [], "threats": [] },
      "competitive_map": [{ "name": "string", "positioning": "string", "threat_level": "High | Medium | Low" }],
      "bull_case": "string",
      "bear_case": "string",
      "investment_reasoning": "string",
      "key_risks": ["string"],
      "follow_up_questions": ["string"],
      "financials": {
        "revenue": "string",
        "ebitda": "Positive | Negative | Unknown",
        "market_cap": "string",
        "stock_trend": "Bullish | Bearish | Neutral | Not-listed",
        "profitability": "Profitable | Loss-making | Pre-revenue | Unknown"
      },
      "data_source": "autonomous_research | user_provided"
    }
  ],
  "total_tokens": 1240
}
```

---

## 6. Technology Stack

| Layer | Technology | Version | Reason |
|---|---|---|---|
| Frontend framework | Next.js (App Router) | 14 | Built by Vercel — zero-config deployment, Server Components, edge functions |
| Language (frontend) | TypeScript | 5 | Type safety, catches bugs at compile time |
| Styling | Tailwind CSS | 3 | Utility-first, no CSS file overhead, dark mode support |
| HTTP client | axios | latest | 90s timeout config, structured error handling |
| Backend framework | FastAPI | latest | Async Python, automatic OpenAPI docs, fast |
| LLM inference | Groq (llama-3.1-8b-instant) | — | 10–20× faster than GPU inference; 500K tokens/day free |
| Web research | Tavily | — | AI-native search returning clean text, not raw HTML |
| Retrieval (RAG) | BM25 (rank-bm25) | — | Keyword-based retrieval, no vector DB needed |
| Frontend hosting | Vercel | — | Native Next.js support, auto-deploy from Git, global CDN |
| Backend hosting | Render (free tier) | — | Simple FastAPI deploy, Git auto-deploy, Heroku alternative |
| PDF extraction | pypdf | — | Lightweight, no external dependency |
| DOCX extraction | python-docx | — | Standard library for Word file parsing |

---

## 7. Constraints

| ID | Constraint |
|---|---|
| C-01 | Groq free tier: 500,000 tokens/day and 6,000 tokens/minute — prompts are designed to stay well under TPM limit |
| C-02 | Tavily free tier: 1,000 searches/month — 5 searches per company analysis |
| C-03 | Render free tier: backend sleeps after 15 minutes of inactivity — mitigated by pre-warm strategy |
| C-04 | No persistent database — all history is client-side (localStorage) only |
| C-05 | Maximum 3 companies per comparison — LLM context and TPM constraints |
| C-06 | Feedback input capped at 3,000 characters — TPM budget |
| C-07 | Analysis history limited to 20 entries per tool — localStorage size |

---

## 8. Out of Scope

The following are explicitly not part of this version:

- User authentication / accounts
- Server-side history persistence or database
- Custom domain (currently on Vercel subdomain)
- Email / Slack notifications
- PDF export of analysis reports
- Batch analysis (multiple feedback files at once)
- Real-time streaming of LLM responses
- Mobile native app (iOS / Android)

---

## 9. Glossary

| Term | Definition |
|---|---|
| **PMF** | Product-Market Fit — how urgently customers need the product |
| **Moat** | Competitive defensibility — switching costs, network effects, data advantages |
| **Churn Risk** | Probability that existing customers cancel or stop using the product |
| **TAM** | Total Addressable Market — the total revenue opportunity for the product |
| **RAG** | Retrieval-Augmented Generation — injecting relevant knowledge documents into the LLM prompt |
| **TPM** | Tokens Per Minute — Groq's rate limit (6,000 on free tier) |
| **Cold Start** | The 50–60 second delay when Render's free-tier server wakes up after inactivity |
| **INVEST** | Verdict for investment score 7–10: compelling opportunity, strong conviction |
| **WATCH** | Verdict for investment score 4–6: mixed signals, monitor and wait |
| **PASS** | Verdict for investment score 1–3: weak fundamentals, not compelling now |
| **LPU** | Language Processing Unit — Groq's custom silicon, 10–20× faster than GPU inference |
