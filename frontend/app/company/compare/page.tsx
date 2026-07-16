"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ThemeToggle from "@/components/ThemeToggle";

const PALETTE = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899"];

/* ─────────────────────────────────────────────────────────────
   SVG GROUPED BAR CHART
───────────────────────────────────────────────────────────── */
function BarChart({ companies, colors }: { companies: any[]; colors: string[] }) {
  const metrics = [
    { key: "investment_score",    label: "Investment Score" },
    { key: "moat_score",          label: "Moat Score" },
    { key: "market_timing_score", label: "Market Timing" },
  ];
  const W = 700, H = 260;
  const pL = 36, pR = 12, pT = 28, pB = 48;
  const cW = W - pL - pR;
  const cH = H - pT - pB;
  const n = companies.length;
  const groupW = cW / metrics.length;
  const pad = 22;
  const gap = 6;
  const avail = groupW - pad * 2;
  const barW = Math.max(14, (avail - gap * (n - 1)) / n);
  const yS = (v: number) => pT + cH - (v / 10) * cH;
  const bH = (v: number) => (v / 10) * cH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      {/* Horizontal grid lines + Y labels */}
      {[0, 2, 4, 6, 8, 10].map(v => (
        <g key={v}>
          <line x1={pL} y1={yS(v)} x2={W - pR} y2={yS(v)}
            stroke={v === 0 ? "#d1d5db" : "#f3f4f6"} strokeWidth={v === 0 ? 1.5 : 1}
            className={v === 0 ? "dark:stroke-gray-600" : "dark:stroke-gray-800"} />
          <text x={pL - 6} y={yS(v)} textAnchor="end" dominantBaseline="middle"
            fontSize="11" fill="#9ca3af" fontWeight="600">{v}</text>
        </g>
      ))}

      {/* Bars + labels */}
      {metrics.map((m, gi) => {
        const gx = pL + gi * groupW + pad;
        const centerX = gx + (n * barW + (n - 1) * gap) / 2;
        return (
          <g key={m.key}>
            {companies.map((c, ci) => {
              const val = c[m.key] ?? 0;
              const x = gx + ci * (barW + gap);
              return (
                <g key={ci}>
                  {/* Bar shadow */}
                  <rect x={x + 1} y={yS(val) + 2} width={barW} height={bH(val)} fill={colors[ci]} opacity="0.15" rx="4" />
                  {/* Bar */}
                  <rect x={x} y={yS(val)} width={barW} height={bH(val)} fill={colors[ci]} opacity="0.92" rx="4" />
                  {/* Score on top */}
                  <text x={x + barW / 2} y={yS(val) - 7} textAnchor="middle"
                    fontSize="12" fontWeight="900" fill={colors[ci]}>{val}</text>
                </g>
              );
            })}
            {/* Group label */}
            <text x={centerX} y={H - pB + 20} textAnchor="middle"
              fontSize="12" fontWeight="700" fill="#6b7280">{m.label}</text>
          </g>
        );
      })}

      {/* Y-axis label */}
      <text x={10} y={pT + cH / 2} textAnchor="middle" dominantBaseline="middle"
        fontSize="10" fill="#9ca3af" transform={`rotate(-90, 10, ${pT + cH / 2})`}>Score (0–10)</text>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   SIGNAL BADGE
───────────────────────────────────────────────────────────── */
function Badge({ value }: { value: string }) {
  const pos = ["INVEST", "Strong", "Accelerating", "Low", "High", "IPO Candidate"];
  const cls =
    pos.includes(value)
      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    : value === "PASS" || value === "Weak" || value === "Declining"
      ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
      : "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${cls}`}>
      {value || "—"}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────
   ANIMATED MINI BAR
───────────────────────────────────────────────────────────── */
function MiniBar({ score, color }: { score: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW((score / 10) * 100), 300); return () => clearTimeout(t); }, [score]);
  return (
    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${w}%`, backgroundColor: color }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   VERDICT BADGE CLASS
───────────────────────────────────────────────────────────── */
const verdictCls = (v: string) =>
  v === "INVEST" ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
  : v === "WATCH" ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
  : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800";

/* ─────────────────────────────────────────────────────────────
   INLINE COMPARE CHAT
───────────────────────────────────────────────────────────── */
type Msg = { role: "user" | "assistant"; content: string };

function CompareChat({ companies }: { companies: any[] }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const SUGGESTIONS = [
    "Which has the strongest moat?",
    "Which is the best investment?",
    "Biggest risk across all?",
    "Compare market timing scores",
  ];

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setMessages(p => [...p, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await axios.post("https://product-fb-analyser.onrender.com/compare-chat", { companies, message: msg, history: messages });
      setMessages(p => [...p, { role: "assistant", content: res.data.reply }]);
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "Backend error — is the server running?" }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Suggestions */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTIONS.map((q, i) => (
            <button key={i} onClick={() => send(q)}
              className="text-sm px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-all text-left">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 mb-3">
        {messages.length === 0 && !loading && (
          <p className="text-sm text-gray-400 text-center pt-6 leading-relaxed">
            Ask anything — scores, risks, which to pick, what to dig into next...
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-blue-500 text-white rounded-br-sm"
                : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm"
            }`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 shrink-0">
        <input
          className="flex-1 bg-gray-50 dark:bg-gray-900 text-sm rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
          placeholder="Ask a comparative question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={loading}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          className="px-4 py-3 bg-blue-500 hover:bg-blue-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-40">
          →
        </button>
      </div>
    </div>
  );
}

