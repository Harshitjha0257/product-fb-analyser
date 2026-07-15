type Props = {
  label: string;
  value: string | number;
  sub?: string;
  color?: "green" | "red" | "yellow" | "blue" | "gray";
};

const borderMap = {
  green: "border-emerald-400",
  red: "border-red-400",
  yellow: "border-yellow-400",
  blue: "border-blue-400",
  gray: "border-gray-400 dark:border-gray-600",
};

const textMap = {
  green: "text-emerald-600 dark:text-emerald-400",
  red: "text-red-600 dark:text-red-400",
  yellow: "text-yellow-600 dark:text-yellow-400",
  blue: "text-blue-600 dark:text-blue-400",
  gray: "text-gray-600 dark:text-gray-300",
};

export default function ScoreCard({ label, value, sub, color = "gray" }: Props) {
  return (
    <div className={`bg-white dark:bg-gray-900 border rounded-xl p-4 flex flex-col gap-1 ${borderMap[color]}`}>
      <span className="text-xs text-gray-500 uppercase tracking-widest leading-tight">{label}</span>
      <span className={`text-xl font-semibold ${textMap[color]}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}