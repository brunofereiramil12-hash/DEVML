import { z } from 'zod';

const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
const dateMsg = 'Data deve estar no formato DD/MM/AAAA';

export const createDevolucaoSchema = z.object({
  dataChegada: z
    .string()
    .min(1, 'Data de chegada é obrigatória')
    .regex(dateRegex, dateMsg),
  nomeCliente: z
    .string()
    .min(3, 'Nome deve ter ao menos 3 caracteres')
    .max(120),
  numeroNF: z
    .string()
    .min(1, 'Número da NF é obrigatório')
    .max(50),
  codigoPecaQtd: z
    .string()
    .min(1, 'Código e quantidade são obrigatórios')
    .max(200),
  dataDevolucao: z
    .string()
    .regex(dateRegex, dateMsg)
    .optional()
    .or(z.literal('')),
  numeroNFDevolucao: z.string().max(50).optional().or(z.literal('')),
  motivo: z
    .string()
    .min(2, 'Informe o motivo')
    .max(500),
});

export const updateDevolucaoSchema = z.object({
  numeroNF: z
    .string()
    .min(1, 'Número da NF é obrigatório para localizar o registro'),
  dataDevolucao: z
    .string()
    .min(1, 'Data de devolução é obrigatória')
    .regex(dateRegex, dateMsg),
  numeroNFDevolucao: z
    .string()
    .min(1, 'Número da NF de devolução é obrigatório')
    .max(50),
  motivo: z
    .string()
    .min(2, 'Informe o motivo')
    .max(500),
});

export type CreateDevolucaoSchema = z.infer<typeof createDevolucaoSchema>;
export type UpdateDevolucaoSchema = z.infer<typeof updateDevolucaoSchema>;