function ScoreStrip({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-black" style={{ color }}>{score}<span className="text-[10px] font-normal text-gray-400">/10</span></span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score * 10}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function ComparePage() {
  const [data, setData] = useState<any>(null);
  const [swotKey, setSwotKey] = useState<"strengths" | "weaknesses" | "opportunities" | "threats">("strengths");
  const router = useRouter();
  const [exported, setExported] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("compare_result");
    if (!raw) { router.push("/company"); return; }
    setData(JSON.parse(raw));
  }, []);

  if (!data) return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison_${companies.map((c: any) => c.company_name).join("_vs_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const exportCSV = () => {
    const keys: [string, string][] = [
      ["Company", "company_name"], ["Verdict", "verdict"],
      ["Investment Score", "investment_score"], ["Moat Score", "moat_score"],
      ["Market Timing Score", "market_timing_score"], ["Confidence", "confidence"],
      ["Growth Signal", "growth_signal"], ["Revenue Signal", "revenue_signal"],
      ["Churn Risk", "churn_risk"], ["Exit Potential", "exit_potential"],
      ["Funding Stage", "funding_stage"], ["Bull Case", "bull_case"], ["Bear Case", "bear_case"],
    ];
    const header = keys.map(([k]) => `"${k}"`).join(",");
    const rows = companies.map((c: any) => keys.map(([, k]) => `"${String(c[k] ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comparison_${companies.map((c: any) => c.company_name).join("_vs_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const companies: any[] = data.companies || [];
  const colors = companies.map((_, i) => PALETTE[i % PALETTE.length]);
  const ranked = [...companies].sort((a, b) => (b.investment_score ?? 0) - (a.investment_score ?? 0));

  const swotMeta = {
    strengths:    { label: "Strengths",    accent: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", btn: "bg-emerald-500 text-white border-emerald-500" },
    weaknesses:   { label: "Weaknesses",   accent: "text-red-600 dark:text-red-400",         bar: "bg-red-500",     btn: "bg-red-500 text-white border-red-500" },
    opportunities:{ label: "Opportunities",accent: "text-blue-600 dark:text-blue-400",       bar: "bg-blue-500",    btn: "bg-blue-500 text-white border-blue-500" },
    threats:      { label: "Threats",      accent: "text-orange-600 dark:text-orange-400",   bar: "bg-orange-500",  btn: "bg-orange-500 text-white border-orange-500" },
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-20 h-16 flex items-center px-8 gap-6 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center">
            <span className="text-white text-sm font-black">CA</span>
          </div>
          <span className="text-base font-black hidden sm:block">Company Analyser</span>
          <span className="text-xs font-bold text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 uppercase tracking-widest hidden md:block">
            Comparison
          </span>
        </div>

        {/* Company legend */}
        <div className="flex-1 flex items-center justify-center gap-6 min-w-0 overflow-x-auto">
          {companies.map((c, i) => (
            <div key={i} className="flex items-center gap-2 shrink-0">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i] }} />
              <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{c.company_name}</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${verdictCls(c.verdict)}`}>{c.verdict}</span>
              <span className="text-sm font-black" style={{ color: colors[i] }}>{c.investment_score}/10</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button onClick={exportCSV} className="text-xs font-semibold text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-400 px-3 py-2 rounded-lg transition-all hidden sm:block">
            ↓ CSV
          </button>
          <button onClick={exportJSON} className={`text-xs font-semibold px-3 py-2 rounded-lg border transition-all hidden sm:block ${exported ? "border-emerald-400 text-emerald-600" : "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-400"}`}>
            {exported ? "✓ Exported" : "↓ JSON"}
          </button>
          <ThemeToggle />
          <button onClick={() => router.push("/company")}
            className="text-sm font-bold text-white bg-blue-500 hover:bg-blue-400 px-4 py-2 rounded-xl transition-all">
            + New
          </button>
        </div>
      </header>

      {/* ── Verdict Legend ── */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-8 py-3">
        <div className="flex items-center gap-6 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Verdict Guide:</span>
          {[
            { v: "INVEST", r: "7–10", c: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
            { v: "WATCH",  r: "4–6",  c: "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800" },
            { v: "PASS",   r: "1–3",  c: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800" },
          ].map(({ v, r, c }) => (
            <span key={v} className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${c}`}>{v} {r}/10</span>
          ))}
          <span className="text-[10px] text-gray-400 ml-auto">Each company is analysed independently</span>
        </div>
      </div>

      {/* ── Individual Company Analyses ── */}
      <section className="w-full bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <span className="text-5xl font-black text-gray-100 dark:text-gray-800 leading-none select-none">00</span>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Individual Analyses</h2>
            <p className="text-sm text-gray-400 mt-0.5">Each company scored separately — scroll right for full details</p>
          </div>
        </div>

        <div className={`grid gap-5 ${companies.length === 1 ? "grid-cols-1 max-w-lg" : companies.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {companies.map((c: any, i: number) => {
            const color = colors[i];
            const vCfg = {
              INVEST: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-600 dark:text-emerald-400" },
              WATCH:  { bg: "bg-yellow-50 dark:bg-yellow-950/30",  border: "border-yellow-200 dark:border-yellow-800",  text: "text-yellow-600 dark:text-yellow-400" },
              PASS:   { bg: "bg-red-50 dark:bg-red-950/30",        border: "border-red-200 dark:border-red-800",        text: "text-red-600 dark:text-red-400" },
            }[c.verdict as "INVEST" | "WATCH" | "PASS"] ?? { bg: "", border: "border-gray-200 dark:border-gray-700", text: "text-gray-500" };

            return (
              <div key={i} className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col">
                {/* Company header */}
                <div className="h-1" style={{ backgroundColor: color }} />
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0" style={{ backgroundColor: color }}>
                        {(c.company_name || "?")[0].toUpperCase()}
                      </div>
                      <p className="font-black text-sm text-gray-900 dark:text-white">{c.company_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black" style={{ color }}>{c.investment_score}</p>
                      <p className="text-[10px] text-gray-400">/10</p>
                    </div>
                  </div>

                  {/* Verdict badge */}
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border mb-3 ${vCfg.bg} ${vCfg.border}`}>
                    <span className={`text-xs font-black ${vCfg.text}`}>{c.verdict}</span>
                    <span className="text-[10px] text-gray-400">· {c.confidence} confidence</span>
                  </div>

                  {/* Score strips */}
                  <div className="space-y-2.5 mb-4">
                    <ScoreStrip label="Investment Score" score={c.investment_score ?? 0} color={color} />
                    <ScoreStrip label="Moat Score" score={c.moat_score ?? 0} color={color} />
                    <ScoreStrip label="Market Timing" score={c.market_timing_score ?? 0} color={color} />
                  </div>

                  {/* Summary */}
                  {c.company_summary && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4 line-clamp-3">{c.company_summary}</p>
                  )}

                  {/* Financial signals */}
                  {(c.financials || c.revenue_signal) && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { l: "Revenue", v: c.financials?.revenue || c.revenue_signal },
                        { l: "EBITDA", v: c.financials?.ebitda },
                        { l: "Market Cap", v: c.financials?.market_cap },
                        { l: "Stock", v: c.financials?.stock_trend },
                        { l: "Profitability", v: c.financials?.profitability || (c.revenue_signal === "Strong" ? "Profitable" : undefined) },
                        { l: "Growth", v: c.growth_signal },
                      ].filter((x): x is { l: string; v: string } => Boolean(x.v && x.v !== "—" && x.v !== "Unknown")).slice(0, 4).map(({ l, v }) => (
                        <div key={l} className="bg-gray-50 dark:bg-gray-900 rounded-lg px-2.5 py-1.5">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">{l}</p>
                          <p className={`text-xs font-bold mt-0.5 ${
                            ["Positive", "Profitable", "Bullish", "Strong", "Accelerating"].includes(v) ? "text-emerald-600 dark:text-emerald-400"
                            : ["Negative", "Loss-making", "Bearish", "Weak", "Declining"].includes(v) ? "text-red-600 dark:text-red-400"
                            : "text-gray-900 dark:text-white"
                          }`}>{v}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Their specific competitors */}
                  {c.competitive_map?.length > 0 && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 mb-2">Key Competitors</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.competitive_map.slice(0, 4).map((comp: any) => (
                          <span key={comp.name} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            comp.threat_level === "High" ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
                            : comp.threat_level === "Medium" ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                            : "bg-gray-50 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700"
                          }`}>
                            {comp.name} · {comp.threat_level}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bull / Bear */}
                  {(c.bull_case || c.bear_case) && (
                    <div className="mt-4 space-y-2">
                      {c.bull_case && (
                        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 px-3 py-2">
                          <p className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider mb-1">▲ Bull</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">{c.bull_case}</p>
                        </div>
                      )}
                      {c.bear_case && (
                        <div className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 px-3 py-2">
                          <p className="text-[9px] font-black uppercase text-red-600 dark:text-red-400 tracking-wider mb-1">▼ Bear</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">{c.bear_case}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TILE 1 — PERFORMANCE ANALYSIS
          Full width, chart left + signals right
      ════════════════════════════════════════════════════════ */}
      <section className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-8 py-8">

        {/* Section header */}
        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl font-black text-gray-100 dark:text-gray-800 leading-none select-none">01</span>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Performance Analysis</h2>
            <p className="text-sm text-gray-400 mt-0.5">Investment · Moat · Market Timing scores compared side by side</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-8">

          {/* Bar chart + explanation */}
          <div>
            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-black text-gray-900 dark:text-white">Score Comparison Chart</p>
                {/* Color legend */}
                <div className="flex items-center gap-4">
                  {companies.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i] }} />
                      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{c.company_name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <BarChart companies={companies} colors={colors} />
            </div>

            {/* Chart explanation */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              {[
                { label: "Investment Score", def: "How compelling is this company as an investment overall — 10 = must invest" },
                { label: "Moat Score", def: "How defensible is the business — switching costs, network effects, unique data" },
                { label: "Market Timing", def: "Is the market ready? 10 = perfect timing, 1 = too early or too late" },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-sm font-black text-gray-800 dark:text-gray-200 mb-1">{m.label}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{m.def}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Signal snapshot table */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <p className="text-base font-black text-gray-900 dark:text-white">Signal Snapshot</p>
              <p className="text-sm text-gray-400 mt-0.5">Key investment signals per company</p>
            </div>

            {[
              { label: "Verdict",       key: "verdict" },
              { label: "Growth Signal", key: "growth_signal" },
              { label: "Revenue",       key: "revenue_signal" },
              { label: "Churn Risk",    key: "churn_risk" },
              { label: "Exit Path",     key: "exit_potential" },
              { label: "Funding Stage", key: "funding_stage" },
              { label: "Confidence",    key: "confidence" },
            ].map((row, ri) => (
              <div key={row.key} className={`px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 ${ri % 2 === 1 ? "bg-white/60 dark:bg-gray-950/40" : ""}`}>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-400 mb-2">{row.label}</p>
                <div className="flex flex-wrap gap-2">
                  {companies.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
                      <Badge value={c[row.key] ?? "—"} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-company numeric score cards - full width strip */}
        <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: `repeat(${companies.length}, 1fr)` }}>
          {companies.map((c, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i] }} />
                  <p className="text-base font-black text-gray-900 dark:text-white">{c.company_name}</p>
                </div>
                <span className={`text-xs font-black px-2.5 py-1 rounded-full ${verdictCls(c.verdict)}`}>{c.verdict}</span>
              </div>
              {[
                { label: "Investment Score", key: "investment_score" },
                { label: "Moat Score",       key: "moat_score" },
                { label: "Market Timing",    key: "market_timing_score" },
              ].map(m => (
                <div key={m.key} className="mb-3">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-semibold text-gray-500">{m.label}</span>
                    <span className="text-base font-black" style={{ color: colors[i] }}>{c[m.key] ?? "—"}<span className="text-xs font-normal text-gray-400">/10</span></span>
                  </div>
                  <MiniBar score={c[m.key] ?? 0} color={colors[i]} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          TILE 2 — SWOT & COMPETITION
          Full width, SWOT sub-tabs + competitive map
      ════════════════════════════════════════════════════════ */}
      <section className="w-full bg-gray-50 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-800 px-8 py-8">

        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl font-black text-gray-200 dark:text-gray-800 leading-none select-none">02</span>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">SWOT &amp; Competition</h2>
            <p className="text-sm text-gray-400 mt-0.5">Strengths, weaknesses, opportunities, threats — and who each company competes with</p>
          </div>
        </div>

        {/* SWOT sub-tabs */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(swotMeta) as Array<keyof typeof swotMeta>).map(k => {
            const m = swotMeta[k];
            const active = swotKey === k;
            return (
              <button key={k} onClick={() => setSwotKey(k)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-[0.1em] border transition-all ${
                  active ? m.btn : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-400"
                }`}>
                {m.label}
              </button>
            );
          })}
        </div>

        {/* SWOT side by side */}
        <div className="grid gap-5 mb-8" style={{ gridTemplateColumns: `repeat(${companies.length}, 1fr)` }}>
          {companies.map((c, i) => {
            const items: string[] = c.swot?.[swotKey] || [];
            const m = swotMeta[swotKey];
            return (
              <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                <div className={`h-1.5 ${m.bar}`} />
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i] }} />
                    <p className="text-base font-black text-gray-900 dark:text-white">{c.company_name}</p>
                  </div>
                  <ul className="space-y-2.5">
                    {items.length === 0
                      ? <li className="text-sm text-gray-400 italic">No data available</li>
                      : items.map((item, j) => (
                        <li key={j} className="flex items-start gap-2.5">
                          <span className={`text-base leading-none mt-0.5 shrink-0 font-black ${m.accent}`}>·</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Competitive threat map */}
        {companies.some(c => c.competitive_map?.length > 0) && (
          <>
            <p className="text-base font-black text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-tight">Competitive Threat Map</p>
            <div className="grid gap-5" style={{ gridTemplateColumns: `repeat(${companies.length}, 1fr)` }}>
              {companies.map((c, i) => (
                <div key={i} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i] }} />
                    <p className="text-base font-black text-gray-900 dark:text-white">{c.company_name} faces</p>
                  </div>
                  <div className="space-y-3">
                    {(c.competitive_map || []).slice(0, 4).map((comp: any, j: number) => (
                      <div key={j} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{comp.name}</span>
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                          comp.threat_level === "High" ? "bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400"
                          : comp.threat_level === "Medium" ? "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                          : "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400"
                        }`}>{comp.threat_level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ════════════════════════════════════════════════════════
          TILE 3 — VERDICT + AI ANALYST CHAT
          Ranked cards left, chat right
      ════════════════════════════════════════════════════════ */}
      <section className="w-full bg-white dark:bg-gray-950 px-8 py-8 flex-1">

        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl font-black text-gray-100 dark:text-gray-800 leading-none select-none">03</span>
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">Verdict &amp; AI Analyst</h2>
            <p className="text-sm text-gray-400 mt-0.5">Ranked by investment score — ask the analyst any comparative question</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-8 h-full">

          {/* Ranked verdict cards */}
          <div className="space-y-4">
            {ranked.map((c, rank) => {
              const origIdx = companies.findIndex(x => x.company_name === c.company_name);
              const color = colors[origIdx];
              return (
                <div key={rank} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                  <div className="flex items-start gap-5">
                    {/* Rank */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-lg" style={{ backgroundColor: color }}>
                      #{rank + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <p className="text-lg font-black text-gray-900 dark:text-white">{c.company_name}</p>
                        <span className={`text-sm font-black px-3 py-1 rounded-full ${verdictCls(c.verdict)}`}>{c.verdict}</span>
                        <span className="text-sm text-gray-400">{c.funding_stage}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                        {c.investment_reasoning || c.company_summary}
                      </p>
                      {/* Mini score strip */}
                      <div className="flex gap-6">
                        {[
                          { l: "Investment", k: "investment_score" },
                          { l: "Moat",       k: "moat_score" },
                          { l: "Timing",     k: "market_timing_score" },
                        ].map(m => (
                          <div key={m.k}>
                            <p className="text-xs text-gray-400 font-semibold mb-1">{m.l}</p>
                            <p className="text-lg font-black" style={{ color }}>{c[m.k] ?? "—"}<span className="text-xs font-normal text-gray-400">/10</span></p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Big score */}
                    <div className="text-right shrink-0">
                      <p className="text-4xl font-black leading-none" style={{ color }}>{c.investment_score}</p>
                      <p className="text-sm text-gray-400 mt-1">/10</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Analyst Chat */}
          <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "480px" }}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-base font-black text-gray-900 dark:text-white">Ask the Analyst</p>
              <span className="text-sm text-gray-400">· comparing {companies.length} companies</span>
            </div>
            <div className="flex-1 p-6 flex flex-col min-h-0">
              <CompareChat companies={companies} />
            </div>
          </div>

        </div>
      </section>

      {/* Add more companies / max reached */}
      <section className="w-full bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 px-8 py-6">
        {companies.length < 3 ? (
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-sm font-bold text-gray-600 dark:text-gray-400">
              Add {3 - companies.length} more company to compare:
            </p>
            <button
              onClick={() => {
                const names = companies.map((c: any) => c.company_name).join(",");
                router.push(`/company?q=${encodeURIComponent(names + ",")}`);
              }}
              className="flex items-center gap-2 text-sm font-black px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white transition-all"
            >
              + Add Company →
            </button>
            <p className="text-xs text-gray-400">Currently comparing {companies.length}/3 companies</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <span className="text-amber-500 font-bold">⚠</span>
            Maximum 3 companies for comparison reached.
          </p>
        )}
      </section>
      <div className="h-6 shrink-0" />
    </div>
  );
}
