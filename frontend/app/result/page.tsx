"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import VerdictBadge from "@/components/VerdictBadge";
import RadarChart from "@/components/RadarChart";
import ScoreBar from "@/components/ScoreBar";
import RiskFlags from "@/components/RiskFlags";
import ChatBox from "@/components/ChatBox";
import ThemeToggle from "@/components/ThemeToggle";
import InvestmentGauge from "@/components/InvestmentGauge";

/* ─── types ─── */
type HistoryEntry = {
  id: string;
  productName: string;
  verdict: string;
  investmentScore: number;
  confidence: string;
  timestamp: string;
  data: any;
};

/* ─── helpers ─── */
function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return "—"; }
}

function saveToHistory(analysis: any): HistoryEntry[] {
  const entry: HistoryEntry = {
    id: analysis._id || Date.now().toString(),
    productName: analysis.product_name || "—",
    verdict: analysis.verdict || "PASS",
    investmentScore: analysis.investment_score || 0,
    confidence: analysis.confidence || "—",
    timestamp: new Date().toISOString(),
    data: analysis,
  };
  try {
    const existing: HistoryEntry[] = JSON.parse(localStorage.getItem("fb_history") || "[]");
    const filtered = existing.filter((e) => e.id !== entry.id);
    const updated = [entry, ...filtered].slice(0, 20);
    localStorage.setItem("fb_history", JSON.stringify(updated));
    return updated;
  } catch { return [entry]; }
}

/* ─── term definitions ─── */
const DEF = {
  investment_score: "Overall investability — how compelling is this as an investment opportunity",
  pmf_score: "Product-Market Fit — how urgently customers need this. 'Must-have' scores highest",
  sentiment_score: "Emotional tone of user feedback — are customers genuinely happy or frustrated?",
  moat_score: "Competitive defensibility — switching costs, network effects, data advantages",
  retention_score: "Likelihood users stay long-term — will they keep renewing or look for alternatives?",
  churn_risk: "Risk of customers cancelling — Low = customers are sticky",
  revenue_signal: "Quality of revenue — is it recurring, growing, or at risk of declining?",
  growth_signal: "Adoption momentum — is the product accelerating, steady, or declining?",
  exit_potential: "Likely liquidity event — IPO, acquisition, PE buyout, or too early",
  market_signal: "How strongly the market is pulling demand for this product",
  moat_signal: "How defensible the competitive position is — can rivals copy this easily?",
  tam_signal: "Total Addressable Market — how large is the revenue ceiling?",
  bull: "The optimistic scenario — what must be true for this to be a massive winner",
  bear: "The pessimistic scenario — what realistic risks could destroy the thesis",
  key_metrics: "Specific observations extracted directly from the user feedback provided",
  investor_summary: "Bottom-line recommendation grounded in VC frameworks and the feedback",
  follow_up: "Questions a VC partner would demand answers to before signing a term sheet",
};

/* ─── colour helpers ─── */
function sc(n: number): "green" | "yellow" | "red" {
  return n >= 7 ? "green" : n >= 4 ? "yellow" : "red";
}
function lmhTxt(v: string) {
  return v === "Low" ? "text-emerald-600 dark:text-emerald-400"
    : v === "Medium" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
}
function smwTxt(v: string) {
  return v === "Strong" ? "text-emerald-600 dark:text-emerald-400"
    : v === "Moderate" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
}
function growthTxt(v: string) {
  return v === "Accelerating" ? "text-emerald-600 dark:text-emerald-400"
    : v === "Steady" ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";
}
function confTxt(v: string) {
  return v === "High" ? "text-emerald-600 dark:text-emerald-400"
    : v === "Medium" ? "text-yellow-600 dark:text-yellow-400" : "text-gray-500";
}

/* ─── sub-components ─── */
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

