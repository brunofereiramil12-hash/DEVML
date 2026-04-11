import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  differenceInDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type {
  Devolucao,
  KPIs,
  MotivoCount,
  TimelineItem,
  DashboardData,
  DevolucaoFilters,
  PaginatedResponse,
} from '@/types';

// ─── Constantes ───────────────────────────────────────────────────────────────
const MOTIVOS_OK = new Set([
  'OK', 'APROVADO', 'RESOLVIDO', 'CONCLUIDO',
  'ACEITO', 'CONFORME', 'FINALIZADO', 'ENCERRADO',
]);

// ─── Parse de datas ───────────────────────────────────────────────────────────
// Suporta: "dd/MM/yyyy", "yyyy-MM-dd", "dd-MM-yyyy"
// Retorna null para strings vazias ou inválidas — nunca lança exceção.
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr?.trim()) return null;

  const s = dateStr.trim();

  // dd/MM/yyyy  ou  dd-MM-yyyy
  const dmyMatch = s.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const iso = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    const d = parseISO(iso);
    return isValid(d) ? d : null;
  }

  // yyyy-MM-dd
  const ymdMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymdMatch) {
    const d = parseISO(s);
    return isValid(d) ? d : null;
  }

  return null;
}

// ─── Data efetiva da devolução ────────────────────────────────────────────────
// Regra de negócio: usa dataChegada quando disponível;
// cai para dataDevolucao quando dataChegada está vazia (situação atual da planilha).
export function getDataEfetiva(d: Devolucao): Date | null {
  return parseDate(d.dataChegada) ?? parseDate(d.dataDevolucao);
}

// ─── Classificação de motivo ──────────────────────────────────────────────────
export function isMotivo(motivo: string, tipo: 'ok' | 'problema'): boolean {
  const norm = motivo.trim().toUpperCase();
  const isOK = MOTIVOS_OK.has(norm);
  return tipo === 'ok' ? isOK : !isOK;
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
export function computeKPIs(devolucoes: Devolucao[]): KPIs {
  const now = new Date();
  const inicioMes = startOfMonth(now);
  const fimMes = endOfMonth(now);

  // Total no mês: usa data efetiva (chegada → devolução como fallback)
  const doMes = devolucoes.filter((d) => {
    const dt = getDataEfetiva(d);
    return dt !== null && isWithinInterval(dt, { start: inicioMes, end: fimMes });
  });

  // Pendentes: sem data de devolução registrada
  const pendentes = devolucoes.filter(
    (d) => !d.dataDevolucao?.trim()
  ).length;

  // Média de dias: só calcula quando AMBAS as datas existem
  const diasResolucao = devolucoes
    .map((d) => {
      const chegada = parseDate(d.dataChegada);
      const devolucao = parseDate(d.dataDevolucao);
      if (!chegada || !devolucao) return null;
      const diff = differenceInDays(devolucao, chegada);
      return diff >= 0 ? diff : null; // ignora datas inconsistentes
    })
    .filter((d): d is number => d !== null);

  const avgDiasResolucao =
    diasResolucao.length > 0
      ? Math.round(diasResolucao.reduce((a, b) => a + b, 0) / diasResolucao.length)
      : 0;

  const total = devolucoes.length || 1;
  const totalOK = devolucoes.filter((d) => isMotivo(d.motivo, 'ok')).length;

  return {
    totalMes: doMes.length,
    totalGeral: devolucoes.length,
    percentualOK: Math.round((totalOK / total) * 100),
    percentualProblema: Math.round(((total - totalOK) / total) * 100),
    pendentes,
    avgDiasResolucao,
  };
}

// ─── Gráfico de motivos ───────────────────────────────────────────────────────
export function computeMotivoChart(devolucoes: Devolucao[]): MotivoCount[] {
  const countMap = new Map<string, number>();

  for (const d of devolucoes) {
    const key = d.motivo.trim() || 'Não informado';
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  const total = devolucoes.length || 1;

  return Array.from(countMap.entries())
    .map(([motivo, count]) => ({
      motivo,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

// ─── Timeline mensal ──────────────────────────────────────────────────────────
export function computeTimeline(devolucoes: Devolucao[]): TimelineItem[] {
  const countMap = new Map<string, { label: string; count: number }>();

  for (const d of devolucoes) {
    const dt = getDataEfetiva(d);
    if (!dt) continue;

    const sortKey = format(dt, 'yyyy-MM');
    const label = format(dt, 'MMM yy', { locale: ptBR });

    const existing = countMap.get(sortKey);
    if (existing) {
      existing.count += 1;
    } else {
      countMap.set(sortKey, { label, count: 1 });
    }
  }

  return Array.from(countMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([, { label, count }]) => ({ date: label, count }));
}

// ─── Dashboard completo ───────────────────────────────────────────────────────
export function buildDashboardData(devolucoes: Devolucao[]): DashboardData {
  return {
    kpis: computeKPIs(devolucoes),
    motivoChart: computeMotivoChart(devolucoes),
    timeline: computeTimeline(devolucoes),
  };
}

// ─── Filtro + paginação ───────────────────────────────────────────────────────
export function filterAndPaginate(
  devolucoes: Devolucao[],
  filters: DevolucaoFilters
): PaginatedResponse<Devolucao> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, filters.pageSize ?? 20);

  let filtered = devolucoes;

  // Busca global: nome, NF, motivo, peça
  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.nomeCliente.toLowerCase().includes(term) ||
        d.numeroNF.toLowerCase().includes(term) ||
        d.motivo.toLowerCase().includes(term) ||
        d.codigoPecaQtd.toLowerCase().includes(term)
    );
  }

  if (filters.nomeCliente?.trim()) {
    const term = filters.nomeCliente.trim().toLowerCase();
    filtered = filtered.filter((d) =>
      d.nomeCliente.toLowerCase().includes(term)
    );
  }

  if (filters.numeroNF?.trim()) {
    const term = filters.numeroNF.trim();
    filtered = filtered.filter((d) => d.numeroNF.includes(term));
  }

  if (filters.motivo?.trim()) {
    const term = filters.motivo.trim().toLowerCase();
    filtered = filtered.filter((d) =>
      d.motivo.toLowerCase().includes(term)
    );
  }

  // Filtro por intervalo de datas (usa data efetiva)
  if (filters.dataInicio || filters.dataFim) {
    const inicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const fim = filters.dataFim ? new Date(filters.dataFim) : null;

    filtered = filtered.filter((d) => {
      const dt = getDataEfetiva(d);
      if (!dt) return false;
      if (inicio && dt < inicio) return false;
      if (fim && dt > fim) return false;
      return true;
    });
  }

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total, page, pageSize, totalPages };
}
