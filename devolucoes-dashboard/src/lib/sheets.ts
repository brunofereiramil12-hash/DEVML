import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

const COL = {
  DATA_CHEGADA: 0, NOME_CLIENTE: 1, NUMERO_NF: 2,
  CODIGO_PECA_QTD: 3, DATA_DEVOLUCAO: 4, NUMERO_NF_DEV: 5, MOTIVO: 6,
} as const;

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) throw new Error('GOOGLE_PRIVATE_KEY não definida na Vercel');
  let key = raw.trim();
  if (key.startsWith('{')) {
    try { const p = JSON.parse(key); key = p.private_key ?? p.privateKey ?? key; } catch {}
  }
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  key = key.replace(/\\n/g, '\n');
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    throw new Error('GOOGLE_PRIVATE_KEY inválida — sem marcadores BEGIN/END. Acesse /api/debug');
  }
  return key;
}

function getSheetsClient(): sheets_v4.Sheets {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!spreadsheetId) throw new Error('GOOGLE_SPREADSHEET_ID não definida na Vercel');
  if (!clientEmail) throw new Error('GOOGLE_SERVICE_ACCOUNT_EMAIL não definida na Vercel');
  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function getSheetName() { return process.env.GOOGLE_SHEET_NAME ?? 'Sheet1'; }
function getSpreadsheetId() {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID não definida');
  return id;
}

function rowToRange(rowIndex: number): string {
  return `${getSheetName()}!A${rowIndex + 1}:G${rowIndex + 1}`;
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

export async function getAllDevolucoes
