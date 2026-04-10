'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PencilLine, Loader2, Search } from 'lucide-react';
import { useUpdateDevolucao } from '@/hooks/useDevolucoes';
import { updateDevolucaoSchema, type UpdateDevolucaoSchema } from '@/lib/validations';
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
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function UpdateDevolucaoForm() {
  const { mutate, isPending } = useUpdateDevolucao();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateDevolucaoSchema>({
    resolver: zodResolver(updateDevolucaoSchema),
  });

  const onSubmit = (data: UpdateDevolucaoSchema) => {
    mutate(data, {
      onSuccess: () => reset(),
    });
  };

  return (
    <div className="card p-6 animate-in stagger-3">
      <div className="flex items-center gap-2 mb-2">
        <PencilLine size={16} className="text-amber-400" />
        <h3 className="font-display text-sm font-bold text-slate-100 uppercase tracking-wider">
          Atualizar Status
        </h3>
      </div>
      <p className="text-xs text-slate-500 mb-6">
        Localize pelo número da NF e atualize os campos de status.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Localizar por NF */}
        <Field label="Número da Nota Fiscal (localização)" error={errors.numeroNF?.message} required>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              {...register('numeroNF')}
              className={cn('input pl-8', errors.numeroNF && 'border-red-500/50')}
              placeholder="Número da NF para localizar"
            />
          </div>
        </Field>

        <div className="border-t border-[#1e2a3d] pt-4">
          <p className="text-xs text-slate-500 mb-4 flex items-center gap-1">
            <PencilLine size={11} className="text-amber-400/70" />
            Campos a atualizar:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Data de devolução */}
            <Field label="Data de Devolução Feita" error={errors.dataDevolucao?.message} required>
              <input
                {...register('dataDevolucao')}
                className={cn('input', errors.dataDevolucao && 'border-red-500/50')}
                placeholder="DD/MM/AAAA"
              />
            </Field>

            {/* NF de devolução */}
            <Field label="Nº NF de Devolução" error={errors.numeroNFDevolucao?.message} required>
              <input
                {...register('numeroNFDevolucao')}
                className={cn('input', errors.numeroNFDevolucao && 'border-red-500/50')}
                placeholder="Número da NF gerada"
              />
            </Field>
          </div>

          {/* Motivo */}
          <div className="mt-4">
            <Field label="Motivo / Status Atualizado" error={errors.motivo?.message} required>
              <textarea
                {...register('motivo')}
                rows={3}
                className={cn('input resize-none', errors.motivo && 'border-red-500/50')}
                placeholder="Novo motivo ou status..."
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-600">
            A linha será localizada pelo Nº NF na planilha.
          </p>
          <button type="submit" disabled={isPending} className="btn-primary bg-amber-500 hover:bg-amber-400">
            {isPending ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <PencilLine size={14} />
                Atualizar Status
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
