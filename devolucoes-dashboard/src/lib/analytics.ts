import { format, isValid, startOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Devolucao, KPIs, MotivoCount, TimelineItem, DashboardData, DevolucaoFilters, PaginatedResponse } from '@/types';

export function isMotivo(motivo: string, tipo: 'ok' | 'problema'): boolean {
  const lower = motivo.toLowerCase().trim();
  const palavrasOK = ['aprovado', 'resolvido', 'concluido', 'aceito', 'conforme'];
  const isOK = lower === 'ok' || palavrasOK.some((m) => lower.includes(m));
  return tipo === 'ok' ? isOK : !isOK;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const s = dateStr.trim();

  // DD/MM/YYYY
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    const d = new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
    if (isValid(d)) return d;
  }

  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m2) {
    const d = parseISO(s);
    if (isValid(d)) return d;
  }

  // DD-MM-YYYY
  const m3 = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m3) {
    const d = new Date(Number(m3[3]), Number(m3[2]) - 1, Number(m3[1]));
    if (isValid(d)) return d;
  }

  return null;
}

export function computeKPIs(devolucoes: Devolucao[]): KPIs {
  const now = new Date();
  const inicioMes = startOfMonth(now);

  const doMes = devolucoes.filter((d) => {
    const dt = parseDate(d.dataChegada);
    return dt && isWithinInterval(dt, { start: inicioMes, end: now });
  });

  const comResolucao = devolucoes.filter((d) => d.dataDevolucao && d.dataDevolucao.trim() !== '');
  const pendentes = devolucoes.length - comResolucao.length;

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
