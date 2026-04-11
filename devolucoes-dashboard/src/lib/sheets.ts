import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

const COL = {
  DATA_CHEGADA: 0,
  NOME_CLIENTE: 1,
  NUMERO_NF: 2,
  CODIGO_PECA_QTD: 3,
  DATA_DEVOLUCAO: 4,
  NUMERO_NF_DEV: 5,
  NUMERO_NF_DEV2: 6,
  MOTIVO: 7,
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
  return `'${getSheetName()}'!B${sheetRow}:I${sheetRow}`;
}

function rawRowToDevolucao(row: string[], rowIndex: number): Devolucao {
  return {
    rowIndex,
    dataChegada: row[COL.DATA_CHEGADA] ?? '',
    nomeCliente: row[COL.NOME_CLIENTE] ?? '',
    numeroNF: row[COL.NUMERO_NF] ?? '',
    codigoPecaQtd: row[COL.CODIGO_PECA_QTD] ?? '',
    dataDevolucao: row[COL.DATA_DEVOLUCAO] ?? '',
    numeroNFDevolucao: row[COL.NUMERO_NF_DEV] ?? '',
    motivo: row[COL.MOTIVO] ?? '',
  };
}

export async function getAllDevolucoes(): Promise<Devolucao[]> {
  const sheets = getSheetsClient();
  const sheetName = getSheetName();
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `'${sheetName}'!B3:I`,
    });
    const rows = response.data.values ?? [];
    return rows.map((row, index) =>
      rawRowToDevolucao(row as string[], index + 1)
    );
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
    range: `'${sheetName}'!B:I`,
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
    d.dataChegada ?? '',
    d.nomeCliente ?? '',
    d.numeroNF ?? '',
    d.codigoPecaQtd ?? '',
    d.dataDevolucao ?? '',
    d.numeroNFDevolucao ?? '',
    '',
    d.motivo ?? '',
  ];
}
