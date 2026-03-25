'use client';

import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface DayData {
  day: string;
  avg_score: number;
  total_focus_minutes: number;
}

interface WeeklyChartProps {
  data: DayData[];
  delay?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 shadow-xl">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name === 'avg_score' ? 'Avg Score' : 'Focus Mins'}: <span className="font-semibold">{Math.round(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export default function WeeklyChart({ data, delay = 0 }: WeeklyChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    day: new Date(d.day + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
  }));

  return (
    <motion.div
      className="rounded-2xl border border-border bg-card p-6"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <h3 className="mb-4 text-lg font-semibold text-foreground">Last 7 Days</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={formatted} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
            <XAxis
              dataKey="day"
              tick={{ fill: 'hsl(240 5% 64.9%)', fontSize: 12 }}
              axisLine={{ stroke: 'hsl(240 3.7% 15.9%)' }}
              tickLine={false}
            />
            <YAxis
              yAxisId="score"
              domain={[0, 100]}
              tick={{ fill: 'hsl(240 5% 64.9%)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="minutes"
              orientation="right"
              tick={{ fill: 'hsl(240 5% 64.9%)', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: 'hsl(240 5% 64.9%)' }}
              formatter={(v: string) => (v === 'avg_score' ? 'Avg Score' : 'Focus Mins')}
            />
            <Bar
              yAxisId="minutes"
              dataKey="total_focus_minutes"
              fill="hsl(262 83% 58% / 0.35)"
              radius={[4, 4, 0, 0]}
              barSize={28}
            />
            <Line
              yAxisId="score"
              type="monotone"
              dataKey="avg_score"
              stroke="hsl(262 83% 58%)"
              strokeWidth={2.5}
              dot={{ fill: 'hsl(262 83% 58%)', r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
