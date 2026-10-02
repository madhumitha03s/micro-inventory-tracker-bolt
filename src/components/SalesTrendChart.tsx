interface LinePoint {
  label: string;
  value: number;
}

interface SalesTrendChartProps {
  data: LinePoint[];
  height?: number;
}

export function SalesTrendChart({ data, height = 200 }: SalesTrendChartProps) {
  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <div className="flex items-center justify-center text-gray-400 text-sm" style={{ height }}>
        No sales data in the last 30 days
      </div>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const width = 100;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - 20 - (d.value / maxVal) * (height - 40);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');

  const areaD = `${pathD} L ${width} ${height - 20} L 0 ${height - 20} Z`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d9488" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            y1={height - 20 - f * (height - 40)}
            x2={width}
            y2={height - 20 - f * (height - 40)}
            stroke="#e5e7eb"
            strokeWidth="0.15"
          />
        ))}
        <path d={areaD} fill="url(#salesGradient)" />
        <path d={pathD} fill="none" stroke="#0d9488" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="0.8" fill="#0d9488" className="opacity-0 hover:opacity-100" />
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}
