import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function diagnosePrivateKey(raw: string | undefined) {
  if (!raw) {
    return {
      exists: false, length: 0, hasBeginMarker: false, hasEndMarker: false,
      hasRealLineBreaks: false, hasDoubleEscapedN: false, looksLikeJson: false,
      hasOuterQuotes: false, firstChars: '', lastChars: '',
      diagnosis: '❌ GOOGLE_PRIVATE_KEY não está definida na Vercel',
    };
  }
  const hasBeginMarker    = raw.includes('-----BEGIN');
  const hasEndMarker      = raw.includes('-----END');
  const hasRealLineBreaks = raw.includes('\n');
  const hasDoubleEscapedN = raw.includes('\\n');
  const looksLikeJson     = raw.trim().startsWith('{');
  const hasOuterQuotes    = raw.trim().startsWith('"') && raw.trim().endsWith('"');
  let diagnosis = '';
  if (looksLikeJson)                          diagnosis = '❌ Você colou o JSON inteiro. Cole APENAS o valor do campo "private_key".';
  else if (!hasBeginMarker || !hasEndMarker)  diagnosis = '❌ Não encontrei BEGIN/END. Chave incompleta.';
  else if (!hasRealLineBreaks && !hasDoubleEscapedN) diagnosis = '❌ Sem quebras de linha. Verifique como foi copiada.';
  else if (hasRealLineBreaks)                 diagnosis = '✅ Formato correto — quebras de linha reais.';
  else if (hasDoubleEscapedN)                 diagnosis = '✅ Formato com \\n — será convertido automaticamente.';
  else                                        diagnosis = '⚠️ Formato incerto.';
  return {
    exists: true, length: raw.length, hasBeginMarker, hasEndMarker,
    hasRealLineBreaks, hasDoubleEscapedN, looksLikeJson, hasOuterQuotes,
    firstChars: raw.slice(0, 40).replace(/\n/g, '↵'),
    lastChars:  raw.slice(-40).replace(/\n/g, '↵'),
    diagnosis,
  };
}

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail   = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetName     = process.env.GOOGLE_SHEET_NAME ?? 'Sheet1 (default)';
  const privateKey    = process.env.GOOGLE_PRIVATE_KEY;
  const keyDiagnosis  = diagnosePrivateKey(privateKey);

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

  return NextResponse.json({
    timestamp:   new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? 'local',
    envVars: {
      GOOGLE_SPREADSHEET_ID:        { defined: !!spreadsheetId, value: spreadsheetId ? `${spreadsheetId.slice(0,10)}...${spreadsheetId.slice(-6)}` : null, status: spreadsheetId ? '✅ Definido' : '❌ Não definido' },
      GOOGLE_SERVICE_ACCOUNT_EMAIL: { defined: !!clientEmail,   value: clientEmail ?? null, status: clientEmail ? '✅ Definido' : '❌ Não definido' },
      GOOGLE_SHEET_NAME:            { defined: true, value: sheetName, status: '✅ OK' },
      GOOGLE_PRIVATE_KEY:           keyDiagnosis,
    },
    connectionTest,
  }, { status: connectionTest.ok ? 200 : 500, headers: { 'Cache-Control': 'no-store' } });
}
