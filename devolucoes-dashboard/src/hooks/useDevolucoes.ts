/**
 * React Query (TanStack Query) hooks
 * Toda lógica de fetch, cache e invalidação centralizada aqui.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type {
  DashboardData,
  PaginatedResponse,
  Devolucao,
  DevolucaoFilters,
  CreateDevolucaoPayload,
  UpdateDevolucaoPayload,
} from '@/types';
import { buildQueryString } from '@/lib/utils';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  devolucoes: (filters: DevolucaoFilters) => ['devolucoes', filters] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch('/api/sheets/dashboard', { cache: 'no-store' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Erro ao carregar dashboard');
  return json.data;
}

async function fetchDevolucoes(
  filters: DevolucaoFilters
): Promise<PaginatedResponse<Devolucao>> {
  const qs = buildQueryString(filters as Record<string, string | number | undefined>);
  const res = await fetch(`/api/devolucoes${qs}`, { cache: 'no-store' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Erro ao carregar devoluções');
  return json;
}

async function createDevolucao(payload: CreateDevolucaoPayload): Promise<void> {
  const res = await fetch('/api/devolucoes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Erro ao criar devolução');
}

async function updateDevolucao(payload: UpdateDevolucaoPayload): Promise<void> {
  const res = await fetch('/api/devolucoes/update', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Erro ao atualizar devolução');
}

async function deleteDevolucao(numeroNF: string): Promise<void> {
  const res = await fetch(`/api/devolucoes/delete?numeroNF=${encodeURIComponent(numeroNF)}`, {
    method: 'DELETE',
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Erro ao remover devolução');
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDashboard(
  options?: Partial<UseQueryOptions<DashboardData>>
) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboard,
    staleTime: 30_000,
    refetchInterval: 60_000,
    ...options,
  });
}

export function useDevolucoes(filters: DevolucaoFilters) {
  return useQuery({
    queryKey: queryKeys.devolucoes(filters),
    queryFn: () => fetchDevolucoes(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useCreateDevolucao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createDevolucao,
    onSuccess: () => {
      toast.success('Devolução registrada com sucesso!');
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: ['devolucoes'] });
    },
    onError: (error: Error) => {
      toast.error(`Falha ao registrar: ${error.message}`);
    },
  });
}

export function useUpdateDevolucao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: updateDevolucao,
    onSuccess: () => {
      toast.success('Status atualizado com sucesso!');
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: ['devolucoes'] });
    },
    onError: (error: Error) => {
      toast.error(`Falha ao atualizar: ${error.message}`);
    },
  });
}

export function useDeleteDevolucao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: deleteDevolucao,
    onSuccess: (_, numeroNF) => {
      toast.success(`NF ${numeroNF} removida com sucesso!`);
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: ['devolucoes'] });
    },
    onError: (error: Error) => {
      toast.error(`Falha ao remover: ${error.message}`);
    },
  });
}
