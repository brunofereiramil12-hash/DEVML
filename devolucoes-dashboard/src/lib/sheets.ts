/**
 * Google Sheets API v4 Client
 * Responsabilidade: autenticação via Service Account e operações CRUD na planilha.
 * Separation of Concerns: este módulo não conhece lógica de negócio ou HTTP.
 */

import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

// ─── Constantes de mapeamento de colunas ─────────────────────────────────────
// Ordem das colunas conforme a planilha DEV_ML.xlsx
const COL = {
  DATA_CHEGADA:       0, // A
  NOME_CLIENTE:       1, // B
  NUMERO_NF:          2, // C
  CODIGO_PECA_QTD:    3, // D
  DATA_DEVOLUCAO:     4, // E
  NUMERO_NF_DEV:      5, // F
  MOTIVO:             6, // G
} as const;

const HEADER_ROW = 1; // A primeira linha é o cabeçalho
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME ?? 'Sheet1';
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// ─── Auth singleton ───────────────────────────────────────────────────────────
let _sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (_sheetsClient) return _sheetsClient;

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToRange(rowIndex: number): string {
  // rowIndex é 1-based (excluindo header), linha real na planilha = rowIndex + HEADER_ROW
  const sheetRow = rowIndex + HEADER_ROW;
  return `${SHEET_NAME}!A${sheetRow}:G${sheetRow}`;
}

function rawRowToDevolucao(row: string[], rowIndex: number): Devolucao {
  return {
    rowIndex,
    dataChegada:      row[COL.DATA_CHEGADA]    ?? '',
    nomeCliente:      row[COL.NOME_CLIENTE]    ?? '',
    numeroNF:         row[COL.NUMERO_NF]       ?? '',
    codigoPecaQtd:    row[COL.CODIGO_PECA_QTD] ?? '',
    dataDevolucao:    row[COL.DATA_DEVOLUCAO]  ?? '',
    numeroNFDevolucao:row[COL.NUMERO_NF_DEV]   ?? '',
    motivo:           row[COL.MOTIVO]          ?? '',
  };
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Busca todas as linhas de dados (excluindo o cabeçalho).
 * Usa cache: 'no-store' para garantir dados sempre frescos no Next.js.
 */
export async function getAllDevolucoes(): Promise<Devolucao[]> {
  const sheets = getSheetsClient();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A2:G`, // começa na linha 2 para pular o header
  });

  const rows = response.data.values ?? [];

  return rows.map((row, index) =>
    rawRowToDevolucao(row as string[], index + 1) // rowIndex 1-based
  );
}

// ─── Write Operations ─────────────────────────────────────────────────────────

/**
 * Appenda uma nova linha ao final da planilha.
 */
export async function appendDevolucao(values: string[]): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'USER_ENTERED', // interpreta datas corretamente
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [values] },
  });
}

/**
 * Atualiza uma linha específica pelo rowIndex (1-based, sem header).
 */
export async function updateDevolucaoRow(
  rowIndex: number,
  values: string[]
): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: rowToRange(rowIndex),
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

/**
 * Busca o rowIndex de uma devolução pelo número da nota fiscal.
 * Retorna null se não encontrar.
 */
export async function findRowByNF(numeroNF: string): Promise<Devolucao | null> {
  const all = await getAllDevolucoes();
  return all.find((d) => d.numeroNF.trim() === numeroNF.trim()) ?? null;
}

/**
 * Constrói o array de valores na ordem correta das colunas para escrita.
 */
export function buildRowValues(d: Partial<Devolucao>): string[] {
  return [
    d.dataChegada        ?? '',
    d.nomeCliente        ?? '',
    d.numeroNF           ?? '',
    d.codigoPecaQtd      ?? '',
    d.dataDevolucao      ?? '',
    d.numeroNFDevolucao  ?? '',
    d.motivo             ?? '',
  ];
}