function SignalCard({ label, value, definition, accent }: {
  label: string; value: string; definition: string; accent: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <p className={`text-xs font-black uppercase tracking-[0.2em] mb-2 ${accent}`}>{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-2">{value}</p>
      <p className="text-xs text-gray-500 italic leading-snug">{definition}</p>
    </div>
  );
}

function StatRow({ label, value, definition, color }: {
  label: string; value: string; definition: string; color: string;
}) {
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

function MiniBar({ label, score, max = 10, colorClass, hexColor }: {
  label: string; score: number; max?: number; colorClass: string; hexColor?: string;
}) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((score / max) * 100), 400);
    return () => clearTimeout(t);
  }, [score, max]);
  const fill = hexColor || (
    colorClass.includes("emerald") ? "#10b981"
    : colorClass.includes("yellow") ? "#f59e0b" : "#ef4444"
  );
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500 font-semibold">{label}</span>
        <span className={`text-sm font-black ${hexColor ? "" : colorClass}`} style={hexColor ? { color: hexColor } : undefined}>
          {score}<span className="text-xs text-gray-400 dark:text-gray-700 font-normal">/{max}</span>
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${w}%`, backgroundColor: fill }} />
      </div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800">
      {children}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════ */
export default function ResultPage() {
  const [data, setData] = useState<any>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const router = useRouter();

  useEffect(() => {
    const raw = sessionStorage.getItem("result");
    if (!raw) { router.push("/"); return; }
    const analysis = JSON.parse(raw);
    setData(analysis);
    const updated = saveToHistory(analysis);
    setHistory(updated);
  }, []);

  /* When clicking a sidebar entry — load that analysis */
  const loadEntry = (entry: HistoryEntry) => {
    setData(entry.data);
  };

  if (!data) return (
    <div className="h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">Loading analysis…</p>
      </div>
    </div>
  );

  const exitColor =
    data.exit_potential === "IPO Candidate" ? "text-emerald-600 dark:text-emerald-400"
    : data.exit_potential === "Acquisition Target" ? "text-blue-600 dark:text-blue-400"
    : data.exit_potential === "PE Buyout" ? "text-yellow-600 dark:text-yellow-400"
    : "text-gray-500";

  const miniColor = (n: number) =>
    n >= 7 ? "text-emerald-600 dark:text-emerald-400"
    : n >= 4 ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400";

  const SCORE_COLORS = {
    investment: "#3b82f6",
    pmf:        "#10b981",
    sentiment:  "#a855f7",
    moat:       "#f97316",
    retention:  "#06b6d4",
  };

  const radarColors = [
    SCORE_COLORS.investment,
    SCORE_COLORS.pmf,
    SCORE_COLORS.sentiment,
    SCORE_COLORS.moat,
    SCORE_COLORS.retention,
  ];

  const radarDimensions = [
    { label: "Invest", value: data.investment_score ?? 0, max: 10 },
    { label: "PMF",    value: data.pmf_score ?? 0,        max: 10 },
    { label: "Sentim", value: data.sentiment_score ?? 0,  max: 10 },
    { label: "Moat",   value: data.moat_score ?? 0,       max: 10 },
    { label: "Retain", value: data.retention_score ?? 0,  max: 10 },
  ];

  const isInvest = data.verdict === "INVEST";

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">

      {/* ══ Top header bar ══ */}
      <header className="h-14 shrink-0 flex items-center px-5 gap-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-xs font-black">FA</span>
          </div>
          <span className="text-sm font-bold text-gray-900 dark:text-white hidden sm:block">
            FeedbackAnalyser
          </span>
        </div>

        {/* Center summary */}
        <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
          {data.product_name && (
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
              {data.product_name}
            </span>
          )}
          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
            isInvest
              ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
          }`}>
            {data.verdict}
          </span>
          <span className="text-base font-black text-gray-900 dark:text-white">
            {data.investment_score}
            <span className="text-xs font-normal text-gray-400">/10</span>
          </span>
          <span className="hidden md:block text-xs text-gray-400">{data.confidence} confidence</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => router.push("/")}
            className="text-xs font-semibold text-white bg-emerald-500 hover:bg-emerald-400 px-3 py-2 rounded-lg transition-all"
          >
            + New
          </button>
        </div>
      </header>

      {/* ══ 3-column body ══ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ════ LEFT SIDEBAR (xl+) ════ */}
        <aside className="hidden xl:flex w-52 shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">

          {/* New analysis button */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <button
              onClick={() => router.push("/")}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all"
            >
              + New Analysis
            </button>
          </div>

          {/* Section label */}
          <div className="px-4 pt-4 pb-2 shrink-0">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 dark:text-gray-600">
              Analyses
            </p>
          </div>

          {/* History list */}
          <div className="flex-1 overflow-y-auto">
            {history.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-6 px-4 leading-relaxed">
                Analyses you run will appear here
              </p>
            )}
            {history.map((entry) => {
              const isActive = entry.id === data._id;
              const initial = (entry.productName || "?")[0].toUpperCase();
              return (
                <button
                  key={entry.id}
                  onClick={() => loadEntry(entry)}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors border-b border-gray-100 dark:border-gray-900 ${
                    isActive
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-black ${
                    entry.verdict === "INVEST" ? "bg-emerald-500" : "bg-red-500"
                  }`}>
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                      {entry.productName}
                    </p>
                    <p className={`text-[10px] font-bold ${entry.verdict === "INVEST" ? "text-emerald-500" : "text-red-500"}`}>
                      {entry.verdict} · {entry.investmentScore}/10
                    </p>
                    <p className="text-[10px] text-gray-400">{formatDate(entry.timestamp)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <p className="text-[10px] text-gray-400 text-center uppercase tracking-widest">
              Groq · llama-3.1-8b
            </p>
          </div>
        </aside>

        {/* ════ CENTER MAIN ════ */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="p-5 sm:p-6 space-y-6">

            {/* Verdict Banner */}
            <VerdictBadge
              verdict={data.verdict}
              confidence={data.confidence}
              investmentScore={data.investment_score}
              productName={data.product_name}
            />

            {/* Verdict Legend */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { v: "INVEST", range: "7–10", desc: "Strong conviction — compelling investment opportunity with clear PMF and growth signals.", color: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30", badge: "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300" },
                { v: "WATCH",  range: "4–6",  desc: "Promising but not proven — monitor the space and wait for stronger signals before committing.", color: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30", badge: "bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300" },
                { v: "PASS",   range: "1–3",  desc: "Weak fundamentals or poor PMF — not a compelling opportunity at this stage.", color: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30", badge: "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" },
              ].map(({ v, range, desc, color, badge }) => (
                <div key={v} className={`rounded-xl border p-3 ${color} ${data.verdict === v ? "ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-950 " + (v === "INVEST" ? "ring-emerald-400" : v === "WATCH" ? "ring-yellow-400" : "ring-red-400") : "opacity-60"}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badge}`}>{v}</span>
                    <span className="text-[10px] text-gray-400 font-mono">{range}/10</span>
                    {data.verdict === v && <span className="ml-auto text-[10px] font-black text-gray-500 dark:text-gray-400">← THIS RESULT</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">{desc}</p>
                </div>
              ))}
            </div>

            {/* 01 PERFORMANCE SCORECARD */}
            <section>
              <SectionDivider num="01" title="Performance Scorecard" />
              <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 items-center">
                  <div className="flex flex-col items-center gap-2">
                    <RadarChart dimensions={radarDimensions} size={220} colors={radarColors} />
                    <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-[180px]">
                      Each axis = one score. The bigger the shape, the stronger the product overall.
                    </p>
                  </div>
                  <div className="space-y-5">
                    <ScoreBar label="Investment Score" score={data.investment_score ?? 0} color={sc(data.investment_score ?? 0)} accentColor={SCORE_COLORS.investment} definition={DEF.investment_score} reasoning={data.score_reasoning?.investment} />
                    <ScoreBar label="PMF Score"        score={data.pmf_score ?? 0}        color={sc(data.pmf_score ?? 0)}        accentColor={SCORE_COLORS.pmf}        definition={DEF.pmf_score}        reasoning={data.score_reasoning?.pmf} />
                    <ScoreBar label="Sentiment Score"  score={data.sentiment_score ?? 0}  color={sc(data.sentiment_score ?? 0)}  accentColor={SCORE_COLORS.sentiment}  definition={DEF.sentiment_score}  reasoning={data.score_reasoning?.sentiment} />
                    <ScoreBar label="Moat Score"       score={data.moat_score ?? 0}       color={sc(data.moat_score ?? 0)}       accentColor={SCORE_COLORS.moat}       definition={DEF.moat_score} />
                    <ScoreBar label="Retention Score"  score={data.retention_score ?? 0}  color={sc(data.retention_score ?? 0)}  accentColor={SCORE_COLORS.retention}  definition={DEF.retention_score} />
                  </div>
                </div>
              </div>
            </section>

            {/* 02 MARKET INTELLIGENCE */}
            <section>
              <SectionDivider num="02" title="Market Intelligence" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SignalCard label="Market Signal" value={data.market_signal ?? "—"} definition={DEF.market_signal} accent="text-emerald-600 dark:text-emerald-500" />
                <SignalCard label="Moat Signal"   value={data.moat_signal ?? "—"}   definition={DEF.moat_signal}   accent="text-blue-600 dark:text-blue-400" />
                <SignalCard label="TAM Signal"    value={data.tam_signal ?? "—"}    definition={DEF.tam_signal}    accent="text-purple-600 dark:text-purple-400" />
              </div>
            </section>

            {/* 03 INVESTMENT THESIS */}
            <section>
              <SectionDivider num="03" title="Investment Thesis" />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-gray-900">
                  <div className="h-0.5 bg-gradient-to-r from-emerald-500 to-emerald-400" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em]">Bull Case</p>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-3">{DEF.bull}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{data.investment_thesis ?? "—"}</p>
                  </div>
                </div>
                <div className="rounded-2xl overflow-hidden border border-red-200 dark:border-red-900/60 bg-white dark:bg-gray-900">
                  <div className="h-0.5 bg-gradient-to-r from-red-500 to-red-400" />
                  <div className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em]">Bear Case</p>
                    </div>
                    <p className="text-xs text-gray-400 italic mb-3">{DEF.bear}</p>
                    <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{data.bear_case ?? "—"}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 04 RISK ANALYSIS */}
            <section>
              <SectionDivider num="04" title="Risk Analysis" />
              <div className="mt-4">
                <RiskFlags strengths={data.strengths} risks={data.risk_flags} />
              </div>
            </section>

            {/* 05 KEY OBSERVATIONS */}
            {data.key_metrics?.length > 0 && (
              <section>
                <SectionDivider num="05" title="Key Observations" />
                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 italic mb-4">{DEF.key_metrics}</p>
                  <div className="flex flex-wrap gap-2">
                    {data.key_metrics.map((m: string, i: number) => <Pill key={i}>{m}</Pill>)}
                  </div>
                </div>
              </section>
            )}

            {/* 06 INVESTMENT MEMO */}
            <section>
              <SectionDivider num="06" title="Investment Memo" />
              <div className="mt-4 space-y-4">
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                  <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] mb-2">Comparable</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{data.comparable ?? "—"}</p>
                </div>
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Investor Summary</p>
                  <p className="text-xs text-gray-400 italic mb-4">{DEF.investor_summary}</p>
                  <p className="text-base text-gray-800 dark:text-gray-100 leading-8 font-medium">{data.investor_summary ?? "—"}</p>
                </div>
              </div>
            </section>

            {/* 07 DUE DILIGENCE */}
            {data.follow_up_questions?.length > 0 && (
              <section>
                <SectionDivider num="07" title="Due Diligence Questions" />
                <div className="mt-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5">
                  <p className="text-xs text-gray-500 italic mb-5">{DEF.follow_up}</p>
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

            {/* Chat — always visible in main content */}
            <section>
              <SectionDivider num="08" title="Ask the Analyst" />
              <div className="mt-4">
                <ChatBox analysisData={data} suggestedQuestions={data.follow_up_questions ?? []} analysisId={data._id} />
              </div>
            </section>

            <div className="pb-4" />
          </div>
        </main>

        {/* ════ RIGHT PANEL (lg+) ════ */}
        <aside className="hidden lg:flex w-80 xl:w-[340px] shrink-0 flex-col border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden">

          {/* Investment Summary */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Investment Summary</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isInvest
                  ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
                  : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400"
              }`}>
                {data.confidence}
              </span>
            </div>
            <div className="flex justify-center mb-4">
              <InvestmentGauge score={data.investment_score ?? 0} verdict={data.verdict} />
            </div>
            <div className="space-y-2.5 border-t border-gray-100 dark:border-gray-800 pt-3">
              <MiniBar label="PMF"       score={data.pmf_score ?? 0}       colorClass={miniColor(data.pmf_score ?? 0)}       hexColor="#10b981" />
              <MiniBar label="Moat"      score={data.moat_score ?? 0}      colorClass={miniColor(data.moat_score ?? 0)}      hexColor="#f97316" />
              <MiniBar label="Retention" score={data.retention_score ?? 0} colorClass={miniColor(data.retention_score ?? 0)} hexColor="#06b6d4" />
              <MiniBar label="Sentiment" score={data.sentiment_score ?? 0} colorClass={miniColor(data.sentiment_score ?? 0)} hexColor="#a855f7" />
            </div>
          </div>

          {/* Key Stats */}
          <div className="p-4 shrink-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Key Stats</p>
            <div>
              <StatRow label="Churn Risk"     value={data.churn_risk ?? "—"}      definition={DEF.churn_risk}     color={lmhTxt(data.churn_risk ?? "")} />
              <StatRow label="Revenue Signal" value={data.revenue_signal ?? "—"}  definition={DEF.revenue_signal} color={smwTxt(data.revenue_signal ?? "")} />
              <StatRow label="Growth Signal"  value={data.growth_signal ?? "—"}   definition={DEF.growth_signal}  color={growthTxt(data.growth_signal ?? "")} />
              <StatRow label="Exit Potential" value={data.exit_potential ?? "—"}  definition={DEF.exit_potential} color={exitColor} />
              <StatRow label="Confidence"     value={data.confidence ?? "—"}      definition="How certain the model is given the feedback quality" color={confTxt(data.confidence ?? "")} />
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}
