interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface StockBarChartProps {
  data: BarData[];
  height?: number;
}

export function StockBarChart({ data, height = 180 }: StockBarChartProps) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = data.length > 0 ? 100 / data.length : 0;

  return (
    <div className="w-full">
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.length === 0 ? (
          <div className="flex items-center justify-center w-full text-gray-400 text-sm">
            No items in stock
          </div>
        ) : (
          data.map((d, i) => {
            const h = (d.value / maxVal) * 100;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end group relative"
                style={{ minWidth: `${barWidth}%` }}
              >
                <span className="text-xs text-gray-600 font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {d.value}
                </span>
                <div
                  className="w-full rounded-t-md transition-all duration-300 hover:opacity-80"
                  style={{
                    height: `${h}%`,
                    minHeight: d.value > 0 ? '4px' : '0',
                    backgroundColor: d.color || '#0d9488',
                  }}
                />
              </div>
            );
          })
        )}
      </div>
      {data.length > 0 && (
        <div className="flex gap-1.5 mt-2">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 text-center text-[10px] text-gray-500 truncate"
              style={{ minWidth: `${barWidth}%` }}
              title={d.label}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
