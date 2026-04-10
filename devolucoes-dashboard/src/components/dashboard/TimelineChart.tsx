'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TimelineItem } from '@/types';

interface TimelineChartProps {
  data: TimelineItem[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl border border-sky-500/20">
      <p className="font-semibold text-slate-300 mb-1">{label}</p>
      <p className="text-sky-400">{payload[0].value} devoluções</p>
    </div>
  );
};

function Skeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 w-52 rounded shimmer-bg mb-6" />
      <div className="h-48 rounded-lg shimmer-bg" />
    </div>
  );
}

export function TimelineChart({ data, isLoading }: TimelineChartProps) {
  if (isLoading) return <Skeleton />;

  return (
    <div className="card p-6 animate-in stagger-3">
      <div className="mb-6">
        <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
          Volume por Período
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Devoluções por data de chegada</p>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3d" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={{ stroke: '#1e2a3d' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#38bdf8', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#38bdf8"
            strokeWidth={2}
            fill="url(#areaGrad)"
            dot={{ fill: '#38bdf8', r: 3, strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#38bdf8', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
