/**
 * GET /api/dashboard
 * Retorna KPIs, gráfico de motivos e timeline.
 * cache: 'no-store' garante que o Next.js não sirva dados stale do cache.
 */

import { NextResponse } from 'next/server';
import { getAllDevolucoes } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/analytics';

export const dynamic = 'force-dynamic'; // equivale a cache: 'no-store' para route handlers

export async function GET() {
  try {
    const devolucoes = await getAllDevolucoes();
    const dashboard = buildDashboardData(devolucoes);

    return NextResponse.json(
      { success: true, data: dashboard },
      {
        headers: {
          // Sem cache no CDN/browser para dados ao vivo
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('[/api/dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao carregar dados do dashboard' },
      { status: 500 }
    );
  }
}
