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
  if (looksLikeJson)            diagnosis = '❌ Você colou o JSON inteiro — cole só o valor de "private_key"';
  else if (!hasBegin || !hasEnd) diagnosis = '❌ Sem marcadores BEGIN/END — chave incompleta';
  else if (!hasRealBreaks && !hasEscapedN) diagnosis = '❌ Sem quebras de linha — verifique como foi copiada';
  else if (hasRealBreaks)       diagnosis = '✅ Formato correto';
  else if (hasEscapedN)         diagnosis = '✅ Tem \\n — será convertido automaticamente';
  return { exists: true, length: raw.length, hasBegin, hasEnd, hasRealBreaks, hasEscapedN, looksLikeJson,
    firstChars: raw.slice(0, 50).replace(/\n/g, '↵'),
    lastChars: raw.slice(-50).replace(/\n/g, '↵'), diagnosis };
}

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail   = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const sheetName     = process.env.GOOGLE_SHEET_NAME
