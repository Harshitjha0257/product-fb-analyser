"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ThemeToggle from "@/components/ThemeToggle";
import TokenBar from "@/components/TokenBar";

const STEPS = [
  "Searching company overview...",
  "Checking funding & growth signals...",
  "Reading customer reviews...",
  "Mapping competitor landscape...",
  "Generating investment brief...",
];

const FALLBACK_TICKERS = [
  "INVEST · Apple · 9.1/10", "WATCH · Meta · 6.4/10", "INVEST · NVIDIA · 9.6/10",
  "PASS · WeWork · 1.8/10", "INVEST · Stripe · 8.9/10", "WATCH · Snapchat · 5.2/10",
];

const RESEARCH_STEPS = [
  { icon: "⊙", label: "Company overview", detail: "What they do, founding, mission" },
  { icon: "◎", label: "Funding & growth",  detail: "Rounds raised, investors, stage" },
  { icon: "◈", label: "Customer reviews",  detail: "G2, Capterra, Trustpilot signals" },
  { icon: "⇅", label: "Competitor map",    detail: "Alternatives, threat levels" },
  { icon: "⟡", label: "News & signals",    detail: "Recent announcements, momentum" },
];

type HistoryEntry = {
  id: string;
  companyName: string;
  verdict: string;
  investmentScore: number;
  timestamp: string;
  data: any;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const verdictColor = (v: string) =>
  v === "INVEST" ? "#ef4444" : v === "WATCH" ? "#f97316" : "#6b7280";

export default function CompanyPage() {
  const [companyName, setCompanyName] = useState("");
  const [rawData, setRawData] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tickers, setTickers] = useState<string[]>(FALLBACK_TICKERS);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const router = useRouter();

  const isManualMode = rawData.trim().length > 0;
  const companyList = companyName.split(/,|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
  const isCompareMode = companyList.length > 1;
  const isTooMany = companyList.length > 3;

  useEffect(() => {
    // Pre-warm Render backend on page load so it's awake by the time user submits
    fetch("https://product-fb-analyser.onrender.com/health").catch(() => {});

    // Pre-fill from ?q= URL param (set by "Compare Now" button in result page)
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) setCompanyName(q);
    }

    try {
      const h: HistoryEntry[] = JSON.parse(localStorage.getItem("company_history") || "[]");
      setHistory(h);
      if (h.length > 0) {
        const live = h.map(e => `${e.verdict} · ${e.companyName} · ${e.investmentScore}/10`);
        setTickers(live.length >= 3 ? live : [...live, ...FALLBACK_TICKERS].slice(0, 8));
      }
    } catch {}
  }, []);

  const deleteEntry = (id: string) => {
    const updated = history.filter(e => e.id !== id);
    setHistory(updated);
    localStorage.setItem("company_history", JSON.stringify(updated));
  };

  const loadEntry = (entry: HistoryEntry) => {
    sessionStorage.setItem("company_result", JSON.stringify({ ...entry.data, _id: entry.id }));
    router.push("/company/result");
  };

  const analyse = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    setError("");
    setStep(0);
    let ticker = 0;
    const interval = !isManualMode
      ? setInterval(() => { ticker += 1; setStep(Math.min(ticker, STEPS.length - 1)); }, 3500)
      : null;

    const attempt = () =>
      axios.post(
        "https://product-fb-analyser.onrender.com/analyse-company",
        { company_name: companyName.trim(), raw_data: rawData.trim() || null },
        { timeout: 90_000 }
      );

    try {
      const res = await attempt();
      const _id = Date.now().toString();
      if (res.data.mode === "compare") {
        sessionStorage.setItem("compare_result", JSON.stringify({ ...res.data, _id }));
        router.push("/company/compare");
      } else {
        sessionStorage.setItem("company_result", JSON.stringify({ ...res.data, _id }));
        router.push("/company/result");
      }
    } catch {
      if (interval) clearInterval(interval);
      // Auto-retry after 35s countdown (handles Render cold start)
      let secs = 55;
      setRetryCountdown(secs);
      setError("Backend is waking up — auto-retrying shortly...");
      await new Promise<void>(resolve => {
        const iv = setInterval(() => {
          secs--;
          setRetryCountdown(secs);
          if (secs <= 0) { clearInterval(iv); resolve(); }
        }, 1000);
      });
      setError("");
      setRetryCountdown(0);
      let ticker2 = 0;
      const interval2 = !isManualMode
        ? setInterval(() => { ticker2 += 1; setStep(Math.min(ticker2, STEPS.length - 1)); }, 3500)
        : null;
      try {
        const res = await attempt();
        if (interval2) clearInterval(interval2);
        const _id = Date.now().toString();
        if (res.data.mode === "compare") {
          sessionStorage.setItem("compare_result", JSON.stringify({ ...res.data, _id }));
          router.push("/company/compare");
        } else {
          sessionStorage.setItem("company_result", JSON.stringify({ ...res.data, _id }));
          router.push("/company/result");
        }
      } catch {
        if (interval2) clearInterval(interval2);
        setError("Analysis failed after retry. Backend may be down — please wait a minute and try again.");
      }
    } finally {
      if (interval) clearInterval(interval);
      setLoading(false);
      setRetryCountdown(0);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col bg-red-grid">

      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)", transform: "translate(-30%,-30%)" }} />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", transform: "translate(30%,30%)" }} />

      {/* Header */}
      <header className="relative z-20 w-full border-b border-white/5 px-8 py-4 flex items-center justify-between bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <span className="text-white text-xs font-black">CA</span>
          </div>
          <span className="text-sm font-black tracking-tight">Company Analyser</span>
          <span className="text-[10px] text-blue-400 border border-blue-500/30 rounded px-2 py-0.5 font-bold uppercase tracking-widest hidden md:block">
            Investment Grade
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/feedback"
            className="text-xs text-white/30 hover:text-white/60 transition-colors">
            ← Feedback Analyser
          </a>
          <a href="/"
            className="text-xs text-white/20 hover:text-white/50 transition-colors">
            Home
          </a>
          <TokenBar />
          <ThemeToggle />
        </div>
      </header>

      {/* Ticker */}
      <div className="relative z-10 border-b border-white/5 bg-black/60 overflow-hidden h-8 flex items-center">
        <div className="flex gap-12 animate-ticker whitespace-nowrap">
          {[...tickers, ...tickers].map((t, i) => {
            const verdict = t.split(" · ")[0];
            const col = verdict === "INVEST" ? "#ef4444" : verdict === "WATCH" ? "#f97316" : "#6b7280";
            return <span key={i} className="text-[11px] font-bold tracking-wider" style={{ color: col }}>● {t}</span>;
          })}
        </div>
      </div>

      {/* Main 2-column */}
      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_480px]">

        {/* LEFT — Form */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-12 border-r border-white/5">

          <div className="flex flex-wrap gap-2 mb-7 animate-fade-up">
            {["Groq · llama-3.1-8b", "Tavily Web Research", "Autonomous AI Agent", "Investment Grade"].map(tag => (
              <span key={tag} className="text-[10px] font-bold text-white/30 border border-white/8 rounded-full px-2.5 py-1 uppercase tracking-widest">{tag}</span>
            ))}
          </div>

          <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-black tracking-tight leading-[1.02] mb-5 animate-fade-up delay-100">
            Type a Company.<br />
            <span style={{ color: "#3b82f6" }}>AI Researches</span><br />
            <span style={{ color: "#ef4444" }}>Everything.</span>
          </h1>

          <p className="text-white/35 text-base leading-relaxed mb-8 max-w-lg animate-fade-up delay-200">
            Enter any company name — AI autonomously fetches funding history, reviews, competitors and market signals, then generates a full investment brief. Compare multiple companies by separating names with commas.
          </p>

          {/* Form card */}
          <div className="animate-fade-up delay-300 border border-white/10 rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(59,130,246,0.1), 0 0 40px rgba(59,130,246,0.04)" }}>

            <div className="px-5 pt-5 pb-4">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25 block mb-2">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full bg-transparent text-white text-sm placeholder:text-white/15 focus:outline-none"
                placeholder="e.g. Notion, Linear, Stripe — or compare: Apple, Google, Microsoft"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && analyse()}
                disabled={loading}
              />
            </div>

            {/* Mode badge */}
            <div className={`mx-5 mb-4 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              isManualMode
                ? "border-purple-500/20 bg-purple-500/5 text-purple-400"
                : "border-blue-500/20 bg-blue-500/5 text-blue-400"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isManualMode ? "bg-purple-500" : "bg-blue-500"}`} />
              {isManualMode
                ? "Manual mode — AI will analyse your pasted data"
                : "AI Research mode — autonomously fetches news, reviews, funding, competitors"}
            </div>

            {/* Raw toggle */}
            <div className="px-5 pb-4">
              <button onClick={() => setShowRaw(v => !v)}
                className="text-xs font-semibold text-white/25 hover:text-white/50 flex items-center gap-1.5 transition-colors mb-3">
                <span className={`transition-transform text-[10px] ${showRaw ? "rotate-90" : ""}`}>▶</span>
                {showRaw ? "Hide raw data" : "Paste raw data instead"} — reviews, reports, notes (optional)
              </button>
              {showRaw && (
                <div>
                  <textarea
                    className="w-full bg-white/3 text-white text-sm placeholder:text-white/15 focus:outline-none resize-none leading-relaxed rounded-xl border border-white/8 p-4"
                    rows={5}
                    placeholder={"Paste any raw data about this company...\n\nG2 reviews · Crunchbase notes · News articles · Competitor teardowns"}
                    value={rawData}
                    onChange={e => setRawData(e.target.value)}
                    disabled={loading}
                  />
                  {rawData && (
                    <button onClick={() => setRawData("")}
                      className="text-xs text-white/20 hover:text-red-400 transition-colors mt-1">
                      Clear → switch back to AI Research mode
                    </button>
                  )}
                </div>
              )}
            </div>

            {isTooMany && (
              <p className="px-5 pb-3 text-xs text-amber-500 flex items-center gap-1.5">
                ⚠ Maximum 3 companies for comparison. Please remove {companyList.length - 3} company{companyList.length - 3 > 1 ? "ies" : ""}.
              </p>
            )}
            {error && (
              <p className={`px-5 pb-3 text-xs flex items-center gap-2 ${retryCountdown > 0 ? "text-amber-400" : "text-red-400"}`}>
                {retryCountdown > 0 && <span className="w-3 h-3 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin shrink-0" />}
                {error}
              </p>
            )}

            <button
              onClick={analyse}
              disabled={loading || !companyName.trim() || isTooMany}
              className="w-full py-4 font-black text-sm tracking-[0.12em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                borderTop: "1px solid rgba(59,130,246,0.15)",
              }}
            >
              {retryCountdown > 0 ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Auto-retrying in {retryCountdown}s...
                </span>
              ) : loading ? (
                <span className="flex flex-col items-center gap-2">
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {isManualMode ? "Analysing data..." : STEPS[step]}
                  </span>
                  {!isManualMode && (
                    <span className="flex gap-1">
                      {STEPS.map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i <= step ? "bg-white" : "bg-white/20"}`} />
                      ))}
                    </span>
                  )}
                </span>
              ) : isManualMode ? "Analyse This Data →"
                : isCompareMode ? `Compare ${companyList.length} Companies with AI →`
                : `Research ${companyName.trim() || "Company"} with AI →`
              }
            </button>
          </div>

          {/* Switch tool */}
          <a href="/"
            className="mt-4 flex items-center gap-4 border border-white/5 rounded-2xl p-4 hover:border-red-500/30 hover:bg-red-500/5 transition-all group animate-fade-up delay-400">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
              <span className="text-red-400 text-base">◎</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black">Feedback Analyser</p>
              <p className="text-xs text-white/25 mt-0.5">Paste user reviews → investment scores + radar chart</p>
            </div>
            <span className="text-red-400 text-sm group-hover:translate-x-1 transition-transform">→</span>
          </a>

          {/* History */}
          {history.length > 0 && (
            <div className="mt-6 animate-fade-up delay-500">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 mb-3">Recent Analyses</p>
              <div className="space-y-2">
                {history.slice(0, 6).map(entry => (
                  <div key={entry.id}
                    className="flex items-center gap-3 border border-white/5 rounded-xl px-4 py-2.5 hover:border-white/10 transition-all group"
                    style={{ background: "rgba(255,255,255,0.01)" }}>
                    <button onClick={() => loadEntry(entry)} className="flex-1 flex items-center gap-3 text-left min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: verdictColor(entry.verdict) }} />
                      <span className="text-sm font-bold text-white/70 truncate">{entry.companyName}</span>
                      <span className="text-xs font-black shrink-0" style={{ color: verdictColor(entry.verdict) }}>{entry.verdict}</span>
                      <span className="text-xs font-black text-white/40 shrink-0">{entry.investmentScore}/10</span>
                      <span className="text-[10px] text-white/20 shrink-0 ml-auto">{timeAgo(entry.timestamp)}</span>
                    </button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Delete">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Research Preview Panel */}
        <div className="preview-panel hidden lg:flex flex-col border-l border-white/5" style={{ background: "rgba(0,0,0,0.5)" }}>

          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">What AI Researches</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Research steps */}
            <div className="border border-white/5 rounded-xl p-4 animate-fade-up" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-4">5 Autonomous Research Steps</p>
              <div className="space-y-3">
                {RESEARCH_STEPS.map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-blue-400 text-sm"
                      style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      {s.icon}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white/60">{s.label}</p>
                      <p className="text-[10px] text-white/25 mt-0.5">{s.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample verdict */}
            <div className="border border-white/5 rounded-xl p-4 animate-fade-up delay-100" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-3">Sample Output</p>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-black text-white/60">Notion Inc.</span>
                <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>INVEST</span>
              </div>
              {[
                { label: "Investment Score", val: 8, color: "#ef4444" },
                { label: "Moat Score",       val: 6, color: "#f97316" },
                { label: "Market Timing",    val: 9, color: "#a855f7" },
              ].map(m => (
                <div key={m.label} className="mb-2.5">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-white/35">{m.label}</span>
                    <span className="text-xs font-black" style={{ color: m.color }}>{m.val}/10</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.val * 10}%`, backgroundColor: m.color, opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Outputs you get */}
            <div className="border border-white/5 rounded-xl p-4 animate-fade-up delay-200" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-3">You'll Receive</p>
              <div className="flex flex-wrap gap-1.5">
                {["SWOT Analysis", "Moat Score", "Market Timing", "Competitive Map", "Bull & Bear Case", "Investment Verdict", "Due Diligence Qs", "AI Analyst Chat"].map(o => (
                  <span key={o} className="text-[10px] text-white/30 border border-white/8 rounded-full px-2.5 py-1">{o}</span>
                ))}
              </div>
            </div>

            {/* Compare tip */}
            <div className="border border-blue-500/15 rounded-xl p-4 animate-fade-up delay-300"
              style={{ background: "rgba(59,130,246,0.04)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-400/60 mb-2">Compare Mode</p>
              <p className="text-xs text-white/30 leading-relaxed">Type multiple company names separated by commas — e.g. <span className="text-blue-400/60 font-semibold">Apple, Google, Microsoft</span> — to get a side-by-side statistical comparison with bar charts and a shared AI analyst.</p>
            </div>

            <p className="text-center text-[9px] text-white/8 uppercase tracking-[0.3em] pb-1">Sample · Not real data</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-8 py-3 flex items-center justify-between">
        <p className="text-[10px] text-white/15 uppercase tracking-[0.25em]">Powered by Groq · llama-3.1-8b-instant · Tavily Web Research</p>
        <p className="text-[10px] text-white/8">Investment-grade AI analysis</p>
      </footer>
    </div>
  );
}
