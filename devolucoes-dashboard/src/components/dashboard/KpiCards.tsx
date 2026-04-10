'use client';

import {
  PackageX,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIs } from '@/types';

interface KpiCardsProps {
  kpis: KPIs;
  isLoading?: boolean;
}

interface CardDef {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'sky';
  delay: string;
}

const colorMap = {
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   text: 'text-blue-400',   icon: 'bg-blue-500/15' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'bg-emerald-500/15' },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/20',    text: 'text-red-400',    icon: 'bg-red-500/15' },
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/20',  text: 'text-amber-400',  icon: 'bg-amber-500/15' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'bg-purple-500/15' },
  sky:    { bg: 'bg-sky-500/10',    border: 'border-sky-500/20',    text: 'text-sky-400',    icon: 'bg-sky-500/15' },
};

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-24 rounded shimmer-bg" />
        <div className="h-9 w-9 rounded-lg shimmer-bg" />
      </div>
      <div className="h-8 w-16 rounded shimmer-bg mb-2" />
      <div className="h-3 w-32 rounded shimmer-bg" />
    </div>
  );
}

export function KpiCards({ kpis, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  const cards: CardDef[] = [
    {
      label: 'Total no Mês',
      value: kpis.totalMes,
      sub: 'chegadas este mês',
      icon: <CalendarCheck size={18} />,
      color: 'sky',
      delay: 'stagger-1',
    },
    {
      label: 'Total Geral',
      value: kpis.totalGeral,
      sub: 'registros na planilha',
      icon: <PackageX size={18} />,
      color: 'blue',
      delay: 'stagger-2',
    },
    {
      label: 'Status OK',
      value: `${kpis.percentualOK}%`,
      sub: 'motivos aprovados',
      icon: <CheckCircle2 size={18} />,
      color: 'green',
      delay: 'stagger-3',
    },
    {
      label: 'Problemas',
      value: `${kpis.percentualProblema}%`,
      sub: 'motivos em aberto',
      icon: <AlertCircle size={18} />,
      color: 'red',
      delay: 'stagger-4',
    },
    {
      label: 'Pendentes',
      value: kpis.pendentes,
      sub: 'sem data de devolução',
      icon: <Clock size={18} />,
      color: 'amber',
      delay: 'stagger-5',
    },
    {
      label: 'Média Resolução',
      value: `${kpis.avgDiasResolucao}d`,
      sub: 'dias até devolução',
      icon: <TrendingUp size={18} />,
      color: 'purple',
      delay: 'stagger-5',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => {
        const c = colorMap[card.color];
        return (
          <div
            key={card.label}
            className={cn(
              'card card-hover p-5 animate-in',
              c.bg,
              c.border,
              card.delay
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                {card.label}
              </p>
              <span className={cn('p-2 rounded-lg', c.icon, c.text)}>
                {card.icon}
              </span>
            </div>
            <p className={cn('text-2xl font-bold font-display mb-1', c.text)}>
              {card.value}
            </p>
            <p className="text-xs text-slate-500">{card.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
