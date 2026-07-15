"use client";
import { useState } from "react";
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

const OUTPUTS = [
  "SWOT Analysis", "Moat Score", "Market Timing Score",
  "Competitive Threat Map", "Bull & Bear Case",
  "Investment Verdict", "Due Diligence Questions", "AI Analyst Chat",
];

export default function CompanyPage() {
  const [companyName, setCompanyName] = useState("");
  const [rawData, setRawData] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const router = useRouter();

  const isManualMode = rawData.trim().length > 0;
  const companyList = companyName.split(/,|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
  const isCompareMode = companyList.length > 1;

  const analyse = async () => {
    if (!companyName.trim()) return;
    setLoading(true);
    setError("");
    setStep(0);

    let ticker = 0;
    const interval = !isManualMode
      ? setInterval(() => {
          ticker += 1;
          setStep(Math.min(ticker, STEPS.length - 1));
        }, 3500)
      : null;

    try {
      const res = await axios.post("http://localhost:8000/analyse-company", {
        company_name: companyName.trim(),
        raw_data: rawData.trim() || null,
      });
      const _id = Date.now().toString();
      if (res.data.mode === "compare") {
        sessionStorage.setItem("compare_result", JSON.stringify({ ...res.data, _id }));
        router.push("/company/compare");
      } else {
        sessionStorage.setItem("company_result", JSON.stringify({ ...res.data, _id }));
        router.push("/company/result");
      }
    } catch {
      setError("Something went wrong. Is the backend running on port 8000?");
    } finally {
      if (interval) clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">

      {/* Header */}
      <header className="w-full border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-bold tracking-tight">Company Analyser</span>
          <span className="text-xs text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-2 py-0.5 font-medium uppercase tracking-widest">
            Investment Grade
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ← Feedback Analyser
          </button>
          <TokenBar />
          <ThemeToggle />
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-14">

        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {["Groq · llama-3.3-70b", "Tavily Web Research", "Autonomous AI Agent", "Investment Grade"].map((tag) => (
            <span key={tag} className="text-xs font-semibold text-gray-500 border border-gray-300 dark:border-gray-700 rounded-full px-3 py-1">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-center text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] mb-4 max-w-3xl">
          Type a Company Name.<br />
          <span className="text-blue-500 dark:text-blue-400">AI Researches Everything.</span>
        </h1>

        <p className="text-center text-gray-500 text-base max-w-xl leading-relaxed mb-10">
          Enter any company name or URL. The AI fetches funding history, reviews, competitors, and market signals — then generates a full investment-grade brief automatically.
        </p>

        {/* Form card */}
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none space-y-5">

            {/* Company name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500 block mb-1.5">
                Company Name <span className="text-blue-500">*</span>
              </label>
              <input
                className="w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-gray-800 px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-gray-400"
                placeholder="e.g. Notion, Linear, Stripe, Figma, OpenAI..."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyse()}
                disabled={loading}
              />
            </div>

            {/* Mode indicator */}
            <div className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
              isManualMode
                ? "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400"
                : "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isManualMode ? "bg-purple-500" : "bg-blue-500"}`} />
              {isManualMode
                ? "Manual mode — AI will analyse your pasted data"
                : "AI Research mode — autonomously fetches news, reviews, funding, competitors"}
            </div>

            {/* Raw data toggle */}
            <div>
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1.5 transition-colors"
              >
                <span className={`transition-transform ${showRaw ? "rotate-90" : ""}`}>▶</span>
                {showRaw ? "Hide" : "Paste raw data instead"} — reviews, reports, notes (optional)
              </button>

              {showRaw && (
                <div className="mt-3">
                  <textarea
                    className="w-full bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-200 text-sm rounded-xl border border-gray-200 dark:border-gray-800 p-4 resize-none focus:outline-none focus:border-purple-500 transition-colors placeholder:text-gray-400 leading-relaxed"
                    rows={6}
                    placeholder={"Paste any raw data about this company...\n\nG2 reviews · Crunchbase notes · News articles · Competitor teardowns · Annual reports"}
                    value={rawData}
                    onChange={(e) => setRawData(e.target.value)}
                    disabled={loading}
                  />
                  {rawData && (
                    <button
                      onClick={() => setRawData("")}
                      className="text-xs text-gray-400 hover:text-red-500 transition-colors mt-1"
                    >
                      Clear → switch back to AI Research mode
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Output chips */}
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-[0.15em] font-semibold mb-2">You'll receive</p>
              <div className="flex flex-wrap gap-1.5">
                {OUTPUTS.map((o) => (
                  <span key={o} className="text-xs font-medium text-gray-500 dark:text-gray-500 border border-gray-200 dark:border-gray-800 rounded-full px-2.5 py-1">
                    {o}
                  </span>
                ))}
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            {/* Submit */}
            <button
              onClick={analyse}
              disabled={loading || !companyName.trim()}
              className="w-full py-4 rounded-xl font-black text-sm tracking-[0.1em] uppercase transition-all bg-blue-500 hover:bg-blue-400 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="flex flex-col items-center gap-2">
                  <span className="flex items-center gap-2.5">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {isManualMode ? "Analysing data..." : STEPS[step]}
                  </span>
                  {!isManualMode && (
                    <span className="flex gap-1">
                      {STEPS.map((_, i) => (
                        <span
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                            i <= step ? "bg-white" : "bg-white/30"
                          }`}
                        />
                      ))}
                    </span>
                  )}
                </span>
              ) : (
                isManualMode
                  ? "Analyse This Data →"
                  : isCompareMode
                  ? `Compare ${companyList.length} Companies with AI →`
                  : `Research ${companyName.trim() || "Company"} with AI →`
              )}
            </button>

          </div>
        </div>
      </main>

      <footer className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 text-center">
        <p className="text-xs text-gray-400 uppercase tracking-[0.2em]">
          Powered by Groq · llama-3.3-70b · Tavily Web Research
        </p>
      </footer>
    </div>
  );
}
