"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ThemeToggle from "@/components/ThemeToggle";

const OUTPUTS = [
  "Investment Score",
  "PMF Score",
  "Moat Score",
  "Sentiment Score",
  "Retention Score",
  "Bull & Bear Case",
  "Risk Analysis",
  "Exit Potential",
  "AI Analyst Chat",
  "TAM Signal",
];

const FEATURES = [
  {
    icon: "◎",
    label: "5 Scored Dimensions",
    desc: "Investment, PMF, Sentiment, Moat, and Retention — each with a score and plain-English explanation of what it means.",
  },
  {
    icon: "⇅",
    label: "Bull & Bear Case",
    desc: "Separate investment thesis and downside scenario, grounded in the actual feedback you provide.",
  },
  {
    icon: "◈",
    label: "RAG-Augmented",
    desc: "Retrieves VC frameworks (PMF theory, moat models, churn analysis) before generating — grounded, not generic.",
  },
  {
    icon: "⟡",
    label: "AI Analyst Chat",
    desc: "Ask follow-up questions on the analysis. Full context of the feedback and results is retained.",
  },
  {
    icon: "◑",
    label: "Market Intelligence",
    desc: "Market signal, TAM signal, and moat signal — three dimensions of opportunity and defensibility.",
  },
  {
    icon: "⊕",
    label: "Investment Memo",
    desc: "Comparable company, investor summary, and 3 due diligence questions every analyst should ask.",
  },
];

export default function Home() {
  const [productName, setProductName] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const analyse = async () => {
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("http://localhost:8000/analyse", {
        feedback,
        product_name: productName,
      });
      const _id = Date.now().toString();
      sessionStorage.setItem("result", JSON.stringify({ ...res.data, _feedback: feedback, _id }));
      router.push("/result");
    } catch {
      setError("Something went wrong. Is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">

      {/* ── Header ── */}
      <header className="w-full border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-bold tracking-tight text-gray-900 dark:text-white">
            FeedbackAnalyser
          </span>
          <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 font-medium uppercase tracking-widest">
            Investor Lens
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="/company"
            className="text-xs font-semibold text-blue-500 hover:text-blue-400 border border-blue-200 dark:border-blue-800 hover:border-blue-400 rounded-lg px-3 py-1.5 transition-all"
          >
            Company Analyser →
          </a>
          <span className="hidden md:block text-xs text-gray-400 uppercase tracking-widest">
            Groq · llama-3.3-70b · RAG
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-14">

        {/* Badge row */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {["Groq", "llama-3.3-70b", "RAG-Augmented", "VC-Grade Frameworks"].map((tag) => (
            <span
              key={tag}
              className="text-xs font-semibold text-gray-500 border border-gray-300 dark:border-gray-700 rounded-full px-3 py-1"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Headline */}
        <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-4 max-w-3xl text-gray-900 dark:text-white">
          Turn User Feedback Into<br />
          <span className="text-emerald-500 dark:text-emerald-400">Investment Analysis</span>
        </h1>

        <p className="text-center text-gray-500 text-base max-w-xl leading-relaxed mb-10">
          Paste raw user feedback — reviews, NPS comments, support tickets. Get a full scored investment analysis with bull &amp; bear case, risk flags, and an AI analyst you can question.
        </p>

        {/* ── Form card ── */}
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none">

            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">
              Product Name
            </label>
            <input
              className="w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-2.5 mb-5 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400"
              placeholder="e.g. Linear, Notion, Figma, Slack..."
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />

            <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">
              User Feedback
            </label>
            <textarea
              className="w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4 resize-none focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-400 leading-relaxed"
              rows={8}
              placeholder={"Paste raw user feedback here...\n\nApp store reviews · Survey responses · Support tickets\nUser interview notes · NPS comments · G2 / Capterra reviews"}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />

            {/* What you get */}
            <div className="mt-3 mb-4">
              <p className="text-xs text-gray-400 uppercase tracking-[0.15em] font-semibold mb-2">
                You&apos;ll receive
              </p>
              <div className="flex flex-wrap gap-1.5">
                {OUTPUTS.map((o) => (
                  <span
                    key={o}
                    className="text-xs font-medium text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-800 rounded-full px-2.5 py-1"
                  >
                    {o}
                  </span>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

            <button
              onClick={analyse}
              disabled={loading || !feedback.trim()}
              className="w-full py-4 rounded-xl font-black text-sm tracking-[0.1em] uppercase transition-all
                bg-emerald-500 hover:bg-emerald-400 text-white
                disabled:opacity-30 disabled:cursor-not-allowed
                shadow-lg shadow-emerald-500/20"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analysing feedback...
                </span>
              ) : "Generate Investment Analysis →"}
            </button>

          </div>
        </div>

        {/* ── Tool switcher ── */}
        <div className="w-full max-w-2xl mt-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-widest">or try</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          </div>
          <a
            href="/company"
            className="group flex items-start gap-4 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600 rounded-2xl p-5 transition-all hover:shadow-md hover:shadow-blue-500/10"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
              <span className="text-blue-500 text-lg font-black">⊙</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-bold text-gray-900 dark:text-white">Company Analyser</p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 border border-blue-200 dark:border-blue-800 rounded px-1.5 py-0.5">New</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Type any company name — AI fetches funding, reviews, competitors &amp; market signals automatically. No data pasting required.
              </p>
              <p className="text-xs text-blue-500 font-semibold mt-2 group-hover:underline">Open Company Analyser →</p>
            </div>
          </a>
        </div>

        {/* ── Features grid ── */}
        <div className="w-full max-w-2xl mt-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400 text-center mb-4">
            What&apos;s inside every analysis
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg text-emerald-500 leading-none">{f.icon}</span>
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{f.label}</p>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-[0.2em]">
          Powered by Groq · llama-3.3-70b-versatile · RAG-augmented · Investor POV
        </p>
      </footer>

    </div>
  );
}
