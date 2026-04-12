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
        onChange={(e) => onFilterChange
