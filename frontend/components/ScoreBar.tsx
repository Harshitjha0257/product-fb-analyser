"use client";
import { useEffect, useState } from "react";

type Props = {
  label: string;
  score: number;
  max?: number;
  color?: "green" | "yellow" | "red";
  definition?: string;
  reasoning?: string;
  accentColor?: string;
};

const barGradient = {
  green: "from-emerald-500 to-emerald-400",
  yellow: "from-yellow-500 to-yellow-400",
  red: "from-red-500 to-red-400",
};

const textColor = {
  green: "text-emerald-500 dark:text-emerald-400",
  yellow: "text-yellow-500 dark:text-yellow-400",
  red: "text-red-500 dark:text-red-400",
};

export default function ScoreBar({ label, score, max = 10, color = "green", definition, reasoning, accentColor }: Props) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth((score / max) * 100), 120);
    return () => clearTimeout(t);
  }, [score, max]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-800 dark:text-gray-100 tracking-tight">{label}</span>
        <div className="flex items-baseline gap-0.5">
          <span
            className={`text-2xl font-black ${accentColor ? "" : textColor[color]}`}
            style={accentColor ? { color: accentColor } : undefined}
          >
            {score}
          </span>
          <span className="text-xs text-gray-400 font-normal">/{max}</span>
        </div>
      </div>

      {definition && (
        <p className="text-[13px] text-gray-400 dark:text-gray-400 leading-snug">{definition}</p>
      )}

      {/* Track */}
      <div className="relative h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div className="absolute inset-0 flex">
          {Array.from({ length: max }, (_, i) => (
            <div key={i} className="flex-1 border-r border-gray-300 dark:border-gray-900 last:border-0" />
          ))}
        </div>
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out ${
            accentColor ? "" : `bg-gradient-to-r ${barGradient[color]}`
          }`}
          style={
            accentColor
              ? { width: `${width}%`, backgroundColor: accentColor }
              : { width: `${width}%` }
          }
        />
      </div>

      {reasoning && (
        <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">{reasoning}</p>
      )}
    </div>
  );
}
