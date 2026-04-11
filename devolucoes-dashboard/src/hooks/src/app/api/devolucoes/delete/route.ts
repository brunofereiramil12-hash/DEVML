import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { findRowByNF } from '@/lib/sheets';

export const dynamic = 'force-dynamic';

function getSheetsClient() {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não definida');
  const credentials = JSON.parse(jsonRaw);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID não definida');
  return id;
}

async function getSheetId(): Promise<number> {
  const sheets = getSheetsClient();
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Devoluções 2026';
  const res = await sheets.spreadsheets.get({ spreadsheetId: getSpreadsheetId() });
  const sheet = res.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );
  if (!sheet?.properties?.sheetId == null) {
    throw new Error(`Aba "${sheetName}" não encontrada`);
  }
  return sheet.properties!.sheetId!;
}

// DELETE /api/devolucoes/delete?numeroNF=123456
export async function DELETE(req: NextRequest) {
  try {
    const numeroNF = req.nextUrl.searchParams.get('numeroNF');
    if (!numeroNF?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro numeroNF é obrigatório' },
        { status: 400 }
      );
    }

    // Localiza a linha
    const existing = await findRowByNF(numeroNF.trim());
    if (!existing) {
      return NextResponse.json(
        { success: false, error: `NF ${numeroNF} não encontrada na planilha` },
        { status: 404 }
      );
    }

    // rowIndex é 1-based, dados começam na linha 3 da planilha
    // linha real na planilha = rowIndex + 2
    const sheetRowIndex = existing.rowIndex + 2 - 1; // 0-based para a API batchUpdate

    const sheetId = await getSheetId();
    const sheets = getSheetsClient();

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: sheetRowIndex,      // 0-based, inclusivo
                endIndex: sheetRowIndex + 1,    // 0-based, exclusivo
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true, message: `NF ${numeroNF} removida com sucesso` });
  } catch (error) {
    console.error('[DELETE /api/devolucoes/delete] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao remover devolução' },
      { status: 500 }
    );
  }
}
