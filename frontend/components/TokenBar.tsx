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

  const fetchUsage = async () => {
    try {
      const res = await axios.get("https://product-fb-analyser.onrender.com/token-usage");
      setUsage(res.data);
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
    const t = setInterval(fetchUsage, 60_000); // refresh every 60s
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full animate-pulse" />
      <span className="text-[10px] text-gray-400 dark:text-gray-500">...</span>
    </div>
  );

  if (!usage) return null;

  const pct = usage.pct_used;
  const barColor = pct >= 90 ? "#ef4444" : pct >= 70 ? "#f59e0b" : "#10b981";
  const textColor = pct >= 90 ? "text-red-500" : pct >= 70 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="relative flex items-center gap-2 group cursor-default">
      {/* Track */}
      <div className="w-20 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>

      {/* Percentage */}
      <span className={`text-xs font-bold tabular-nums ${textColor}`}>
        {pct}%
      </span>

      {/* Tooltip — floats downward from bar, above ticker via z-[200] on header */}
      <div className="absolute right-0 top-full mt-2 z-[200] hidden group-hover:flex flex-col gap-1.5
        bg-gray-950 border border-gray-800 rounded-xl p-3.5 w-52 shadow-2xl text-xs pointer-events-none">
        <p className="font-black text-white mb-0.5 text-[11px] tracking-wide">Groq Token Usage</p>
        <div className="flex justify-between">
          <span className="text-gray-400">Used</span>
          <span className={`font-bold ${textColor}`}>{usage.used.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Remaining</span>
          <span className="font-bold text-white">{usage.remaining.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Daily limit</span>
          <span className="font-bold text-white">{usage.limit.toLocaleString()}</span>
        </div>
        {usage.reset && (
          <div className="flex justify-between pt-1.5 border-t border-gray-800">
            <span className="text-gray-400">Resets in</span>
            <span className="font-bold text-gray-300">{usage.reset}</span>
          </div>
        )}
        {usage.rate_limited && (
          <p className="text-red-400 font-semibold pt-1">⚠ Rate limited</p>
        )}
      </div>
    </div>
  );
}
