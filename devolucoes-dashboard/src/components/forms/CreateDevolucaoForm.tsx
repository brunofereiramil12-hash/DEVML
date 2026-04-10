'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useCreateDevolucao } from '@/hooks/useDevolucoes';
import { createDevolucaoSchema, type CreateDevolucaoSchema } from '@/lib/validations';
import { cn } from '@/lib/utils';

interface FieldProps {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}

function Field({ label, error, required, children }: FieldProps) {
  return (
    <div>
      <label className="label">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

export function CreateDevolucaoForm() {
  const { mutate, isPending } = useCreateDevolucao();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateDevolucaoSchema>({
    resolver: zodResolver(createDevolucaoSchema),
  });

  const onSubmit = (data: CreateDevolucaoSchema) => {
    mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <div className="card p-6 animate-in stagger-2">
      <div className="flex items-center gap-2 mb-6">
        <PlusCircle size={16} className="text-sky-400" />
        <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
          Nova Devolução
        </h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Data de chegada */}
          <Field label="Data de Chegada" error={errors.dataChegada?.message} required>
            <input
              {...register('dataChegada')}
              className={cn('input', errors.dataChegada && 'border-red-500/50 focus:border-red-500')}
              placeholder="DD/MM/AAAA"
            />
          </Field>

          {/* Nome do cliente */}
          <Field label="Nome Completo do Cliente" error={errors.nomeCliente?.message} required>
            <input
              {...register('nomeCliente')}
              className={cn('input', errors.nomeCliente && 'border-red-500/50')}
              placeholder="Nome completo"
            />
          </Field>

          {/* Número NF */}
          <Field label="Número da Nota Fiscal" error={errors.numeroNF?.message} required>
            <input
              {...register('numeroNF')}
              className={cn('input', errors.numeroNF && 'border-red-500/50')}
              placeholder="Ex: 123456"
            />
          </Field>

          {/* Código da peça */}
          <Field label="Código da Peça e Quantidade" error={errors.codigoPecaQtd?.message} required>
            <input
              {...register('codigoPecaQtd')}
              className={cn('input', errors.codigoPecaQtd && 'border-red-500/50')}
              placeholder="Ex: ABC-123 x2"
            />
          </Field>

          {/* Data de devolução (opcional) */}
          <Field label="Data de Devolução Feita" error={errors.dataDevolucao?.message}>
            <input
              {...register('dataDevolucao')}
              className={cn('input', errors.dataDevolucao && 'border-red-500/50')}
              placeholder="DD/MM/AAAA (opcional)"
            />
          </Field>

          {/* NF de devolução (opcional) */}
          <Field label="Nº NF de Devolução" error={errors.numeroNFDevolucao?.message}>
            <input
              {...register('numeroNFDevolucao')}
              className={cn('input', errors.numeroNFDevolucao && 'border-red-500/50')}
              placeholder="Opcional"
            />
          </Field>
        </div>

        {/* Motivo */}
        <Field label="Motivo da Devolução ou Mediação" error={errors.motivo?.message} required>
          <textarea
            {...register('motivo')}
            rows={3}
            className={cn('input resize-none', errors.motivo && 'border-red-500/50')}
            placeholder="Descreva o motivo..."
          />
        </Field>

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={isPending} className="btn-primary">
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <PlusCircle size={14} />
                Registrar Devolução
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
