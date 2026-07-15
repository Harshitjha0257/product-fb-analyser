type Dimension = { label: string; value: number; max: number };
type Props = { dimensions: Dimension[]; size?: number; colors?: string[] };

const DEFAULT_COLOR = "#10b981";

export default function RadarChart({ dimensions, size = 260, colors }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.30;
  const labelR = maxR + 32;
  const n = dimensions.length;
  const levels = [0.25, 0.5, 0.75, 1.0];

  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI / n) * i;

  const pt = (i: number, r: number) => ({
    x: +(cx + r * Math.cos(angle(i))).toFixed(2),
    y: +(cy + r * Math.sin(angle(i))).toFixed(2),
  });

  const polyPts = (level: number) =>
    Array.from({ length: n }, (_, i) => {
      const p = pt(i, maxR * level);
      return `${p.x},${p.y}`;
    }).join(" ");

  const dataPts = dimensions
    .map((d, i) => {
      const norm = Math.min(Math.max(d.value / d.max, 0), 1);
      const p = pt(i, maxR * norm);
      return `${p.x},${p.y}`;
    })
    .join(" ");

  const anchor = (i: number): "middle" | "start" | "end" => {
    const { x } = pt(i, labelR);
    if (Math.abs(x - cx) < 8) return "middle";
    return x > cx ? "start" : "end";
  };

  const baseline = (i: number): "middle" | "auto" | "hanging" => {
    const { y } = pt(i, labelR);
    if (Math.abs(y - cy) < 8) return "middle";
    return y < cy ? "auto" : "hanging";
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Dashed grid rings */}
      {levels.map((lv, li) => (
        <polygon
          key={li}
          points={polyPts(lv)}
          fill="none"
          stroke="currentColor"
          className="text-gray-200 dark:text-gray-700"
          strokeWidth={lv === 1.0 ? 1.5 : 0.8}
          strokeDasharray={lv < 1.0 ? "3 3" : undefined}
        />
      ))}

      {/* Scale labels on rightmost axis (PMF axis, index 1) */}
      {levels.map((lv, li) => {
        const p = pt(1, maxR * lv);
        return (
          <text
            key={li}
            x={p.x + 5}
            y={p.y}
            fontSize="8"
            fill="currentColor"
            className="text-gray-400 dark:text-gray-600"
            dominantBaseline="middle"
          >
            {lv * 10}
          </text>
        );
      })}

      {/* Axis spokes */}
      {Array.from({ length: n }, (_, i) => {
        const outer = pt(i, maxR);
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x} y2={outer.y}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            strokeWidth="0.8"
          />
        );
      })}

      {/* Filled data area */}
      <polygon
        points={dataPts}
        fill="#10b981"
        fillOpacity="0.15"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Colored dots with score inside */}
      {dimensions.map((d, i) => {
        const dotColor = colors?.[i] ?? DEFAULT_COLOR;
        const norm = Math.min(Math.max(d.value / d.max, 0), 1);
        const { x, y } = pt(i, maxR * norm);
        return (
          <g key={i}>
            <circle cx={x} cy={y} r="11" fill={dotColor} />
            <text
              x={x} y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="9"
              fontWeight="900"
              fill="white"
            >
              {d.value}
            </text>
          </g>
        );
      })}

      {/* Axis labels */}
      {dimensions.map((d, i) => {
        const dotColor = colors?.[i] ?? DEFAULT_COLOR;
        const { x, y } = pt(i, labelR);
        return (
          <text
            key={i}
            x={x} y={y}
            textAnchor={anchor(i) as any}
            dominantBaseline={baseline(i) as any}
            fontSize="9"
            fontWeight="700"
            fill={dotColor}
            letterSpacing="0.05em"
          >
            {d.label.toUpperCase()}
          </text>
        );
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2.5" fill="currentColor" className="text-gray-300 dark:text-gray-600" />
    </svg>
  );
}
