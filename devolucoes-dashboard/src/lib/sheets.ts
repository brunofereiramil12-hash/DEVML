import { google } from "googleapis";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Devolucao {
  dataChegada: string;   // DD/MM/YYYY ou ""
  nomeCliente: string;
  numeroNF: string;
  codigoPecaQtd: string;
  dataDevolucao: string; // DD/MM/YYYY ou ""
  numeroNFDev: string;
  motivo: string;
}

// ─── Índices das colunas (range C3:I → 7 colunas, índice 0-based) ────────────
// C=0  D=1          E=2       F=3              G=4             H=5           I=6
// Data  NomeCliente  Nº NF    Código peça/qtd  Data devolução  Nº NF dev     Motivo
const COL = {
  DATA_CHEGADA:    0,
  NOME_CLIENTE:    1,
  NUMERO_NF:       2,
  CODIGO_PECA_QTD: 3,
  DATA_DEVOLUCAO:  4,
  NUMERO_NF_DEV:   5,
  MOTIVO:          6,
} as const;

// ─── Helpers internos ─────────────────────────────────────────────────────────

/**
 * Lê o valor de uma célula pelo índice, trimando espaços invisíveis e
 * retornando "" para células ausentes/nulas.
 */
function cell(row: (string | null | undefined)[], idx: number): string {
  const v = row[idx];
  if (v == null) return "";
  // Remove espaços, tabs, NBSP (\u00A0) e quebras de linha que o Sheets exporta
  return String(v).replace(/[\u00A0\s]+/g, " ").trim();
}

// ─── Autenticação ─────────────────────────────────────────────────────────────

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não definido");

  let credentials: object;
  try {
    credentials = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido");
  }

  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

// ─── Busca principal ──────────────────────────────────────────────────────────

export async function fetchDevolucoes(): Promise<Devolucao[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName     = process.env.GOOGLE_SHEET_NAME ?? "Devoluções 2026";

  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID não definido");

  const auth   = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // C3:I → começa na linha 3 (pula título+cabeçalho) e vai até a col I (motivo)
  const range = `'${sheetName}'!C3:I`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE", // datas já no formato DD/MM/YYYY
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values ?? [];

  const devolucoes: Devolucao[] = [];

  for (const row of rows) {
    // Ignora linhas completamente vazias
    const rowStr = row as (string | null | undefined)[];
    const allEmpty = rowStr.every((c) => c == null || String(c).trim() === "");
    if (allEmpty) continue;

    devolucoes.push({
      dataChegada:    cell(rowStr, COL.DATA_CHEGADA),
      nomeCliente:    cell(rowStr, COL.NOME_CLIENTE),
      numeroNF:       cell(rowStr, COL.NUMERO_NF),
      codigoPecaQtd:  cell(rowStr, COL.CODIGO_PECA_QTD),
      dataDevolucao:  cell(rowStr, COL.DATA_DEVOLUCAO),
      numeroNFDev:    cell(rowStr, COL.NUMERO_NF_DEV),
      motivo:         cell(rowStr, COL.MOTIVO),
    });
  }

  return devolucoes;
}
