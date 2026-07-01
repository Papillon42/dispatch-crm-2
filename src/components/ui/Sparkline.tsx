'use client';

import { Area, AreaChart, ResponsiveContainer, YAxis } from 'recharts';

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

/** Tiny trend chart used inside KPI cards, matching the mockup's mini sparklines. */
export function Sparkline({ data, color = '#3B82F6', className }: SparklineProps) {
  if (!data || data.length < 2) return null;
  const chartData = data.map((value, i) => ({ i, value }));
  const gradientId = `spark-${color.replace('#', '')}`;

  return (
    <div className={className ?? 'h-8 w-20'}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
