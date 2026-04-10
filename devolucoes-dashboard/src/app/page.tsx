'use client';

import { useState } from 'react';
import { Navbar } from '@/components/ui/Navbar';
import { TabNav } from '@/components/ui/TabNav';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { MotivoChart } from '@/components/dashboard/MotivoChart';
import { TimelineChart } from '@/components/dashboard/TimelineChart';
import { DevolucoesTable } from '@/components/dashboard/DevolucoesTable';
import { CreateDevolucaoForm } from '@/components/forms/CreateDevolucaoForm';
import { UpdateDevolucaoForm } from '@/components/forms/UpdateDevolucaoForm';
import { useDashboard } from '@/hooks/useDevolucoes';

type ActiveTab = 'dashboard' | 'registros';

function DashboardView() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <KpiCards kpis={data?.kpis ?? defaultKpis} isLoading={isLoading} />

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <MotivoChart data={data?.motivoChart ?? []} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          <TimelineChart data={data?.timeline ?? []} isLoading={isLoading} />
        </div>
      </div>

      {/* Table */}
      <DevolucoesTable />
    </div>
  );
}

function RegistrosView() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <CreateDevolucaoForm />
      <UpdateDevolucaoForm />
    </div>
  );
}

const defaultKpis = {
  totalMes: 0,
  totalGeral: 0,
  percentualOK: 0,
  percentualProblema: 0,
  pendentes: 0,
  avgDiasResolucao: 0,
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  return (
    <div className="min-h-screen relative">
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-100">
              Monitoramento de Devoluções
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Sincronizado com Google Sheets · Dados em tempo real
            </p>
          </div>
          <TabNav active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Content */}
        {activeTab === 'dashboard' ? <DashboardView /> : <RegistrosView />}
      </main>
    </div>
  );
}
