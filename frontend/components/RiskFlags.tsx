type Props = {
  strengths: string[];
  risks: string[];
};

export default function RiskFlags({ strengths, risks }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-5">
        <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-3">Strengths</p>
        <ul className="space-y-2.5">
          {(strengths ?? []).map((s, i) => (
            <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2.5">
              <span className="text-emerald-500 mt-0.5 shrink-0 text-xs">▲</span>
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-900/60 rounded-xl p-5">
        <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-[0.2em] mb-3">Risk Flags</p>
        <ul className="space-y-2.5">
          {(risks ?? []).map((r, i) => (
            <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2.5">
              <span className="text-red-500 mt-0.5 shrink-0 text-xs">▼</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
