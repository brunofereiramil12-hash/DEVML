'use client';

import { LayoutDashboard, FileInput } from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'dashboard' | 'registros';

interface TabNavProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={14} /> },
  { id: 'registros', label: 'Registros & Formulários', icon: <FileInput size={14} /> },
];

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <div className="flex gap-1 bg-[#111827] rounded-xl p-1 border border-[#1e2a3d] w-fit">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            active === tab.id
              ? 'bg-sky-500/15 text-sky-400 border border-sky-500/25 shadow-sm'
              : 'text-slate-500 hover:text-slate-300 hover:bg-[#1a2235]'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
