'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PieChart, Pie, Legend } from 'recharts';
import { BarChart2, PieChart as PieIcon } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { MotivoCount } from '@/types';

interface MotivoChartProps {
  data: MotivoCount[];
  isLoading?: boolean;
}

const COLORS = [
  '#38bdf8', '#818cf8', '#34d399', '#fb923c',
  '#f472b6', '#a78bfa', '#22d3ee', '#fbbf24',
  '#ef4444', '#10b981',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MotivoCount;
  return (
    <div className="card px-3 py-2 text-xs shadow-xl border border-sky-500/20">
      <p className="font-semibold text-slate-200 mb-1 max-w-[200px] break-words">{d.motivo}</p>
      <p className="text-sky-400">{d.count} ocorrência{d.count !== 1 ? 's' : ''}</p>
      <p className="text-slate-400">{d.percentage}% do total</p>
    </div>
  );
};

function Skeleton() {
  return (
    <div className="card p-6 animate-pulse">
      <div className="h-4 w-40 rounded shimmer-bg mb-6" />
      <div className="h-64 rounded-lg shimmer-bg" />
    </div>
  );
}

export function MotivoChart({ data, isLoading }: MotivoChartProps) {
  const [view, setView] = useState<'bar' | 'pie'>('bar');

  if (isLoading) return <Skeleton />;

  return (
    <div className="card p-6 animate-in stagger-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
            Motivos de Devolução
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Top {data.length} categorias</p>
        </div>
        <div className="flex gap-1 bg-[#0f1520] rounded-lg p-1 border border-[#1e2a3d]">
          <button
            onClick={() => setView('bar')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              view === 'bar' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <BarChart2 size={15} />
          </button>
          <button
            onClick={() => setView('pie')}
            className={cn(
              'p-1.5 rounded-md transition-all',
              view === 'pie' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <PieIcon size={15} />
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={280}>
        {view === 'bar' ? (
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2a3d" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={{ stroke: '#1e2a3d' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="motivo"
              width={120}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(56,189,248,0.05)' }} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="motivo"
              cx="50%"
              cy="45%"
              outerRadius={100}
              innerRadius={50}
              paddingAngle={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(v: string) => (
                <span style={{ color: '#9ca3af', fontSize: 11 }}>
                  {v.length > 18 ? v.slice(0, 18) + '…' : v}
                </span>
              )}
            />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
