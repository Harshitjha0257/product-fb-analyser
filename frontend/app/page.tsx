"use client";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import TokenBar from "@/components/TokenBar";

const FALLBACK_TICKERS = [
  "INVEST · Notion · 8.4/10", "WATCH · Figma · 6.2/10", "PASS · Clubhouse · 2.1/10",
  "INVEST · Linear · 9.1/10", "WATCH · Superhuman · 5.8/10", "INVEST · Stripe · 8.9/10",
  "INVEST · Apple · 9.1/10", "WATCH · Meta · 6.4/10",
];

export default function Home() {
  const [tickers, setTickers] = useState<string[]>(FALLBACK_TICKERS);

  useEffect(() => {
    try {
      const fb: any[] = JSON.parse(localStorage.getItem("fb_history") || "[]");
      const ca: any[] = JSON.parse(localStorage.getItem("company_history") || "[]");
      const all = [
        ...fb.map(e => `${e.verdict} · ${e.productName} · ${e.investmentScore}/10`),
        ...ca.map(e => `${e.verdict} · ${e.companyName} · ${e.investmentScore}/10`),
      ].filter(Boolean);
      if (all.length >= 3) setTickers(all);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col bg-red-grid">

      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)", transform: "translate(-30%,-30%)" }} />
      <div className="fixed bottom-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)", transform: "translate(30%,30%)" }} />

      {/* Header */}
      <header className="relative z-20 w-full border-b border-white/5 px-8 py-4 flex items-center justify-between bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}>
            <span className="text-white text-xs font-black">PA</span>
          </div>
          <span className="text-sm font-black tracking-tight">Product Analyser</span>
          <span className="text-[10px] text-red-400 border border-red-500/30 rounded px-2 py-0.5 font-bold uppercase tracking-widest hidden md:block">
            Investment Intelligence
          </span>
        </div>
        <div className="flex items-center gap-4">
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

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center animate-fade-up">
          {["Groq · LLM", "Tavily · Web Research", "RAG · VC Frameworks", "Investment Grade"].map(tag => (
            <span key={tag} className="text-[10px] font-bold text-white/30 border border-white/8 rounded-full px-3 py-1 uppercase tracking-widest">{tag}</span>
          ))}
        </div>

        {/* Headline */}
        <h1 className="text-5xl xl:text-7xl font-black tracking-tight text-center leading-[1.02] mb-4 animate-fade-up delay-100">
          Investment-Grade<br /><span style={{ color: "#ef4444" }}>AI Analysis.</span>
        </h1>
        <p className="text-white/35 text-base text-center max-w-xl mb-14 animate-fade-up delay-200">
          Choose a tool below — paste user feedback or type a company name. Get a full investment brief powered by autonomous AI research.
        </p>

        {/* Tool cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl animate-fade-up delay-300">

          {/* Feedback Analyser */}
          <a href="/feedback" className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 hover:border-red-500/40 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(239,68,68,0.08)" }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at 30% 20%, rgba(239,68,68,0.1) 0%, transparent 60%)" }} />
            <div className="p-8 flex flex-col flex-1 relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-red-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">FA</span>
                </div>
                <div>
                  <p className="font-black text-lg">Feedback Analyser</p>
                  <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest">VC Investor Lens</p>
                </div>
              </div>

              <p className="text-white/40 text-sm leading-relaxed mb-6">
                Paste raw user feedback — reviews, NPS, support tickets. Get a full scored investment analysis with bull &amp; bear case, risk flags, and radar chart.
              </p>

              <div className="space-y-2.5 mb-8 flex-1">
                {["5 scored investment dimensions", "Bull & Bear case generation", "RAG-augmented VC frameworks", "AI analyst chat"].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    <span className="text-xs text-white/35">{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-white/20">Paste feedback → instant analysis</span>
                <span className="text-red-400 font-black group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </a>

          {/* Company Analyser */}
          <a href="/company" className="group relative flex flex-col rounded-2xl overflow-hidden border border-white/10 hover:border-blue-500/40 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.02)", boxShadow: "0 0 0 1px rgba(59,130,246,0.08)" }}>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: "radial-gradient(circle at 70% 20%, rgba(59,130,246,0.1) 0%, transparent 60%)" }} />
            <div className="p-8 flex flex-col flex-1 relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-black">CA</span>
                </div>
                <div>
                  <p className="font-black text-lg">Company Analyser</p>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Autonomous Research</p>
                </div>
              </div>

              <p className="text-white/40 text-sm leading-relaxed mb-6">
                Type any company name. AI autonomously fetches funding history, reviews, competitors, and market signals — no data pasting required.
              </p>

              <div className="space-y-2.5 mb-8 flex-1">
                {["Autonomous Tavily web research", "SWOT & competitive threat map", "Multi-company comparison", "AI analyst chat"].map(f => (
                  <div key={f} className="flex items-center gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-xs text-white/35">{f}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <span className="text-xs text-white/20">Type a name → AI researches everything</span>
                <span className="text-blue-400 font-black group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </a>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-8 py-3 flex items-center justify-between">
        <p className="text-[10px] text-white/15 uppercase tracking-[0.25em]">Powered by Groq · llama-3.1-8b-instant · Tavily · RAG</p>
        <p className="text-[10px] text-white/8">Investment-grade AI analysis</p>
      </footer>
    </div>
  );
}
