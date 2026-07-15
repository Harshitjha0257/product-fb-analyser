"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScoreBar from "@/components/ScoreBar";
import ChatBox from "@/components/ChatBox";
import InvestmentGauge from "@/components/InvestmentGauge";
import ThemeToggle from "@/components/ThemeToggle";

type HistoryEntry = {
  id: string;
  companyName: string;
  verdict: string;
  investmentScore: number;
  timestamp: string;
  data: any;
};

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

function saveToHistory(analysis: any): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: analysis._id || Date.now().toString(),
    companyName: analysis.company_name || "Unknown",
    verdict: analysis.verdict || "PASS",
    investmentScore: analysis.investment_score || 0,
    timestamp: new Date().toISOString(),
    data: analysis,
  };
  try {
    const existing: HistoryEntry[] = JSON.parse(localStorage.getItem("company_history") || "[]");
    const filtered = existing.filter((e) => e.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, 20);
    localStorage.setItem("company_history", JSON.stringify(updated));
    return updated;
  } catch { return [entry]; }
}

/* ─── Verdict config ─── */
const VERDICT_CFG = {
  INVEST: {
    headerBg: "bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/5",
    border: "border-emerald-200 dark:border-emerald-900/60",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  WATCH: {
    headerBg: "bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-500/5",
    border: "border-amber-200 dark:border-amber-900/60",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  PASS: {
    headerBg: "bg-gradient-to-br from-red-500/10 to-transparent dark:from-red-500/5",
    border: "border-red-200 dark:border-red-900/60",
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800",
    dot: "bg-red-500",
    bar: "bg-red-500",
  },
};

/* ─── Score colors ─── */
const COLORS = { investment: "#3b82f6", moat: "#f97316", timing: "#a855f7" };

/* ─── Sub-components ─── */
function SectionDivider({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 pt-1 pb-1">
      <span className="text-xs font-mono text-gray-400 dark:text-gray-700 shrink-0">{num}</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 shrink-0">{title}</span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}

function SwotCell({ title, items, accent, bg }: { title: string; items: string[]; accent: string; bg: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
      <div className={`h-1 ${bg}`} />
      <div className="p-4">
        <p className={`text-xs font-black uppercase tracking-[0.2em] mb-3 ${accent}`}>{title}</p>
        <ul className="space-y-2">
          {(items || []).map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              <span className="shrink-0 mt-1 text-gray-400">·</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ThreatBadge({ level }: { level: string }) {
  const cls =
    level === "High" ? "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
    : level === "Medium" ? "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800"
    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${cls}`}>
      {level}
    </span>
  );
}

function StatRow({ label, value, definition, color }: { label: string; value: string; definition: string; color: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-500">{label}</p>
        <p className="text-[10px] text-gray-400 dark:text-gray-700 italic leading-snug mt-0.5">{definition}</p>
      </div>
      <span className={`text-sm font-bold ml-3 shrink-0 ${color}`}>{value}</span>
    </div>
  );
}

function MiniBar({ label, score, hexColor }: { label: string; score: number; hexColor: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { const t = setTimeout(() => setW((score / 10) * 100), 400); return () => clearTimeout(t); }, [score]);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 font-semibold">{label}</span>
        <span className="text-sm font-black" style={{ color: hexColor }}>
          {score}<span className="text-xs text-gray-400 dark:text-gray-700 font-normal">/10</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, backgroundColor: hexColor }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════ */
export default function CompanyResultPage() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem("company_result");
    if (!raw) { router.push("/company"); return; }
    const analysis = JSON.parse(raw);
    setData(analysis);
    setHistory(saveToHistory(analysis));
  }, []);

  if (!data) return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading analysis…</p>
      </div>
    </div>
  );

  const verdict = (data.verdict || "PASS") as "INVEST" | "WATCH" | "PASS";
  const vc = VERDICT_CFG[verdict] ?? VERDICT_CFG.PASS;

  const growthColor = data.growth_signal === "Accelerating" ? "text-emerald-600 dark:text-emerald-400"
    : data.growth_signal === "Steady" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  const revenueColor = data.revenue_signal === "Strong" ? "text-emerald-600 dark:text-emerald-400"
    : data.revenue_signal === "Moderate" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  const churnColor = data.churn_risk === "Low" ? "text-emerald-600 dark:text-emerald-400"
    : data.churn_risk === "Medium" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
  const exitColor = data.exit_potential === "IPO Candidate" ? "text-emerald-600 dark:text-emerald-400"
    : data.exit_potential === "Acquisition Target" ? "text-blue-600 dark:text-blue-400"
    : data.exit_potential === "PE Buyout" ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500";
  const confColor = data.confidence === "High" ? "text-emerald-600 dark:text-emerald-400"
    : data.confidence === "Medium" ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500";

  const companyChatPayload = (analysisData: any, msg: string, history: any[]) => ({
    company_name: analysisData.company_name ?? "",
    analysis: analysisData,
    message: msg,
    history,
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* Header */}
      <header className="h-14 shrink-0 flex items-center px-5 gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center">
            <span className="text-white text-xs font-black">CA</span>
          </div>
          <span className="text-sm font-bold hidden sm:block">Company Analyser</span>
        </div>

        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          {data.company_name && (
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{data.company_name}</span>
          )}
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${vc.badge}`}>{verdict}</span>
          <span className="text-base font-black">
            {data.investment_score}<span className="text-xs font-normal text-gray-400">/10</span>
          </span>
          <span className="hidden md:block text-xs text-gray-400">{data.confidence} confidence</span>
          {data.data_source === "autonomous_research" && (
            <span className="hidden md:flex items-center gap-1 text-[10px] font-semibold text-blue-500 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              AI Researched
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => router.push("/company")}
            className="text-xs font-semibold text-white bg-blue-500 hover:bg-blue-400 px-3 py-2 rounded-lg transition-all"
          >
            + New
          </button>
        </div>
      </header>

      {/* 3-column body */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left sidebar */}
        <aside className="hidden xl:flex w-52 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <button
              onClick={() => router.push("/company")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition-all"
            >
              + New Analysis
            </button>
          </div>
          <div className="px-4 pt-4 pb-2 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-600">Companies</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6 px-4 leading-relaxed">Analyses you run will appear here</p>
            )}
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setData(entry.data)}
                className="w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-black ${
                  entry.verdict === "INVEST" ? "bg-emerald-500" : entry.verdict === "WATCH" ? "bg-amber-500" : "bg-red-500"
                }`}>
                  {(entry.companyName || "?")[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">{entry.companyName}</p>
                  <p className={`text-[10px] font-bold ${
                    entry.verdict === "INVEST" ? "text-emerald-500" : entry.verdict === "WATCH" ? "text-amber-500" : "text-red-500"
                  }`}>{entry.verdict} · {entry.investmentScore}/10</p>
                  <p className="text-[10px] text-gray-400">{formatDate(entry.timestamp)}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">Groq · llama-3.1-8b</p>
          </div>
        </aside>

        {/* Center main */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-5 sm:p-6 space-y-6">

            {/* Verdict Banner */}
            <div className={`rounded-2xl overflow-hidden border ${vc.border}`}>
              <div className={`p-6 ${vc.headerBg}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    verdict === "INVEST" ? "bg-emerald-500" : verdict === "WATCH" ? "bg-amber-500" : "bg-red-500"
                  }`}>
                    <span className="text-white text-lg font-black">
                      {verdict === "INVEST" ? "✓" : verdict === "WATCH" ? "◎" : "✕"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">{data.company_name} · Investor Verdict</p>
                    <p className={`text-4xl font-black tracking-tight ${vc.text}`}>{verdict}</p>
                    {data.company_summary && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 leading-relaxed max-w-2xl">{data.company_summary}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-3xl font-black text-gray-900 dark:text-white">{data.investment_score}<span className="text-sm font-normal text-gray-400">/10</span></p>
                    <p className="text-xs text-gray-400 mt-1">{data.funding_stage || "Unknown stage"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 01 PERFORMANCE SCORES */}
            <section>
              <SectionDivider num="01" title="Performance Scores" />
              <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 space-y-5">
                <ScoreBar label="Investment Score" score={data.investment_score ?? 0} accentColor={COLORS.investment}
                  definition="Overall investability — how compelling is this as an investment opportunity"
                  reasoning={data.investment_reasoning} />
                <ScoreBar label="Moat Score" score={data.moat_score ?? 0} accentColor={COLORS.moat}
                  definition="Competitive defensibility — switching costs, network effects, data advantages"
                  reasoning={data.moat_reasoning} />
                <ScoreBar label="Market Timing Score" score={data.market_timing_score ?? 0} accentColor={COLORS.timing}
                  definition="Is the market ready? Too early, right on time, or too late?"
                  reasoning={data.market_timing_reasoning} />
              </div>
            </section>

            {/* 02 SWOT ANALYSIS */}
            <section>
              <SectionDivider num="02" title="SWOT Analysis" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <SwotCell title="Strengths" items={data.swot?.strengths} accent="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500" />
                <SwotCell title="Weaknesses" items={data.swot?.weaknesses} accent="text-red-600 dark:text-red-400" bg="bg-red-500" />
                <SwotCell title="Opportunities" items={data.swot?.opportunities} accent="text-blue-600 dark:text-blue-400" bg="bg-blue-500" />
                <SwotCell title="Threats" items={data.swot?.threats} accent="text-orange-600 dark:text-orange-400" bg="bg-orange-500" />
              </div>
            </section>

            {/* 03 COMPETITIVE THREAT MAP */}
            {data.competitive_map?.length > 0 && (
              <section>
                <SectionDivider num="03" title="Competitive Threat Map" />
                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto] text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800">
                    <span>Competitor · Positioning</span>
                    <span>Threat</span>
                  </div>
                  {data.competitive_map.map((c: any, i: number) => (
                    <div key={i} className="flex items-start justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 last:border-0 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{c.positioning}</p>
                      </div>
                      <ThreatBadge level={c.threat_level} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 04 INVESTMENT THESIS */}
            <section>
              <SectionDivider num="04" title="Investment Thesis" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-gray-900">
                  <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Bull Case</p>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-3">The optimistic scenario — what must be true for this to be a massive winner</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{data.bull_case ?? "—"}</p>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-900">
                  <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em]">Bear Case</p>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-3">The pessimistic scenario — what realistic risks could destroy the thesis</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{data.bear_case ?? "—"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 05 KEY RISKS */}
            {data.key_risks?.length > 0 && (
              <section>
                <SectionDivider num="05" title="Key Risks" />
                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <ul className="space-y-3">
                    {data.key_risks.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="shrink-0 w-5 h-5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-red-500 text-xs font-black flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{r}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* 06 TAM SIGNAL */}
            {data.tam_signal && (
              <section>
                <SectionDivider num="06" title="Market Opportunity" />
                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <p className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.2em] mb-2">TAM Signal</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.tam_signal}</p>
                </div>
              </section>
            )}

            {/* 07 DUE DILIGENCE */}
            {data.follow_up_questions?.length > 0 && (
              <section>
                <SectionDivider num="07" title="Due Diligence Questions" />
                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 italic mb-5">Questions a VC partner would demand answers to before signing a term sheet</p>
                  <ol className="space-y-4">
                    {data.follow_up_questions.map((q: string, i: number) => (
                      <li key={i} className="flex gap-4">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-yellow-50 dark:bg-yellow-950/80 border border-yellow-200 dark:border-yellow-800/60 text-yellow-700 dark:text-yellow-500 text-xs font-black flex items-center justify-center mt-0.5">
                          {i + 1}
                        </span>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{q}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}

            {/* 08 ASK THE ANALYST */}
            <section>
              <SectionDivider num="08" title="Ask the Analyst" />
              <div className="mt-4">
                <ChatBox
                  analysisData={data}
                  suggestedQuestions={data.follow_up_questions ?? []}
                  analysisId={data._id}
                  apiEndpoint="https://product-fb-analyser.onrender.com/company-chat"
                  buildPayload={companyChatPayload}
                />
              </div>
            </section>

            <div className="pb-4" />
          </div>
        </main>

        {/* Right panel */}
        <aside className="hidden lg:flex w-80 xl:w-[340px] shrink-0 flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">

          {/* Gauge */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Investment Summary</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${vc.badge}`}>{data.confidence}</span>
            </div>
            <div className="flex justify-center mb-4">
              <InvestmentGauge score={data.investment_score ?? 0} verdict={verdict} />
            </div>
            <div className="space-y-2.5 border-t border-gray-100 dark:border-gray-800 pt-3">
              <MiniBar label="Moat Score" score={data.moat_score ?? 0} hexColor={COLORS.moat} />
              <MiniBar label="Market Timing" score={data.market_timing_score ?? 0} hexColor={COLORS.timing} />
              <MiniBar label="Investment" score={data.investment_score ?? 0} hexColor={COLORS.investment} />
            </div>
          </div>

          {/* Key Stats */}
          <div className="p-4 overflow-y-auto flex-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Key Stats</p>
            <StatRow label="Funding Stage" value={data.funding_stage ?? "—"} definition="Estimated stage based on public signals" color="text-blue-600 dark:text-blue-400" />
            <StatRow label="Growth Signal" value={data.growth_signal ?? "—"} definition="Adoption momentum — accelerating, steady, or declining" color={growthColor} />
            <StatRow label="Revenue Signal" value={data.revenue_signal ?? "—"} definition="Quality and durability of revenue" color={revenueColor} />
            <StatRow label="Churn Risk" value={data.churn_risk ?? "—"} definition="Risk of customer cancellation" color={churnColor} />
            <StatRow label="Exit Potential" value={data.exit_potential ?? "—"} definition="Likely liquidity event — IPO, acquisition, PE, or too early" color={exitColor} />
            <StatRow label="Confidence" value={data.confidence ?? "—"} definition="How certain the model is given available data" color={confColor} />
          </div>

        </aside>

      </div>
    </div>
  );
}
