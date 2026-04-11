import { NextResponse } from 'next/server';
import { getAllDevolucoes } from '@/lib/sheets';
import { buildDashboardData } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const devolucoes = await getAllDevolucoes();
    const data = buildDashboardData(devolucoes);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/sheets/dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao carregar dashboard' },
      { status: 500 }
    );
  }
}
