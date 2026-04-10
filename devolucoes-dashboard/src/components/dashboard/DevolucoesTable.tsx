'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  RefreshCw,
} from 'lucide-react';
import { useDevolucoes } from '@/hooks/useDevolucoes';
import { cn, truncate } from '@/lib/utils';
import type { DevolucaoFilters, Devolucao } from '@/types';
import { isMotivo } from '@/lib/analytics';

function MotivoBadge({ motivo }: { motivo: string }) {
  if (!motivo || motivo.trim() === '') {
    return <span className="badge badge-pendente">Pendente</span>;
  }
  if (isMotivo(motivo, 'ok')) {
    return <span className="badge badge-ok">{truncate(motivo, 22)}</span>;
  }
  return <span className="badge badge-problema">{truncate(motivo, 22)}</span>;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#1e2a3d]">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded shimmer-bg" style={{ width: `${40 + (i * 13) % 50}%` }} />
        </td>
      ))}
    </tr>
  );
}

interface FiltersBarProps {
  filters: DevolucaoFilters;
  onFilterChange: (f: Partial<DevolucaoFilters>) => void;
  onReset: () => void;
}

function FiltersBar({ filters, onFilterChange, onReset }: FiltersBarProps) {
  const hasActiveFilters = filters.search || filters.nomeCliente || filters.numeroNF;

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 border-b border-[#1e2a3d]">
      {/* Global search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-8 text-sm"
          placeholder="Busca global..."
          value={filters.search ?? ''}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
        />
      </div>

      {/* Cliente filter */}
      <input
        className="input w-40 text-sm"
        placeholder="Cliente..."
        value={filters.nomeCliente ?? ''}
        onChange={(e) => onFilterChange({ nomeCliente: e.target.value, page: 1 })}
      />

      {/* NF filter */}
      <input
        className="input w-36 text-sm"
        placeholder="Nº NF..."
        value={filters.numeroNF ?? ''}
        onChange={(e) => onFilterChange({ numeroNF: e.target.value, page: 1 })}
      />

      {hasActiveFilters && (
        <button onClick={onReset} className="btn-secondary text-xs gap-1">
          <X size={12} /> Limpar
        </button>
      )}
    </div>
  );
}

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}

function Pagination({ page, totalPages, total, pageSize, onChange }: PaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#1e2a3d] text-xs text-slate-500">
      <span>{total === 0 ? '0 registros' : `${start}–${end} de ${total}`}</span>
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded hover:bg-[#1e2a3d] disabled:opacity-30 transition"
          onClick={() => onChange(1)}
          disabled={page <= 1}
        >
          <ChevronsLeft size={14} />
        </button>
        <button
          className="p-1.5 rounded hover:bg-[#1e2a3d] disabled:opacity-30 transition"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-slate-300">
          {page} / {totalPages || 1}
        </span>
        <button
          className="p-1.5 rounded hover:bg-[#1e2a3d] disabled:opacity-30 transition"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={14} />
        </button>
        <button
          className="p-1.5 rounded hover:bg-[#1e2a3d] disabled:opacity-30 transition"
          onClick={() => onChange(totalPages)}
          disabled={page >= totalPages}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}

const COLUMNS = [
  { key: 'dataChegada',       label: 'Chegada' },
  { key: 'nomeCliente',       label: 'Cliente' },
  { key: 'numeroNF',          label: 'Nº NF' },
  { key: 'codigoPecaQtd',     label: 'Peça / Qtd' },
  { key: 'dataDevolucao',     label: 'Data Dev.' },
  { key: 'numeroNFDevolucao', label: 'NF Dev.' },
  { key: 'motivo',            label: 'Motivo' },
] as const;

const DEFAULT_FILTERS: DevolucaoFilters = { page: 1, pageSize: 20 };

export function DevolucoesTable() {
  const [filters, setFilters] = useState<DevolucaoFilters>(DEFAULT_FILTERS);

  const { data, isLoading, isFetching, refetch } = useDevolucoes(filters);

  const handleFilterChange = useCallback((partial: Partial<DevolucaoFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const handleReset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="card animate-in stagger-4">
      {/* Table header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-sky-400" />
          <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
            Registros
          </h3>
          {total > 0 && (
            <span className="badge bg-sky-500/10 text-sky-400 border-sky-500/20">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={cn(
            'p-1.5 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 transition',
            isFetching && 'animate-spin text-sky-400'
          )}
          title="Recarregar"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <FiltersBar filters={filters} onFilterChange={handleFilterChange} onReset={handleReset} />

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e2a3d]">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              : rows.length === 0
              ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 text-sm">
                    Nenhum registro encontrado
                  </td>
                </tr>
              )
              : rows.map((row: Devolucao) => (
                <tr
                  key={`${row.rowIndex}-${row.numeroNF}`}
                  className="border-b border-[#1e2a3d] hover:bg-[#1a2235] transition-colors group"
                >
                  <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{row.dataChegada || '—'}</td>
                  <td className="px-4 py-3 text-slate-200 font-medium max-w-[160px]">
                    <span title={row.nomeCliente}>{truncate(row.nomeCliente, 24)}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-sky-400 text-xs whitespace-nowrap">{row.numeroNF}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[140px]">
                    <span title={row.codigoPecaQtd}>{truncate(row.codigoPecaQtd, 20)}</span>
                  </td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                    {row.dataDevolucao
                      ? <span className="text-emerald-400">{row.dataDevolucao}</span>
                      : <span className="text-amber-400/70">Pendente</span>
                    }
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-400 text-xs whitespace-nowrap">
                    {row.numeroNFDevolucao || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <MotivoBadge motivo={row.motivo} />
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      <Pagination
        page={filters.page ?? 1}
        totalPages={totalPages}
        total={total}
        pageSize={filters.pageSize ?? 20}
        onChange={(p) => handleFilterChange({ page: p })}
      />
    </div>
  );
}
