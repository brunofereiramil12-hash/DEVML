import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

const COL = {
  DATA_CHEGADA:    0,  // C
  NOME_CLIENTE:    1,  // D
  NUMERO_NF:       2,  // E
  CODIGO_PECA_QTD: 3,  // F
  DATA_DEVOLUCAO:  4,  // G
  NUMERO_NF_DEV:   5,  // H
  // idx 6 = col I (vazia na planilha — Google Sheets trunca aqui)
  MOTIVO:          6,  // I → mas na planilha é J; lido via range C3:I separado abaixo
} as const;

function getSheetsClient(): sheets_v4.Sheets {
  const jsonRaw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!jsonRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON nao definida na Vercel');

  let credentials: any;
  try {
    credentials = JSON.parse(jsonRaw);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON invalido - nao e um JSON valido');
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
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID nao definida');
  return id;
}

function rowToRange(rowIndex: number): string {
  const sheetRow = rowIndex + 3;
  return `'${getSheetName()}'!C${sheetRow}:J${sheetRow}`;
}

function rawRowToDevolucao(row: string[], rowIndex: number): Devolucao {
  // Col I (idx 6) está vazia — Google Sheets trunca a linha antes de chegar em J.
  // Solução: buscar C3:J mas ler motivo sempre no idx 7 (col J).
  // Se row.length < 8, motivo fica "" — tratado no analytics como "Nao informado".
  // Para evitar isso usamos valueRenderOption FORMATTED_VALUE que preserva células vazias
  // entre colunas preenchidas quando há valor depois delas.
  return {
    rowIndex,
    dataChegada:       row[0] ?? '',
    nomeCliente:       row[1] ?? '',
    numeroNF:          row[2] ?? '',
    codigoPecaQtd:     row[3] ?? '',
    dataDevolucao:     row[4] ?? '',
    numeroNFDevolucao: row[5] ?? '',
    motivo:            row[7] ?? '',  // col J — pula col I vazia (idx 6)
  };
}

export async function getAllDevolucoes(): Promise<Devolucao[]> {
  const sheets = getSheetsClient();
  const sheetName = getSheetName();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `'${sheetName}'!C3:J`,
      valueRenderOption: 'FORMATTED_VALUE',
    });
    const rows = response.data.values ?? [];
    return rows
      .filter((row) => row.some((cell) => cell !== null && cell !== ''))
      .map((row, index) => rawRowToDevolucao(row as string[], index + 1));
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes('invalid_grant') || msg.includes('DECODER')) {
      throw new Error('Autenticacao falhou: credenciais invalidas - ' + msg);
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      throw new Error('Permissao negada: compartilhe a planilha com devml-sheets@devml-sheets.iam.gserviceaccount.com como Editor');
    }
    if (msg.includes('404') || msg.includes('not found') || msg.includes('Unable to parse range')) {
      throw new Error('Planilha/aba nao encontrada: ' + msg);
    }
    throw new Error('Erro Google Sheets: ' + msg);
  }
}

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

export async function findRowByNF(numeroNF: string): Promise<Devolucao | null> {
  const all = await getAllDevolucoes();
  return all.find((d) => d.numeroNF.trim() === numeroNF.trim()) ?? null;
}

export function buildRowValues(d: Partial<Devolucao>): string[] {
  return [
    d.dataChegada        ?? '',  // C
    d.nomeCliente        ?? '',  // D
    d.numeroNF           ?? '',  // E
    d.codigoPecaQtd      ?? '',  // F
    d.dataDevolucao      ?? '',  // G
    d.numeroNFDevolucao  ?? '',  // H
    '',                          // I vazia
    d.motivo             ?? '',  // J
  ];
}
