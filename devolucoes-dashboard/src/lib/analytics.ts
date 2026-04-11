export function isMotivo(motivo: string, tipo: 'ok' | 'problema'): boolean {
  const lower = motivo.toLowerCase().trim();
  const palavrasOK = ['aprovado', 'resolvido', 'concluído', 'aceito', 'conforme'];
  const isOK = lower === 'ok' || palavrasOK.some((m) => lower.includes(m));
  return tipo === 'ok' ? isOK : !isOK;
}
  // "OK" sozinho OU contém palavras de resolução
  const isOK = lower === 'ok' || ['aprovado', 'resolvido', 'concluído', 'aceito', 'conforme'].some((m) => lower.includes(m));
  return tipo === 'ok' ? isOK : !isOK;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function parseDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  const formats = [
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
  ];
  for (const regex of formats) {
    const match = dateStr.match(regex);
    if (match) {
      let isoStr: string;
      if (regex === formats[0] || regex === formats[2]) {
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
    countMap.set(key, (countMa
