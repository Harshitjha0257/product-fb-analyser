type Props = { verdict: string; confidence?: string; investmentScore?: number; productName?: string };

export default function VerdictBadge({ verdict, confidence, investmentScore, productName }: Props) {
  const isInvest = verdict === "INVEST";

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden mb-6 ${
      isInvest
        ? "bg-gradient-to-br from-emerald-950 via-gray-900 to-gray-900 dark:from-emerald-950 dark:via-gray-900 dark:to-gray-950 border border-emerald-800/60"
        : "bg-gradient-to-br from-red-950 via-gray-900 to-gray-900 dark:from-red-950 dark:via-gray-900 dark:to-gray-950 border border-red-800/60"
    }`}>
      {/* Glow accent */}
      <div className={`absolute top-0 left-0 w-1 h-full ${isInvest ? "bg-emerald-500" : "bg-red-500"}`} />

      <div className="flex items-center justify-between px-8 py-7 pl-10">
        {/* Left */}
        <div className="flex items-center gap-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ${
            isInvest
              ? "bg-emerald-500 text-white shadow-emerald-500/30"
              : "bg-red-500 text-white shadow-red-500/30"
          }`}>
            {isInvest ? "✓" : "✗"}
          </div>
          <div>
            {productName && (
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">{productName}</p>
            )}
            <p className="text-xs text-gray-500 uppercase tracking-[0.2em] font-semibold mb-1">Investor Verdict</p>
            <p className={`text-5xl font-black tracking-[0.15em] leading-none ${
              isInvest ? "text-emerald-400" : "text-red-400"
            }`}>
              {verdict}
            </p>
          </div>
        </div>

        {/* Right: score ring + confidence */}
        <div className="flex items-center gap-8">
          {investmentScore !== undefined && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Investment Score</p>
              <div className="flex items-baseline gap-0.5 justify-center">
                <span className={`text-5xl font-black ${isInvest ? "text-emerald-400" : "text-red-400"}`}>
                  {investmentScore}
                </span>
                <span className="text-lg text-gray-600 font-bold">/10</span>
              </div>
            </div>
          )}
          {confidence && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Confidence</p>
              <span className={`text-sm font-bold px-4 py-1.5 rounded-full border ${
                confidence === "High"
                  ? "border-emerald-700 text-emerald-400 bg-emerald-950"
                  : confidence === "Medium"
                  ? "border-yellow-700 text-yellow-400 bg-yellow-950"
                  : "border-gray-700 text-gray-400 bg-gray-900"
              }`}>
                {confidence}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}