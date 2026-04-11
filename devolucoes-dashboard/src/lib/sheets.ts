import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

// ─── Índices das colunas no range C3:J ───────────────────────────────────────
// C=0  D=1  E=2  F=3  G=4  H=5  I=6(vazia)  J=7
// O Google Sheets trunca colunas vazias no FINAL da linha.
// Col I (idx 6) está vazia → a API pode retornar só até idx 5 se J também estiver vazio.
// Por isso lemos J (motivo) com fallback seguro em row[7] ?? ''.
// Colunas do início (C) também podem estar vazias → deslocamento NÃO ocorre,
// pois o Sheets preserva posições à esquerda como strings vazias ''.

function getSheetsClient(): sheets_v4.Sheets {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não definida na Vercel');

  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(jsonRaw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON inválido — não é um JSON válido');
  }

  if (!credentials.private_key || !credentials.client_email) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON sem private_key ou client_email');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

function getSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME ?? 'Devoluções 2026';
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID não definida');
  return id;
}

// Converte rowIndex (1-based, dados a partir da linha 3) em range A1
function rowToRange(rowIndex: number): string {
  const sheetRow = rowIndex + 2; // rowIndex 1 → linha 3 da planilha
  const name = getSheetName();
  return `'${name}'!C${sheetRow}:J${sheetRow}`;
}

// ─── Normalização de linha bruta → Devolucao ─────────────────────────────────
// Problema raiz: Google Sheets trunca colunas VAZIAS no final de cada linha.
// Se col I (idx 6) está vazia e col J (idx 7) também, a linha tem só 6 elementos.
// Solução: usar valueRenderOption=FORMATTED_VALUE + padding manual até 8 posições.
function rawRowToDevolucao(rawRow: unknown[], rowIndex: number): Devolucao {
  // Garante que a linha sempre tem 8 posições, preenchendo com '' quando truncada
  const row: string[] = Array.from({ length: 8 }, (_, i) => {
    const cell = rawRow[i];
    return typeof cell === 'string' ? cell.trim() : '';
  });

  return {
    rowIndex,
    dataChegada:       row[0], // C
    nomeCliente:       row[1], // D
    numeroNF:          row[2], // E
    codigoPecaQtd:     row[3], // F
    dataDevolucao:     row[4], // G
    numeroNFDevolucao: row[5], // H
    // row[6] = col I — vazia intencionalmente, ignorada
    motivo:            row[7], // J
  };
}

function classifyError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes('invalid_grant') || msg.includes('DECODER'))
    return new Error('Autenticação falhou: credenciais inválidas — ' + msg);

  if (msg.includes('403') || msg.includes('forbidden'))
    return new Error(
      'Permissão negada: compartilhe a planilha com ' +
      'devml-sheets@devml-sheets.iam.gserviceaccount.com como Editor'
    );

  if (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('Unable to parse range')
  )
    return new Error('Planilha/aba não encontrada: ' + msg);

  return new Error('Erro Google Sheets: ' + msg);
}

// ─── Leitura ──────────────────────────────────────────────────────────────────
export async function getAllDevolucoes(): Promise<Devolucao[]> {
  const sheets = getSheetsClient();
  const sheetName = getSheetName();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `'${sheetName}'!C3:J`,
      // FORMATTED_VALUE preserva datas como strings "dd/MM/yyyy" e não como serial numbers
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const rows = response.data.values ?? [];

    return rows
      // Remove linhas completamente vazias
      .filter((row) => row.some((cell) => cell !== null && cell !== ''))
      .map((row, index) =>
        rawRowToDevolucao(row, index + 1) // rowIndex 1-based
      );
  } catch (err) {
    throw classifyError(err);
  }
}

// ─── Escrita ──────────────────────────────────────────────────────────────────
export async function appendDevolucao(values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  const sheetName = getSheetName();

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `'${sheetName}'!C:J`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

export async function updateDevolucaoRow(
  rowIndex: number,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSpreadsheetId(),
    range: rowToRange(rowIndex),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export async function findRowByNF(numeroNF: string): Promise<Devolucao | null> {
  const all = await getAllDevolucoes();
  return all.find((d) => d.numeroNF.trim() === numeroNF.trim()) ?? null;
}

// Monta array de 8 posições respeitando as colunas C→J (col I sempre vazia)
export function buildRowValues(d: Partial<Devolucao>): string[] {
  return [
    d.dataChegada        ?? '', // C (idx 0)
    d.nomeCliente        ?? '', // D (idx 1)
    d.numeroNF           ?? '', // E (idx 2)
    d.codigoPecaQtd      ?? '', // F (idx 3)
    d.dataDevolucao      ?? '', // G (idx 4)
    d.numeroNFDevolucao  ?? '', // H (idx 5)
    '',                         // I (idx 6) — vazia intencionalmente
    d.motivo             ?? '', // J (idx 7)
  ];
}
