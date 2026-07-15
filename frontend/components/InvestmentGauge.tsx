type Props = {
  score: number;
  max?: number;
  verdict: string;
};

export default function InvestmentGauge({ score, max = 10, verdict }: Props) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 74;
  const circumference = 2 * Math.PI * r;
  const arcDeg = 260;
  const totalArc = (arcDeg / 360) * circumference;
  const filledArc = (Math.min(Math.max(score, 0), max) / max) * totalArc;

  const strokeColor =
    score >= 7 ? "#10b981" : score >= 4 ? "#f59e0b" : "#ef4444";

  const isInvest = verdict === "INVEST";
  const verdictColor = isInvest ? "text-emerald-500" : "text-red-500";

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background arc — currentColor so it responds to dark/light mode */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-800"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={`${totalArc} ${circumference - totalArc}`}
            transform={`rotate(140, ${cx}, ${cy})`}
          />
          {/* Score fill arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={strokeColor}
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={`${filledArc} ${circumference - filledArc}`}
            transform={`rotate(140, ${cx}, ${cy})`}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[48px] font-black text-gray-900 dark:text-white leading-none">{score}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">/ {max}</span>
          <span className={`text-xs font-bold tracking-[0.15em] mt-1.5 uppercase ${verdictColor}`}>
            {verdict}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-600 uppercase tracking-[0.2em] font-medium">
        Investment Score
      </p>
    </div>
  );
}
