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
  Trash2,
} from 'lucide-react';
import { useDevolucoes, useDeleteDevolucao } from '@/hooks/useDevolucoes';
import { cn, truncate } from '@/lib/utils';
import type { DevolucaoFilters, Devolucao } from '@/types';
import { isMotivo } from '@/lib/analytics';

// ─── Máscara de data DD/MM/AAAA ───────────────────────────────────────────────
function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

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
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 rounded shimmer-bg" style={{ width: `${40 + (i * 13) % 50}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Modal de confirmação de exclusão ────────────────────────────────────────
interface ConfirmDeleteModalProps {
  row: Devolucao;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function ConfirmDeleteModal({ row, onConfirm, onCancel, isLoading }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card p-6 max-w-sm w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <Trash2 size={16} className="text-red-400" />
          </div>
          <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
            Confirmar Exclusão
          </h3>
        </div>
        <p className="text-sm text-slate-400">
          Tem certeza que deseja remover o registro da NF{' '}
          <span className="text-sky-400 font-mono">{row.numeroNF || '(sem NF)'}</span> de{' '}
          <span className="text-slate-200">{truncate(row.nomeCliente, 30)}</span>?
        </p>
        <p className="text-xs text-red-400/70">
          Esta ação removerá a linha da planilha e não pode ser desfeita.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="btn-primary bg-red-500 hover:bg-red-400 text-sm"
          >
            {isLoading ? 'Removendo...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FiltersBarProps {
  filters: DevolucaoFilters;
  onFilterChange: (f: Partial<DevolucaoFilters>) => void;
  onReset: () => void;
}

function FiltersBar({ filters, onFilterChange, onReset }: FiltersBarProps) {
  const hasActiveFilters =
    filters.search || filters.nomeCliente || filters.numeroNF ||
    filters.dataInicio || filters.dataFim;

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 border-b border-[#1e2a3d]">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          className="input pl-8 text-sm"
          placeholder="Busca global..."
          value={filters.search ?? ''}
          onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
        />
      </div>
      <input
        className="input w-40 text-sm"
        placeholder="Cliente..."
        value={filters.nomeCliente ?? ''}
        onChange={(e) => onFilterChange({ nomeCliente: e.target.value, page: 1 })}
      />
      <input
        className="input w-36 text-sm"
        placeholder="Nº NF..."
        value={filters.numeroNF ?? ''}
        onChange={(e) => onFilterChange({ numeroNF: e.target.value, page: 1 })}
      />
      <input
        className="input w-32 text-sm"
        placeholder="De: DD/MM/AAAA"
        value={filters.dataInicio ?? ''}
        maxLength={10}
        onChange={(e) => onFilterChange({ dataInicio: maskDate(e.target.value), page: 1 })}
      />
      <input
        className="input w-32 text-sm"
        placeholder="Até: DD/MM/AAAA"
        value={filters.dataFim ?? ''}
        maxLength={10}
        onChange={(e) => onFilterChange({ dataFim: maskDate(e.target.value), page: 1 })}
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
  { key: 'acoes',             label: '' },
] as const;

const DEFAULT_FILTERS: DevolucaoFilters = { page: 1, pageSize: 20 };

export function DevolucoesTable() {
  const [filters, setFilters] = useState<DevolucaoFilters>(DEFAULT_FILTERS);
  const [confirmRow, setConfirmRow] = useState<Devolucao | null>(null);

  const { data, isLoading, isFetching, refetch } = useDevolucoes(filters);
  const { mutate: deletar, isPending: isDeleting } = useDeleteDevolucao();

  const handleFil
