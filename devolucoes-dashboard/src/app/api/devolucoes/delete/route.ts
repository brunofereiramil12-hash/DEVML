import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { findRowByNF, getAllDevolucoes } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function getSheetId(): Promise<number> {
  const sheets = getSheetsClient();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Devoluções 2026';
  const res = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
  });
  const sheet = res.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheet || sheet.properties?.sheetId == null) {
    throw new Error(`Aba "${sheetName}" não encontrada`);
  }
  return sheet.properties.sheetId;
}

async function deleteRowByIndex(startIndex: number) {
  const sheetId = await getSheetId();
  const sheets = getSheetsClient();
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID!,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex,
              endIndex: startIndex + 1,
            },
          },
        },
      ],
    },
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const numeroNF = req.nextUrl.searchParams.get('numeroNF');
    const rowIndexParam = req.nextUrl.searchParams.get('rowIndex');

    // Caso 1: tem numeroNF → busca pelo NF
    if (numeroNF?.trim()) {
      const existing = await findRowByNF(numeroNF.trim());
      if (!existing) {
        return NextResponse.json(
          { success: false, error: `NF ${numeroNF} não encontrada` },
          { status: 404 }
        );
      }
      await deleteRowByIndex(existing.rowIndex + 1);
      return NextResponse.json({
        success: true,
        message: `NF ${numeroNF} removida com sucesso`,
      });
    }

    // Caso 2: sem numeroNF → usa rowIndex direto
    if (rowIndexParam) {
      const rowIndex = parseInt(rowIndexParam, 10);
      if (isNaN(rowIndex) || rowIndex < 1) {
        return NextResponse.json(
          { success: false, error: 'rowIndex inválido' },
          { status: 400 }
        );
      }
      await deleteRowByIndex(rowIndex + 1);
      return NextResponse.json({
        success: true,
        message: `Linha ${rowIndex} removida com sucesso`,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Informe numeroNF ou rowIndex' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[DELETE /api/devolucoes/delete] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao remover devolução' },
      { status: 500 }
    );
  }
}
