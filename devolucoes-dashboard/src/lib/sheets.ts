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

// ─── Índices das colunas (range D3:J → 7 colunas, índice 0-based) ─────────────
//
// DIAGNÓSTICO baseado no JSON real da API em produção:
//
//   Range ANTIGO C3:I produzia (tudo deslocado +1):
//     idx 0 (C) = ""              ← col C vazia na planilha
//     idx 1 (D) = "02/01/2026"   ← data, era mapeado como nomeCliente (ERRADO)
//     idx 2 (E) = "EDUARDO REI…" ← nome, era mapeado como numeroNF (ERRADO)
//     idx 3 (F) = "124975"       ← código peça
//     idx 4 (G) = "4035129105R"  ← nº NF, era mapeado como dataDevolucao (ERRADO)
//     idx 5 (H) = "09/01/2026"   ← data devolução, era mapeado como numeroNFDev (ERRADO)
//     idx 6 (I) = "126501"       ← nº NF dev, era mapeado como motivo (ERRADO)
//     (J = motivo real nunca chegava — fora do range)
//
//   Range CORRETO D3:J:
//     idx 0 (D) = dataChegada    → DD/MM/YYYY (pode ser vazio)
//     idx 1 (E) = nomeCliente
//     idx 2 (F) = numeroNF
//     idx 3 (G) = codigoPecaQtd
//     idx 4 (H) = dataDevolucao  → DD/MM/YYYY ✓ confirmado no JSON
//     idx 5 (I) = numeroNFDev    → "7700500155 - 04" ✓ confirmado
//     idx 6 (J) = motivo         → "INCOMPATÍVEL", "OK", "DESISTÊNCIA" etc
//
const COL = {
  DATA_CHEGADA:    0,  // D
  NOME_CLIENTE:    1,  // E
  NUMERO_NF:       2,  // F
  CODIGO_PECA_QTD: 3,  // G
  DATA_DEVOLUCAO:  4,  // H
  NUMERO_NF_DEV:   5,  // I
  MOTIVO:          6,  // J
} as const;

// ─── Helper interno ───────────────────────────────────────────────────────────

function cell(row: (string | null | undefined)[], idx: number): string {
  const v = row[idx];
  if (v == null) return "";
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

  // D3:J — pula col C (vazia), começa em D (dataChegada), termina em J (motivo)
  const range = `'${sheetName}'!D3:J`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const rows = response.data.values ?? [];
  const devolucoes: Devolucao[] = [];

  for (const row of rows) {
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
