/**
 * GET  /api/devolucoes  — lista com filtros e paginação (server-side)
 * POST /api/devolucoes  — registra nova devolução
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllDevolucoes, appendDevolucao, buildRowValues } from '@/lib/sheets';
import { filterAndPaginate } from '@/lib/analytics';
import { createDevolucaoSchema } from '@/lib/validations';
import type { DevolucaoFilters } from '@/types';

export const dynamic = 'force-dynamic';

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;

    const filters: DevolucaoFilters = {
      search:      searchParams.get('search')      ?? undefined,
      nomeCliente: searchParams.get('nomeCliente') ?? undefined,
      numeroNF:    searchParams.get('numeroNF')    ?? undefined,
      motivo:      searchParams.get('motivo')      ?? undefined,
      dataInicio:  searchParams.get('dataInicio')  ?? undefined,
      dataFim:     searchParams.get('dataFim')     ?? undefined,
      page:        Number(searchParams.get('page') ?? 1),
      pageSize:    Number(searchParams.get('pageSize') ?? 20),
    };

    const all = await getAllDevolucoes();
    const result = filterAndPaginate(all, filters);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[GET /api/devolucoes] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao buscar devoluções' },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createDevolucaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const values = buildRowValues(parsed.data);
    await appendDevolucao(values);

    return NextResponse.json(
      { success: true, message: 'Devolução registrada com sucesso' },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/devolucoes] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao registrar devolução' },
      { status: 500 }
    );
  }
}
