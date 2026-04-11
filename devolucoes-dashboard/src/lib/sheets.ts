import { google } from "googleapis";

export interface Devolucao {
  dataChegada: string;
  nomeCliente: string;
  numeroNF: string;
  codigoPecaQtd: string;
  dataDevolucao: string;
  numeroNFDev: string;
  motivo: string;
}

const COL = {
  DATA_CHEGADA:    0,  // D
  NOME_CLIENTE:    1,  // E
  NUMERO_NF:       2,  // F
  CODIGO_PECA_QTD: 3,  // G
  DATA_DEVOLUCAO:  4,  // H
  NUMERO_NF_DEV:   5,  // I
  MOTIVO:          6,  // J
} as const;

function cell(row: (string | null | undefined)[], idx: number): string {
  const v = row[idx];
  if (v == null) return "";
  return String(v).replace(/[\u00A0\s]+/g, " ").trim();
}

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

export async function fetchDevolucoes(): Promise<Devolucao[]> {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const sheetName     = process.env.GOOGLE_SHEET_NAME ?? "Devoluções 2026";
  if (!spreadsheetId) throw new Error("GOOGLE_SPREADSHEET_ID não definido");

  const auth   = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  // CORREÇÃO: range D3:J (não C3:I). Col C está vazia na planilha.
  // D=dataChegada, E=nomeCliente, F=numeroNF, G=codigoPecaQtd,
  // H=dataDevolucao, I=numeroNFDev, J=motivo
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
