type Props = {
  score: number;
  max?: number;
  label: string;
  sub?: string;
  color?: "green" | "yellow" | "red";
};

const strokeColor = {
  green: "#10b981",
  yellow: "#f59e0b",
  red: "#ef4444",
};

export default function ScoreGauge({ score, max = 10, label, sub, color = "green" }: Props) {
  const r = 36;
  const cx = 46;
  const cy = 46;
  const circumference = 2 * Math.PI * r;
  const filled = Math.min(score / max, 1) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-[92px] h-[92px]">
        <svg width="92" height="92" viewBox="0 0 92 92">
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="currentColor"
            className="text-gray-100 dark:text-gray-800"
            strokeWidth="8"
          />
          {/* Progress arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={strokeColor[color]}
            strokeWidth="8"
            strokeDasharray={`${filled} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90, ${cx}, ${cy})`}
          />
        </svg>
        {/* Score overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white leading-none">{score}</span>
          <span className="text-[10px] text-gray-400 leading-none mt-0.5">/10</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wider">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
