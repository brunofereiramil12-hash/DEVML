/**
 * Analytics Service
 * Responsabilidade: transformar dados brutos da planilha em métricas de BI.
 * Separation of Concerns: lógica de negócio isolada dos componentes React e da API.
 */

import { format, parseISO, isValid, startOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Devolucao, KPIs, MotivoCount, TimelineItem, DashboardData, DevolucaoFilters, PaginatedResponse } from '@/types';

// ─── Classificação de motivos ─────────────────────────────────────────────────

const MOTIVOS_OK = ['ok', 'aprovado', 'resolvido', 'concluído', 'aceito', 'conforme'];

export function isMotivo(motivo: string, tipo: 'ok' | 'problema'): boolean {
  const lower = motivo.toLowerCase().trim();
  const isOK = MOTIVOS_OK.some((m) => lower.includes(m));
  return tipo === 'ok' ? isOK : !isOK;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Suporta formatos: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
    /^(\d{4})-(\d{2})-(\d{2})$/, // YYYY-MM-DD
    /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  ];

  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      let isoStr: string;
      if (regex === formats[0]) {
        isoStr = `${match[3]}-${match[2]}-${match[1]}`;
      } else if (regex === formats[2]) {
        isoStr = `${match[3]}-${match[2]}-${match[1]}`;
      } else {
        isoStr = dateStr;
      }
      const d = parseISO(isoStr);
      if (isValid(d)) return d;
    }
  }
  return null;
}

// ─── KPI Computation ─────────────────────────────────────────────────────────

export function computeKPIs(devolucoes: Devolucao[]): KPIs {
  const now = new Date();
  const inicioMes = startOfMonth(now);

  const doMes = devolucoes.filter((d) => {
    const dt = parseDate(d.dataChegada);
    return dt && isWithinInterval(dt, { start: inicioMes, end: now });
  });

  const comResolucao = devolucoes.filter((d) => d.dataDevolucao && d.dataDevolucao.trim() !== '');
  const pendentes = devolucoes.length - comResolucao.length;

  // Dias médios de resolução
  const diasResolucao = comResolucao
    .map((d) => {
      const chegada = parseDate(d.dataChegada);
      const devolucao = parseDate(d.dataDevolucao);
      if (!chegada || !devolucao) return null;
      return (devolucao.getTime() - chegada.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((d): d is number => d !== null && d >= 0);

  const avgDias =
    diasResolucao.length > 0
      ? Math.round(diasResolucao.reduce((a, b) => a + b, 0) / diasResolucao.length)
      : 0;

  const totalOK = devolucoes.filter((d) => isMotivo(d.motivo, 'ok')).length;
  const total = devolucoes.length || 1;

  return {
    totalMes: doMes.length,
    totalGeral: devolucoes.length,
    percentualOK: Math.round((totalOK / total) * 100),
    percentualProblema: Math.round(((total - totalOK) / total) * 100),
    pendentes,
    avgDiasResolucao: avgDias,
  };
}

// ─── Motivo Chart ─────────────────────────────────────────────────────────────

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
    .slice(0, 10); // top 10
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

export function computeTimeline(devolucoes: Devolucao[]): TimelineItem[] {
  const countMap = new Map<string, number>();

  for (const d of devolucoes) {
    const dt = parseDate(d.dataChegada);
    if (!dt) continue;
    const key = format(dt, 'MMM yy', { locale: ptBR });
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
  }

  // Ordena cronologicamente aproximado (mês/ano)
  return Array.from(countMap.entries())
    .map(([date, count]) => ({ date, count }))
    .slice(-12); // últimos 12 meses
}

// ─── Dashboard Aggregator ─────────────────────────────────────────────────────

export function buildDashboardData(devolucoes: Devolucao[]): DashboardData {
  return {
    kpis: computeKPIs(devolucoes),
    motivoChart: computeMotivoChart(devolucoes),
    timeline: computeTimeline(devolucoes),
  };
}

// ─── Filter & Paginate ────────────────────────────────────────────────────────

export function filterAndPaginate(
  devolucoes: Devolucao[],
  filters: DevolucaoFilters
): PaginatedResponse<Devolucao> {
  const { search, nomeCliente, numeroNF, motivo, dataInicio, dataFim } = filters;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  let filtered = devolucoes;

  // Busca global
  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (d) =>
        d.nomeCliente.toLowerCase().includes(term) ||
        d.numeroNF.toLowerCase().includes(term) ||
        d.motivo.toLowerCase().includes(term) ||
        d.codigoPecaQtd.toLowerCase().includes(term)
    );
  }

  // Filtro por cliente
  if (nomeCliente) {
    const term = nomeCliente.toLowerCase();
    filtered = filtered.filter((d) => d.nomeCliente.toLowerCase().includes(term));
  }

  // Filtro por NF
  if (numeroNF) {
    filtered = filtered.filter((d) => d.numeroNF.includes(numeroNF));
  }

  // Filtro por motivo
  if (motivo) {
    filtered = filtered.filter((d) =>
      d.motivo.toLowerCase().includes(motivo.toLowerCase())
    );
  }

  // Filtro por intervalo de data
  if (dataInicio || dataFim) {
    filtered = filtered.filter((d) => {
      const dt = parseDate(d.dataChegada);
      if (!dt) return false;
      if (dataInicio && dt < new Date(dataInicio)) return false;
      if (dataFim && dt > new Date(dataFim)) return false;
      return true;
    });
  }

  const total = filtered.length;
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return { data, total, page, pageSize, totalPages };
}
