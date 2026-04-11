import { Devolucao } from "./sheets";

// ─── parseDate ────────────────────────────────────────────────────────────────
/**
 * Converte "DD/MM/YYYY" → Date local (sem conversão UTC para evitar off-by-one
 * com timezone BR / UTC-3).
 *
 * Tolerâncias implementadas:
 *  - Espaços/tabs extras
 *  - Separador "/" ou "-"
 *  - Datas com 1 dígito no dia ou mês ("1/5/2026" → válido)
 *  - Retorna null para string vazia ou formato não reconhecido
 */
export function parseDate(raw: string): Date | null {
  if (!raw) return null;

  const clean = raw.trim().replace(/[\u00A0\s]+/g, "");
  if (!clean) return null;

  // Aceita DD/MM/YYYY ou D/M/YYYY (separador / ou -)
  const match = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (!match) return null;

  const day   = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-based
  const year  = parseInt(match[3], 10);

  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  // Cria como data local (não UTC) para evitar drift de timezone
  const d = new Date(year, month, day);

  // Valida que o Date não normalizou (ex: 31/02 → março)
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) {
    return null;
  }

  return d;
}

// ─── isMotivo ─────────────────────────────────────────────────────────────────
/**
 * Retorna true se o motivo representa "OK" (devolução aceita/resolvida).
 * Case-insensitive + trim para lidar com variações da planilha.
 */
export function isMotivo(motivo: string, tipo: "ok"): boolean {
  const norm = motivo.trim().toUpperCase();
  if (tipo === "ok") return norm === "OK";
  return false;
}

// ─── Helpers de data local ────────────────────────────────────────────────────

/** Mês local no formato "YYYY-MM" */
function toYearMonth(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** True se a data pertence ao mesmo mês/ano que hoje (fuso local) */
function isCurrentMonth(d: Date): boolean {
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

// ─── Tipos de saída ───────────────────────────────────────────────────────────

export interface AnalyticsSummary {
  total: number;
  totalThisMonth: number;
  motivoCounts: Record<string, number>;
  avgResolutionDays: number | null;
  timeline: { month: string; count: number }[];
  okPercentage: number;
}

// ─── computeAnalytics ─────────────────────────────────────────────────────────

export function computeAnalytics(devolucoes: Devolucao[]): AnalyticsSummary {
  const total = devolucoes.length;

  // ── Motivos ──────────────────────────────────────────────────────────────
  const motivoCounts: Record<string, number> = {};
  let okCount = 0;

  for (const d of devolucoes) {
    const motivo = d.motivo.trim() || "SEM MOTIVO";
    motivoCounts[motivo] = (motivoCounts[motivo] ?? 0) + 1;

    if (isMotivo(d.motivo, "ok")) okCount++;
  }

  const okPercentage = total > 0 ? Math.round((okCount / total) * 100) : 0;

  // ── Total no mês ─────────────────────────────────────────────────────────
  // Usa DATA_CHEGADA; se vazia, usa DATA_DEVOLUCAO como fallback
  let totalThisMonth = 0;
  for (const d of devolucoes) {
    const dt = parseDate(d.dataChegada) ?? parseDate(d.dataDevolucao);
    if (dt && isCurrentMonth(dt)) totalThisMonth++;
  }

  // ── Média de resolução ────────────────────────────────────────────────────
  let sumDays = 0;
  let countResolved = 0;

  for (const d of devolucoes) {
    const chegada   = parseDate(d.dataChegada);
    const devolucao = parseDate(d.dataDevolucao);
    if (!chegada || !devolucao) continue;

    const diffMs   = devolucao.getTime() - chegada.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    // Aceita apenas diffs positivos ou zero (devolução >= chegada)
    if (diffDays >= 0) {
      sumDays += diffDays;
      countResolved++;
    }
  }

  const avgResolutionDays =
    countResolved > 0 ? Math.round(sumDays / countResolved) : null;

  // ── Timeline ──────────────────────────────────────────────────────────────
  // Agrupa por mês de DATA_CHEGADA; fallback para DATA_DEVOLUCAO
  const timelineMap: Record<string, number> = {};

  for (const d of devolucoes) {
    const dt = parseDate(d.dataChegada) ?? parseDate(d.dataDevolucao);
    if (!dt) continue;

    const key = toYearMonth(dt);
    timelineMap[key] = (timelineMap[key] ?? 0) + 1;
  }

  const timeline = Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  return {
    total,
    totalThisMonth,
    motivoCounts,
    avgResolutionDays,
    timeline,
    okPercentage,
  };
}
