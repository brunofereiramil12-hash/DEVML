/**
 * Google Sheets API v4 Client - Versão Corrigida para Vercel
 * Projeto: Dashboard de Devoluções Renault Valec
 */

import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

// ─── Validação das Variáveis de Ambiente ─────────────────────────────────────
// Isso garante que o código não tente rodar se a Vercel não entregar as chaves.
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'Sheet1';
const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (!SPREADSHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
  console.error("❌ ERRO: Variáveis de ambiente GOOGLE_ não encontradas!");
  console.log("Verifique se GOOGLE_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY estão na Vercel.");
}

// ─── Constantes de mapeamento de colunas ─────────────────────────────────────
const COL = {
  DATA_CHEGADA:     0, // A
  NOME_CLIENTE:     1, // B
  NUMERO_NF:          2, // C
  CODIGO_PECA_QTD:    3, // D
  DATA_DEVOLUCAO:     4, // E
  NUMERO_NF_DEV:      5, // F
  MOTIVO:             6, // G
} as const;

const HEADER_ROW = 1; 

// ─── Auth singleton ───────────────────────────────────────────────────────────
let _sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (_sheetsClient) return _sheetsClient;

  // Tratamento da Private Key para aceitar tanto \n quanto quebras reais
  const formattedKey = PRIVATE_KEY?.replace(/\\n/g, '\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: CLIENT_EMAIL,
      private_key: formattedKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  _sheetsClient = google.sheets({ version: 'v4', auth });
  return _sheetsClient;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToRange(rowIndex: number): string {
  const sheetRow = rowIndex + HEADER_ROW;
  return `${SHEET_NAME}!A${sheetRow}:G${sheetRow}`;
}

function rawRowToDevolucao(row: string[], rowIndex: number): Devolucao {
  return {
    rowIndex,
    dataChegada:       row[COL.DATA_CHEGADA]    ?? '',
    nomeCliente:       row[COL.NOME_CLIENTE]    ?? '',
    numeroNF:          row[COL.NUMERO_NF]       ?? '',
    codigoPecaQtd:     row[COL.CODIGO_PECA_QTD] ?? '',
    dataDevolucao:     row[COL.DATA_DEVOLUCAO]  ?? '',
    numeroNFDevolucao: row[COL.NUMERO_NF_DEV]   ?? '',
    motivo:            row[COL.MOTIVO]          ?? '',
  };
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getAllDevolucoes(): Promise<Devolucao[]> {
  const sheets = getSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID!,
      range: `${SHEET_NAME}!A2:G`, 
    });

    const rows = response.data.values ?? [];
    return rows.map((row, index) =>
      rawRowToDevolucao(row as string[], index + 1)
    );
  } catch (error) {
    console.error("Erro ao ler planilha:", error);
    throw new Error("Não foi possível carregar os dados da planilha.");
  }
}

// ─── Write Operations ─────────────────────────────────────────────────────────

export async function appendDevolucao(values: string[]): Promise<void> {
  const sheets = getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID!,
    range: `${SHEET_NAME}!A:G`,
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
    spreadsheetId: SPREADSHEET_ID!,
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
    d.dataChegada        ?? '',
    d.nomeCliente        ?? '',
    d.numeroNF           ?? '',
    d.codigoPecaQtd      ?? '',
    d.dataDevolucao      ?? '',
    d.numeroNFDevolucao  ?? '',
    d.motivo             ?? '',
  ];
}
