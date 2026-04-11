/**
 * Google Sheets API v4 Client — Versão Corrigida
 *
 * CORREÇÕES APLICADAS:
 * 1. Private key: trata todos os cenários de escape da Vercel (simples, duplo e JSON inteiro)
 * 2. Validação de env vars no startup com mensagem clara
 * 3. Sem singleton no cliente (evita credencial stale entre hot-reloads no dev)
 * 4. Erros sempre relançados com mensagem legível
 */

import { google, sheets_v4 } from 'googleapis';
import type { Devolucao } from '@/types';

// ─── Mapeamento de colunas ────────────────────────────────────────────────────

const COL = {
  DATA_CHEGADA:      0, // A
  NOME_CLIENTE:      1, // B
  NUMERO_NF:         2, // C
  CODIGO_PECA_QTD:   3, // D
  DATA_DEVOLUCAO:    4, // E
  NUMERO_NF_DEV:     5, // F
  MOTIVO:            6, // G
} as const;

const HEADER_ROW = 1;

// ─── Parsing seguro da PRIVATE_KEY ───────────────────────────────────────────
//
// A Vercel pode entregar a chave em 3 formatos diferentes dependendo de como
// foi colada no painel:
//
//  Caso 1 — Colado como JSON inteiro (erro comum):
//    { "private_key": "-----BEGIN...\\n...-----END...\\n" }
//
//  Caso 2 — Colado como string com escape duplo (\\n):
//    -----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n
//
//  Caso 3 — Colado corretamente com escape simples (\n):
//    -----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n
//
// Esta função normaliza os 3 casos para quebras de linha reais.

function parsePrivateKey(raw: string | undefined): string {
  if (!raw) {
    throw new Error(
      'GOOGLE_PRIVATE_KEY não está definida. ' +
      'Configure a variável de ambiente na Vercel e faça Redeploy.'
    );
  }

  let key = raw.trim();

  // Caso 1: foi colado o JSON inteiro — extrair só o valor de private_key
  if (key.startsWith('{')) {
    try {
      const parsed = JSON.parse(key);
      key = parsed.private_key ?? parsed.privateKey ?? key;
    } catch {
      // não era JSON válido, continua com a string original
    }
  }

  // Remove aspas externas se existirem (colado com "..." no campo da Vercel)
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }

  // Normaliza \\n (escape duplo) → \n (quebra real)
  key = key.replace(/\\n/g, '\n');

  // Valida que a chave tem a estrutura mínima esperada
  if (!key.includes('-----BEGIN') || !key.includes('-----END')) {
    throw new Error(
      'GOOGLE_PRIVATE_KEY parece inválida — não encontrou os marcadores BEGIN/END. ' +
      'Verifique se copiou apenas o campo "private_key" do arquivo JSON do Google.'
    );
  }

  return key;
}

// ─── Criação do cliente Sheets ────────────────────────────────────────────────
//
// Não usa singleton para evitar credencial stale entre hot-reloads.
// O custo de recriar o cliente é irrelevante comparado à latência da API.

function getSheetsClient(): sheets_v4.Sheets {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail    = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;

  if (!spreadsheetId) {
    throw new Error(
      'GOOGLE_SPREADSHEET_ID não está definida. ' +
      'É o ID que aparece na URL da planilha: /spreadsheets/d/ESTE_VALOR/edit'
    );
  }

  if (!clientEmail) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_EMAIL não está definida. ' +
      'É o email do Service Account, ex: nome@projeto.iam.gserviceaccount.com'
    );
  }

  const privateKey = parsePrivateKey(process.env.GOOGLE_PRIVATE_KEY);

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key:  privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// ─── Constantes ───────────────────────────────────────────────────────────────

function getSheetName(): string {
  return process.env.GOOGLE_SHEET_NAME ?? 'Sheet1';
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SPREADSHEET_ID;
  if (!id) throw new Error('GOOGLE_SPREADSHEET_ID não definida');
  return id;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function rowToRange(rowIndex: number): string {
  const sheetRow = rowIndex + HEADER_ROW;
  return `${getSheetName()}!A${sheetRow}:G${sheetRow}`;
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

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAllDevolucoes(): Promise<Devolucao[]> {
  const sheets = getSheetsClient();

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${getSheetName()}!A2:G`,
    });

    const rows = response.data.values ?? [];
    return rows.map((row, index) =>
      rawRowToDevolucao(row as string[], index + 1)
    );
  } catch (err: any) {
    // Transforma erros do Google em mensagens legíveis
    const msg = err?.message ?? String(err);

    if (msg.includes('invalid_grant') || msg.includes('DECODER routines')) {
      throw new Error(
        'Autenticação falhou: a PRIVATE_KEY está malformada. ' +
        'Acesse /api/debug para diagnosticar.'
      );
    }
    if (msg.includes('forbidden') || msg.includes('403')) {
      throw new Error(
        'Permissão negada: compartilhe a planilha com o Service Account ' +
        `(${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}) como Editor.`
      );
    }
    if (msg.includes('404') || msg.includes('not found')) {
      throw new Error(
        'Planilha não encontrada. Verifique GOOGLE_SPREADSHEET_ID e GOOGLE_SHEET_NAME.'
      );
    }

    throw new Error(`Erro ao ler planilha: ${msg}`);
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

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
    d.dataChegada        ?? '',
    d.nomeCliente        ?? '',
    d.numeroNF           ?? '',
    d.codigoPecaQtd      ?? '',
    d.dataDevolucao      ?? '',
    d.numeroNFDevolucao  ?? '',
    d.motivo             ?? '',
  ];
}
