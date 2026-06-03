import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { Building2, CreditCard, AlertTriangle, TrendingUp, Euro, Clock, CheckCircle, Printer, Pencil } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { format, startOfMonth, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import StatusBadge from '@/components/ui/StatusBadge';
import { useCondominio } from '@/lib/CondominioContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, to }) {
  const navigate = useNavigate();
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div
      onClick={() => to && navigate(to)}
      className={`bg-card rounded-xl border border-border p-5 shadow-sm transition-all ${to ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <div className={`p-3 rounded-xl ${colorMap[color]}`}><Icon className="w-5 h-5" /></div>}
      </div>
      {to && <p className="text-xs text-primary mt-3 font-medium">Ver detalhes →</p>}
    </div>
  );
}

function OcorrenciaPreviewDialog({ ocorrencia, condominios, fracoes, onClose }) {
  if (!ocorrencia) return null;
  const condNome = condominios.find(c => c.id === ocorrencia.condominio_id)?.nome || '-';
  const fracaoCod = fracoes.find(f => f.id === ocorrencia.fracao_id)?.codigo || 'Área Comum';
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">{ocorrencia.titulo}</h2>
            <p className="text-sm text-muted-foreground">{condNome} · {fracaoCod}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1">
            <Printer className="w-3.5 h-3.5" />Imprimir
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-lg p-3 text-sm mb-3">
          <div className="flex items-center gap-2"><span className="font-medium">Estado:</span> <StatusBadge status={ocorrencia.estado} /></div>
          <div className="flex items-center gap-2"><span className="font-medium">Prioridade:</span> <StatusBadge status={ocorrencia.prioridade} /></div>
          <div><span className="font-medium">Tipo:</span> <span className="capitalize ml-1">{ocorrencia.tipo}</span></div>
          {ocorrencia.data_abertura && <div><span className="font-medium">Abertura:</span> <span className="ml-1">{ocorrencia.data_abertura}</span></div>}
        </div>
        {ocorrencia.descricao && <p className="text-sm text-muted-foreground mb-2">{ocorrencia.descricao}</p>}
        {ocorrencia.observacoes && <p className="text-sm text-muted-foreground italic">{ocorrencia.observacoes}</p>}
      </DialogContent>
    </Dialog>
  );
}

export default function CondominiosDashboard() {
  const [previewOcorrencia, setPreviewOcorrencia] = useState(null);
  const { selectedCondominioId } = useCondominio();
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: quotas = [] } = useQuery({ queryKey: ['quotas'], queryFn: () => agenciaAvenida.entities.Quota.list() });
  const { data: ocorrencias = [] } = useQuery({ queryKey: ['ocorrencias'], queryFn: () => agenciaAvenida.entities.Ocorrencia.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: despesas = [] } = useQuery({ queryKey: ['despesas'], queryFn: () => agenciaAvenida.entities.Despesa.list() });

  const hoje = new Date();
  const inicioMes = startOfMonth(hoje);

  const filtrar = (arr) => selectedCondominioId === 'all' ? arr : arr.filter(x => x.condominio_id === selectedCondominioId);
  const quotasFilt = filtrar(quotas);
  const ocorrFilt = filtrar(ocorrencias);
  const despFilt = filtrar(despesas);
  const condFilt = selectedCondominioId === 'all' ? condominios : condominios.filter(c => c.id === selectedCondominioId);
  const condominioAtual = condominios.find(c => c.id === selectedCondominioId);

  const recebimentosMes = quotasFilt.filter(q => q.estado === 'pago' && q.data_pagamento && new Date(q.data_pagamento) >= inicioMes).reduce((s, q) => s + (q.valor || 0), 0);
  const quotasPendentes = quotasFilt.filter(q => q.estado === 'pendente').length;
  const quotasVencidas = quotasFilt.filter(q => q.estado === 'vencido' || (q.estado === 'pendente' && q.data_vencimento && isAfter(hoje, new Date(q.data_vencimento)))).length;
  const ocorrenciasPendentes = ocorrFilt.filter(o => o.estado === 'aberta' || o.estado === 'em_progresso').length;
  const despesasMes = despFilt.filter(d => d.data && new Date(d.data) >= inicioMes).reduce((s, d) => s + (d.valor || 0), 0);
  const saldoTotal = condFilt.reduce((s, c) => s + (c.saldo_banco || 0) + (c.saldo_caixa || 0), 0);

  const recentOcorrencias = ocorrFilt.filter(o => o.estado !== 'fechada').slice(0, 5);
  const recentQuotas = quotasFilt.filter(q => q.estado === 'vencido').slice(0, 5);

  const mesesLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = mesesLabels.map((mes, i) => {
    const mesNum = i + 1;
    const receitas = quotasFilt.filter(q => q.estado === 'pago' && q.data_pagamento && new Date(q.data_pagamento).getMonth() + 1 === mesNum).reduce((s, q) => s + (q.valor || 0), 0);
    const desp = despFilt.filter(d => d.data && new Date(d.data).getMonth() + 1 === mesNum).reduce((s, d) => s + (d.valor || 0), 0);
    return { mes, receitas, despesas: desp };
  });

  const pieData = [
    { name: 'Pagas', value: quotasFilt.filter(q => q.estado === 'pago').length, color: '#22c55e' },
    { name: 'Pendentes', value: quotasPendentes, color: '#eab308' },
    { name: 'Vencidas', value: quotasVencidas, color: '#ef4444' },
  ];

  return (
    <div>
      <PageHeader
        title={condominioAtual ? condominioAtual.nome : 'Dashboard — Condomínios'}
        subtitle={`Resumo — ${format(hoje, "MMMM 'de' yyyy", { locale: pt })}`}
      />
      {selectedCondominioId !== 'all' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          <StatCard title="Recebimentos do Mês" value={`€${recebimentosMes.toFixed(2)}`} icon={Euro} color="green" subtitle="Quotas pagas" to="/condominios/quotas" />
          <StatCard title="Saldo Total" value={`€${saldoTotal.toFixed(2)}`} icon={TrendingUp} color="blue" subtitle="Banco + Caixa" to="/condominios/financeiro" />
          <StatCard title="Ocorrências Pendentes" value={ocorrenciasPendentes} icon={AlertTriangle} color="orange" to="/condominios/ocorrencias" />
          <StatCard title="Quotas em Dívida" value={quotasVencidas} icon={CreditCard} color="red" to="/condominios/quotas" />
        </div>
      )}
      {selectedCondominioId === 'all' ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
          <StatCard title="Total de Condomínios" value={condominios.length} icon={Building2} color="blue" to="/condominios/lista" />
          <StatCard title="Quotas Pendentes" value={quotasPendentes} icon={Clock} color="orange" to="/condominios/quotas" />
          <StatCard title="Ocorrências Pendentes" value={ocorrenciasPendentes} icon={AlertTriangle} color="orange" to="/condominios/ocorrencias" />
          <StatCard title="Quotas em Dívida" value={quotasVencidas} icon={CreditCard} color="red" to="/condominios/quotas" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <StatCard title="Quotas Pendentes" value={quotasPendentes} icon={Clock} color="orange" to="/condominios/quotas" />
          <StatCard title="Despesas do Mês" value={`€${despesasMes.toFixed(2)}`} icon={CheckCircle} color="purple" to="/condominios/despesas" />
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Receitas vs Despesas (2026)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Bar dataKey="receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Receitas" />
              <Bar dataKey="despesas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Estado das Quotas</h3>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map(p => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                  <span className="text-muted-foreground">{p.name}</span>
                </div>
                <span className="font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Ocorrências Recentes</h3></div>
          <div className="divide-y divide-border">
            {recentOcorrencias.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Sem ocorrências pendentes</p>}
            {recentOcorrencias.map(o => (
              <div key={o.id} className="px-5 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setPreviewOcorrencia(o)}>
                <div>
                  <p className="text-sm font-medium">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground">{o.tipo} · {o.area}</p>
                </div>
                <StatusBadge status={o.prioridade} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border"><h3 className="font-semibold">Quotas Vencidas</h3></div>
          <div className="divide-y divide-border">
            {recentQuotas.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Sem quotas vencidas</p>}
            {recentQuotas.map(q => (
              <div key={q.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{q.descricao || 'Quota'}</p>
                  <p className="text-xs text-muted-foreground">Venc: {q.data_vencimento}</p>
                </div>
                <span className="text-sm font-bold">€{q.valor?.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <OcorrenciaPreviewDialog
        ocorrencia={previewOcorrencia}
        condominios={condominios}
        fracoes={fracoes}
        onClose={() => setPreviewOcorrencia(null)}
      />
    </div>
  );
}