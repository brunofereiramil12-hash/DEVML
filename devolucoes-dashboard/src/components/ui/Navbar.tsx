'use client';

import { PackageX, Activity, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshAll = async () => {
    setRefreshing(true);
    await qc.invalidateQueries();
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#1e2a3d] bg-[#0a0d14]/80 backdrop-blur-xl">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-sky-500/10 rounded-lg border border-sky-500/20">
            <PackageX size={16} className="text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-bold text-slate-100 text-base tracking-tight">
              DevML
            </span>
            <span className="text-xs text-slate-600 hidden sm:inline">
              Gestão de Devoluções
            </span>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
            <Activity size={12} className="text-emerald-400 animate-pulse-soft" />
            <span className="text-emerald-400/70">ao vivo</span>
          </div>

          {/* Refresh all */}
          <button
            onClick={handleRefreshAll}
            title="Atualizar todos os dados"
            className={cn(
              'p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition-all border border-transparent hover:border-sky-500/20',
              refreshing && 'text-sky-400 animate-spin'
            )}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
