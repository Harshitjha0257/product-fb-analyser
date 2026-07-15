"use client";
import { useEffect, useState } from "react";
import axios from "axios";

type Usage = {
  limit: number;
  used: number;
  remaining: number;
  pct_used: number;
  reset: string;
  rate_limited?: boolean;
};

export default function TokenBar() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const res = await axios.get("http://localhost:8000/token-usage");
      setUsage(res.data);
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 300_000); // refresh every 5 min
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
      <span className="text-xs text-gray-400">Checking tokens...</span>
    </div>
  );

  if (!usage) return null;

  const pct = usage.pct_used;
  const barColor =
    pct >= 90 ? "bg-red-500" :
    pct >= 70 ? "bg-amber-500" :
    "bg-emerald-500";

  const textColor =
    pct >= 90 ? "text-red-500" :
    pct >= 70 ? "text-amber-500" :
    "text-emerald-500";

  return (
    <div className="flex items-center gap-2.5 group relative cursor-default">
      {/* Bar */}
      <div className="w-20 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Percentage */}
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>
        {pct}%
      </span>

      {/* Hover tooltip */}
      <div className="absolute right-0 top-6 z-50 hidden group-hover:flex flex-col gap-1 bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-xl p-3 w-52 shadow-xl text-xs">
        <p className="font-black text-white mb-1">Groq Token Usage</p>
        <div className="flex justify-between text-gray-300">
          <span>Used</span>
          <span className={`font-bold ${textColor}`}>{usage.used.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Remaining</span>
          <span className="font-bold text-white">{usage.remaining.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>Daily limit</span>
          <span className="font-bold text-white">{usage.limit.toLocaleString()}</span>
        </div>
        {usage.reset && (
          <div className="flex justify-between text-gray-300 mt-1 pt-1 border-t border-gray-700">
            <span>Resets</span>
            <span className="font-bold text-gray-400">{usage.reset}</span>
          </div>
        )}
        {usage.rate_limited && (
          <p className="text-red-400 font-semibold mt-1">⚠ Rate limited — wait for reset</p>
        )}
      </div>
    </div>
  );
}
