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

    // Localiza a linha pelo número da NF
    const existing = await findRowByNF(numeroNF);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `NF ${numeroNF} não encontrada na planilha` },
        { status: 404 }
      );
    }

    // Mescla dados existentes com os novos campos
    const updated = buildRowValues({
      ...existing,
      dataDevolucao,
      numeroNFDevolucao,
      motivo,
    });

    await updateDevolucaoRow(existing.rowIndex, updated);

    return NextResponse.json({ success: true, message: 'Devolução atualizada com sucesso' });
  } catch (error) {
    console.error('[PATCH /api/devolucoes/update] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao atualizar devolução' },
      { status: 500 }
    );
  }
}
