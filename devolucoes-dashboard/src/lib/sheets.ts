import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

const COL = {
  DATA_CHEGADA: 0,
  NOME_CLIENTE: 1,
  NUMERO_NF: 2,
  CODIGO_PECA_QTD: 3,
  DATA_DEVOLUCAO: 4,
  NUMERO_NF_DEV: 5,
  MOTIVO: 6,
} as const;

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) {
    throw new Error('GOOGLE_PRIVATE_KEY nao definida na Vercel');
  }
  let key = raw.trim();
  if (key.startsWith('{')) {
    try {
      const p = JSON.parse(key);
      key = p.private_key ?? p.privateKey ?? key;
    } catch (_) {}
  }
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n');
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    throw new Error('GOOGLE_PRIVATE_KEY invalida - sem marcadores BEGIN/END');
  }
  return key;
}

function getSheetsClient(): sheets_v4.Sheets {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SPREADSHEET_ID nao definida na Vercel');
  }
  if (!clientEmail) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL nao definida na Vercel');
  }
  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function getSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME ?? 'Sheet1';
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID nao definida');
  return id;
}

function rowToRange(rowIndex: number): string {
  const sheetRow = rowIndex + 2;
  return `${getSheetName()}!B${sheetRow}:H${sheetRow}`;
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
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${getSheetName()}!B3:H`,
    });
    const rows = response.data.values ?? [];
    return rows.map((row, index) =>
      rawRowToDevolucao(row as string[], index + 1)
    );
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    if (msg.includes('invalid_grant') || msg.includes('DECODER')) {
      throw new Error('Autenticacao falhou: PRIVATE_KEY malformada');
    }
    if (msg.includes('403') || msg.includes('forbidden')) {
      throw new Error(
        'Permissao negada: compartilhe a planilha com ' +
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL +
        ' como Editor'
      );
    }
    if (msg.includes('404') || msg.includes('not found')) {
      throw new Error(
        'Planilha nao encontrada: verifique GOOGLE_SPREADSHEET_ID e GOOGLE_SHEET_NAME'
      );
    }
    throw new Error('Erro Google Sheets: ' + msg);
  }
}

export async function appendDevolucao(values: string[]): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${getSheetName()}!A:G`,
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
    d.motivo ?? '',
  ];
}
