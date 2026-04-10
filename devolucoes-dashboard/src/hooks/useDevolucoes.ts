/**
 * React Query (TanStack Query) hooks
 * Separation of Concerns: toda lógica de fetch, cache e invalidação fica aqui.
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

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useDashboard(
  options?: Partial<UseQueryOptions<DashboardData>>
) {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboard,
    staleTime: 30_000, // 30s — revalida automaticamente
    refetchInterval: 60_000, // polling a cada 60s para "live"
    ...options,
  });
}

export function useDevolucoes(filters: DevolucaoFilters) {
  return useQuery({
    queryKey: queryKeys.devolucoes(filters),
    queryFn: () => fetchDevolucoes(filters),
    staleTime: 30_000,
    placeholderData: (prev) => prev, // mantém dados anteriores durante refetch (UX suave)
  });
}

export function useCreateDevolucao() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createDevolucao,
    onSuccess: () => {
      toast.success('Devolução registrada com sucesso!');
      // Invalida o dashboard e a lista para refetch imediato
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
