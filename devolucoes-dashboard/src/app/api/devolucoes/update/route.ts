/**
 * PATCH /api/devolucoes/update
 * Localiza uma linha por número de NF e atualiza os campos de status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { findRowByNF, updateDevolucaoRow, buildRowValues } from '@/lib/sheets';
import { updateDevolucaoSchema } from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updateDevolucaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Dados inválidos', details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const { numeroNF, dataDevolucao, numeroNFDevolucao, motivo } = parsed.data;

    // Localiza a linha na planilha
    const existingRow = await findRowByNF(numeroNF);
    if (!existingRow) {
      return NextResponse.json(
        { success: false, error: `Nota Fiscal "${numeroNF}" não encontrada na planilha` },
        { status: 404 }
      );
    }

    // Mescla os dados existentes com os campos atualizados
    const updatedValues = buildRowValues({
      ...existingRow,
      dataDevolucao,
      numeroNFDevolucao,
      motivo,
    });

    await updateDevolucaoRow(existingRow.rowIndex, updatedValues);

    return NextResponse.json({
      success: true,
      message: `Devolução NF ${numeroNF} atualizada com sucesso`,
    });
  } catch (error) {
    console.error('[PATCH /api/devolucoes/update] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao atualizar devolução' },
      { status: 500 }
    );
  }
}
