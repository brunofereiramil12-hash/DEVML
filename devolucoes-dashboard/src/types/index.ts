// ─── Domain Types ────────────────────────────────────────────────────────────

export interface Devolucao {
  rowIndex: number; // posição na planilha (1-based, excluindo header)
  dataChegada: string; // "data de chegada da DV"
  nomeCliente: string; // "nome completo do cliente"
  numeroNF: string; // "número da nota fiscal"
  codigoPecaQtd: string; // "código da peça e quantidade"
  dataDevolucao: string; // "data de devolução feita"
  numeroNFDevolucao: string; // "número da nf de devolução"
  motivo: string; // "Motivo da devoluçao ou mediaçao"
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateDevolucaoPayload {
  dataChegada: string;
  nomeCliente: string;
  numeroNF: string;
  codigoPecaQtd: string;
  dataDevolucao?: string;
  numeroNFDevolucao?: string;
  motivo: string;
}

export interface UpdateDevolucaoPayload {
  numeroNF: string;
  dataDevolucao: string;
  numeroNFDevolucao: string;
  motivo: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── BI / Analytics ──────────────────────────────────────────────────────────

export interface MotivoCount {
  motivo: string;
  count: number;
  percentage: number;
}

export interface TimelineItem {
  date: string;
  count: number;
}

export interface KPIs {
  totalMes: number;
  totalGeral: number;
  percentualOK: number;
  percentualProblema: number;
  pendentes: number; // sem data de devolução feita
  avgDiasResolucao: number;
}

export interface DashboardData {
  kpis: KPIs;
  motivoChart: MotivoCount[];
  timeline: TimelineItem[];
}

// ─── Filter/Query ─────────────────────────────────────────────────────────────

export interface DevolucaoFilters {
  search?: string;
  nomeCliente?: string;
  numeroNF?: string;
  motivo?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  pageSize?: number;
}
