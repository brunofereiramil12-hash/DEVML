import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

function diagnoseKey(raw: string | undefined) {
  if (!raw) return { exists: false, diagnosis: '❌ GOOGLE_PRIVATE_KEY não definida' };
  const looksLikeJson = raw.trim().startsWith('{');
  const hasBegin = raw.includes('-----BEGIN');
  const hasEnd = raw.includes('-----END');
  const hasRealBreaks = raw.includes('\n');
  const hasEscapedN = raw.includes('\\n');
  let diagnosis = '';
  if (looksLikeJson) diagnosis = '❌ Você colou o JSON inteiro';
  else if (!hasBegin || !hasEnd) diagnosis = '❌ Sem marcadores BEGIN/END';
  else if (!hasRealBreaks && !hasEscapedN) diagnosis = '❌ Sem quebras de linha';
  else if (hasRealBreaks) diagnosis = '✅ Formato correto';
  else diagnosis = '✅ Tem \\n — será convertido';
  return {
    exists: true,
    length: raw.length,
    hasBegin,
    hasEnd,
    hasRealBreaks,
    hasEscapedN,
    looksLikeJson,
    firstChars: raw.slice(0, 50).replace(/\n/g, '↵'),
    lastChars: raw.slice(-50).replace(/\n/g, '↵'),
    diagnosis,
  };
}

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? 'Sheet1';
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  let connectionTest: { ok: boolean; rowCount?: number; error?: string } = { ok: false };

  if (spreadsheetId && clientEmail && privateKey) {
    try {
      const { getAllDevolucoes } = await import('@/lib/sheets');
      const rows = await getAllDevolucoes();
      connectionTest = { ok: true, rowCount: rows.length };
    } catch (err: any) {
      connectionTest = { ok: false, error: err?.message ?? String(err) };
    }
  }

  return NextResponse.json(
    {
      timestamp: new Date().toISOString(),
      envVars: {
        GOOGLE_SPREADSHEET_ID: spreadsheetId ? '✅ ' + spreadsheetId.slice(0, 10) + '...' : '❌ Não definido',
        GOOGLE_SERVICE_ACCOUNT_EMAIL: clientEmail ? '✅ ' + clientEmail : '❌ Não definido',
        GOOGLE_SHEET_NAME: '✅ ' + sheetName,
        GOOGLE_PRIVATE_KEY: diagnoseKey(privateKey),
      },
      connectionTest,
    },
    {
      status: connectionTest.ok ? 200 : 500,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
