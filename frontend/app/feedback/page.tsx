"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ThemeToggle from "@/components/ThemeToggle";
import TokenBar from "@/components/TokenBar";

type HistoryEntry = {
  id: string;
  productName: string;
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

const SCORES = [
  { label: "Investment Score", score: 8.4, color: "#ef4444" },
  { label: "PMF Score",        score: 7.1, color: "#f97316" },
  { label: "Moat Score",       score: 6.8, color: "#a855f7" },
  { label: "Sentiment Score",  score: 9.1, color: "#3b82f6" },
  { label: "Retention Score",  score: 7.6, color: "#06b6d4" },
];

const OUTPUTS = [
  "Investment Score", "PMF Score", "Moat Score",
  "Sentiment Score", "Retention Score",
  "Bull & Bear Case", "Risk Analysis", "Exit Potential",
  "AI Analyst Chat", "TAM Signal",
];

const FALLBACK_TICKERS = [
  "INVEST · Notion · 8.4/10", "WATCH · Figma · 6.2/10", "PASS · Clubhouse · 2.1/10",
  "INVEST · Linear · 9.1/10", "WATCH · Superhuman · 5.8/10", "INVEST · Stripe · 8.9/10",
];

export default function FeedbackAnalyser() {
  const [productName, setProductName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [tickers, setTickers] = useState<string[]>(FALLBACK_TICKERS);
  const [inputTab, setInputTab] = useState<"paste" | "upload">("paste");
  const [extracting, setExtracting] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const router = useRouter();

  const handleFile = async (file: File) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".txt") && !name.endsWith(".pdf") && !name.endsWith(".docx")) {
      setError("Unsupported file. Please upload a .txt, .pdf, or .docx file.");
      return;
    }
    setError("");
    setExtracting(true);
    setUploadedFileName(file.name);
    try {
      if (name.endsWith(".txt")) {
        const text = await file.text();
        setFeedback(text);
        setInputTab("paste");
      } else {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("https://product-fb-analyser.onrender.com/extract-text", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Extraction failed");
        }
        const data = await res.json();
        setFeedback(data.text);
        setInputTab("paste");
      }
    } catch (e: any) {
      setError(e.message || "Failed to extract text from file.");
    } finally {
      setExtracting(false);
    }
  };

  useEffect(() => {
    // Pre-warm Render backend on page load so it's awake by the time user submits
    fetch("https://product-fb-analyser.onrender.com/health").catch(() => {});

    try {
      const h: HistoryEntry[] = JSON.parse(localStorage.getItem("fb_history") || "[]");
      setHistory(h);
      if (h.length > 0) {
        const live = h.map(e => `${e.verdict} · ${e.productName} · ${e.investmentScore}/10`);
        setTickers(live.length >= 3 ? live : [...live, ...FALLBACK_TICKERS].slice(0, 8));
      }
    } catch {}
  }, []);

  const deleteEntry = (id: string) => {
    const updated = history.filter(e => e.id !== id);
    setHistory(updated);
    localStorage.setItem("fb_history", JSON.stringify(updated));
  };

  const loadEntry = (entry: HistoryEntry) => {
    sessionStorage.setItem("result", JSON.stringify({ ...entry.data, _id: entry.id }));
    router.push("/result");
  };

  const analyse = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");

    const attempt = () =>
      axios.post(
        "https://product-fb-analyser.onrender.com/analyse",
        { feedback, product_name: productName },
        { timeout: 90_000 }
      );

    try {
      const res = await attempt();
      const _id = Date.now().toString();
      sessionStorage.setItem("result", JSON.stringify({ ...res.data, _feedback: feedback, _id }));
      router.push("/result");
    } catch (err: any) {
      const serverMsg = err?.response?.data?.detail;
      if (serverMsg) {
        // Backend is up but returned an error — no retry needed
        setError(`Analysis error: ${serverMsg}`);
        setLoading(false);
        return;
      }
      // No response = network/timeout = Render cold start — auto-retry
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
      try {
        const res = await attempt();
        const _id = Date.now().toString();
        sessionStorage.setItem("result", JSON.stringify({ ...res.data, _feedback: feedback, _id }));
        router.push("/result");
      } catch (err2: any) {
        const msg2 = err2?.response?.data?.detail;
        setError(msg2 ? `Analysis error: ${msg2}` : "Backend unavailable — please try again in a moment.");
      }
    } finally {
      setLoading(false);
      setRetryCountdown(0);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col bg-red-grid">

      {/* Ambient glow */}
      <div className="fixed top-0 left-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.04) 0%, transparent 70%)", transform: "translate(30%, 30%)" }} />

      {/* Header */}
      <header className="relative z-20 w-full border-b border-white/5 px-8 py-4 flex items-center justify-between bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
              <span className="text-white text-xs font-black">FA</span>
            </div>
            <span className="text-sm font-black tracking-tight">FeedbackAnalyser</span>
          </a>
          <span className="text-[10px] text-red-400 border border-red-500/30 rounded px-2 py-0.5 font-bold uppercase tracking-widest hidden md:block">
            Investor Lens
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/company"
            className="text-xs font-bold text-blue-400 hover:text-blue-300 border border-blue-500/30 hover:border-blue-400/60 rounded-lg px-3 py-1.5 transition-all">
            Company Analyser →
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
            {["Groq", "llama-3.1-8b", "RAG-Augmented", "VC-Grade"].map(tag => (
              <span key={tag} className="text-[10px] font-bold text-white/30 border border-white/8 rounded-full px-2.5 py-1 uppercase tracking-widest">{tag}</span>
            ))}
          </div>

          <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-black tracking-tight leading-[1.02] mb-5 animate-fade-up delay-100">
            Turn Feedback Into<br />
            <span style={{ color: "#ef4444" }}>Investment</span><br />
            Analysis.
          </h1>

          <p className="text-white/35 text-base leading-relaxed mb-8 max-w-lg animate-fade-up delay-200">
            Paste raw user feedback — reviews, NPS, support tickets. Get a full scored analysis with bull &amp; bear case, risk flags, radar chart, and an AI analyst to interrogate.
          </p>

          {/* Form card */}
          <div className="animate-fade-up delay-300 border border-white/10 rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(239,68,68,0.1), 0 0 40px rgba(239,68,68,0.05)" }}>

            <div className="px-5 pt-5 pb-4 border-b border-white/5">
              <label className="text-[10px] font-black uppercase tracking-[0.25em] text-white/25 block mb-2">Product Name</label>
              <input
                className="w-full bg-transparent text-white text-sm placeholder:text-white/15 focus:outline-none"
                placeholder="e.g. Linear, Notion, Figma..."
                value={productName}
                onChange={e => setProductName(e.target.value)}
              />
            </div>

            <div className="px-5 pt-4 pb-3">
              {/* Tab switcher */}
              <div className="flex items-center gap-1 mb-3">
                <button
                  onClick={() => setInputTab("paste")}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded transition-all ${
                    inputTab === "paste"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : "text-white/25 hover:text-white/40"
                  }`}>
                  📝 Paste Text
                </button>
                <button
                  onClick={() => setInputTab("upload")}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded transition-all ${
                    inputTab === "upload"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : "text-white/25 hover:text-white/40"
                  }`}>
                  📎 Upload File
                </button>
                {uploadedFileName && (
                  <span className="ml-auto text-[10px] text-green-400 font-bold truncate max-w-[140px]">✓ {uploadedFileName}</span>
                )}
              </div>

              {inputTab === "paste" ? (
                <textarea
                  className="w-full bg-transparent text-white text-sm placeholder:text-white/15 focus:outline-none resize-none leading-relaxed"
                  rows={7}
                  placeholder={"Paste raw user feedback here...\n\nApp store reviews · Survey responses · Support tickets\nNPS comments · G2 / Capterra reviews"}
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                />
              ) : (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-all py-8 ${
                    dragOver ? "border-red-500/60 bg-red-500/5" : "border-white/10 hover:border-white/20"
                  }`}>
                  {extracting ? (
                    <>
                      <span className="w-6 h-6 border-2 border-red-500/40 border-t-red-400 rounded-full animate-spin" />
                      <p className="text-xs text-white/30">Extracting text from file...</p>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl opacity-40">📄</span>
                      <p className="text-sm text-white/30 text-center">Drop your file here or</p>
                      <label className="cursor-pointer px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all">
                        Browse File
                        <input
                          type="file"
                          accept=".txt,.pdf,.docx"
                          className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                        />
                      </label>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest">Supports .txt · .pdf · .docx</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 pb-4 flex flex-wrap gap-1.5">
              {OUTPUTS.map(o => (
                <span key={o} className="text-[10px] text-white/20 border border-white/5 rounded-full px-2 py-0.5">{o}</span>
              ))}
            </div>

            {error && (
              <p className={`px-5 pb-3 text-xs flex items-center gap-2 ${retryCountdown > 0 ? "text-amber-400" : "text-red-400"}`}>
                {retryCountdown > 0 && <span className="w-3 h-3 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin shrink-0" />}
                {error}
              </p>
            )}

            <button
              onClick={analyse}
              disabled={loading || !feedback.trim()}
              className="w-full py-4 font-black text-sm tracking-[0.12em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                borderTop: "1px solid rgba(239,68,68,0.15)",
              }}
            >
              {retryCountdown > 0 ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Auto-retrying in {retryCountdown}s...
                </span>
              ) : loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Analysing feedback...
                </span>
              ) : "Generate Investment Analysis →"}
            </button>
          </div>

          {/* Switch to Company */}
          <a href="/company"
            className="mt-4 flex items-center gap-4 border border-white/5 rounded-2xl p-4 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all group animate-fade-up delay-400">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
              <span className="text-blue-400 text-base">⊙</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-black">Company Analyser</p>
                <span className="text-[9px] font-bold text-blue-400 border border-blue-500/30 rounded px-1.5 py-0.5 uppercase tracking-wider">New</span>
              </div>
              <p className="text-xs text-white/25 mt-0.5">Type a company → AI researches everything automatically</p>
            </div>
            <span className="text-blue-400 text-sm group-hover:translate-x-1 transition-transform">→</span>
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
                      <span className="text-sm font-bold text-white/70 truncate">{entry.productName}</span>
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

        {/* RIGHT — Live Preview */}
        <div className="preview-panel hidden lg:flex flex-col border-l border-white/5" style={{ background: "rgba(0,0,0,0.5)" }}>

          <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Sample Analysis Preview</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">

            <div className="animate-fade-up flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg font-black text-sm tracking-wider"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                INVEST
              </div>
              <span className="text-white/25 text-xs">Confidence: High · 8.4/10</span>
            </div>

            <div className="border border-white/5 rounded-xl p-4 space-y-3 animate-fade-up delay-100"
              style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-3">Performance Scorecard</p>
              {SCORES.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-white/40 font-semibold">{s.label}</span>
                    <span className="text-xs font-black" style={{ color: s.color }}>{s.score}</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.score * 10}%`, backgroundColor: s.color, opacity: 0.8 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="border border-white/5 rounded-xl p-4 animate-fade-up delay-200" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(52,211,153,0.5)" }}>▲ Bull Case</p>
              <p className="text-xs text-white/30 leading-relaxed">Strong PMF signals with high NPS and low churn. Users describe the product as "irreplaceable" — a hallmark of deep habit formation.</p>
            </div>

            <div className="border border-white/5 rounded-xl p-4 animate-fade-up delay-300" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(239,68,68,0.5)" }}>▼ Bear Case</p>
              <p className="text-xs text-white/30 leading-relaxed">Enterprise readiness concerns persist. Multiple mentions of missing audit logs and SSO. Risk of stalling in mid-market.</p>
            </div>

            <div className="border border-white/5 rounded-xl p-4 animate-fade-up delay-400" style={{ background: "rgba(255,255,255,0.015)" }}>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mb-3">Key Risks</p>
              {["Enterprise compliance gap", "Competitor feature parity", "Pricing sensitivity at scale"].map((r) => (
                <div key={r} className="flex items-start gap-2 mb-1.5 last:mb-0">
                  <span className="text-red-500 text-xs">×</span>
                  <span className="text-xs text-white/30">{r}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-[9px] text-white/8 uppercase tracking-[0.3em] pb-1">Sample · Not real data</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-8 py-3 flex items-center justify-between">
        <p className="text-[10px] text-white/15 uppercase tracking-[0.25em]">Powered by Groq · llama-3.1-8b-instant · RAG · Tavily</p>
        <p className="text-[10px] text-white/8">Investment-grade AI analysis</p>
      </footer>
    </div>
  );
}
