import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCondominio } from '@/lib/CondominioContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Building2, Landmark, Wallet } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export default function Financeiro() {
  const { selectedCondominioId } = useCondominio();
  const hoje = new Date();
  const [periodoInicio, setPeriodoInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [periodoFim, setPeriodoFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));
  const [contaFiltro, setContaFiltro] = useState('all'); // 'all' | 'banco' | 'caixa'

  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => base44.entities.Condominio.list() });
  const { data: quotas = [] } = useQuery({ queryKey: ['quotas'], queryFn: () => base44.entities.Quota.list() });
  const { data: movimentos = [] } = useQuery({ queryKey: ['movimentos'], queryFn: () => base44.entities.Movimento.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => base44.entities.Fracao.list() });

  const getFracaoCodigo = (id) => fracoes.find(f => f.id === id)?.codigo || '';

  const inPeriodo = (dateStr) => {
    if (!dateStr) return false;
    return (!periodoInicio || dateStr >= periodoInicio) && (!periodoFim || dateStr <= periodoFim);
  };

  const filteredQuotas = useMemo(() => {
    const byCond = selectedCondominioId === 'all' ? quotas : quotas.filter(q => q.condominio_id === selectedCondominioId);
    return byCond.filter(q => q.estado === 'pago' && inPeriodo(q.data_pagamento) && (contaFiltro === 'all' || contaFiltro === 'banco'));
  }, [quotas, selectedCondominioId, periodoInicio, periodoFim, contaFiltro]);

  const filteredMov = useMemo(() => {
    const byCond = selectedCondominioId === 'all' ? movimentos : movimentos.filter(m => m.condominio_id === selectedCondominioId);
    const byPeriod = byCond.filter(m => inPeriodo(m.data));
    if (contaFiltro === 'all') return byPeriod;
    return byPeriod.filter(m => m.conta === contaFiltro);
  }, [movimentos, selectedCondominioId, periodoInicio, periodoFim, contaFiltro]);

  const totalReceitas = filteredMov.filter(m => m.tipo === 'receita').reduce((s, m) => s + (m.valor || 0), 0)
    + filteredQuotas.reduce((s, q) => s + (q.valor || 0), 0);
  const totalDespesasVal = filteredMov.filter(m => m.tipo === 'despesa').reduce((s, m) => s + (m.valor || 0), 0);
  const saldo = totalReceitas - totalDespesasVal;

  const isAll = selectedCondominioId === 'all';

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = meses.map((mes, i) => {
    const mesNum = i + 1;
    const receitas = filteredMov.filter(m => m.tipo === 'receita' && m.data && new Date(m.data).getMonth() + 1 === mesNum).reduce((s, m) => s + (m.valor || 0), 0)
      + filteredQuotas.filter(q => q.data_pagamento && new Date(q.data_pagamento).getMonth() + 1 === mesNum).reduce((s, q) => s + (q.valor || 0), 0);
    const desp = filteredMov.filter(m => m.tipo === 'despesa' && m.data && new Date(m.data).getMonth() + 1 === mesNum).reduce((s, m) => s + (m.valor || 0), 0);
    return { mes, receitas, despesas: desp, saldo: receitas - desp };
  });

  const despesasCat = {};
  filteredMov.filter(m => m.tipo === 'despesa').forEach(m => {
    despesasCat[m.categoria || 'outros'] = (despesasCat[m.categoria || 'outros'] || 0) + (m.valor || 0);
  });
  const catData = Object.entries(despesasCat).map(([cat, val]) => ({ categoria: cat, valor: val })).sort((a, b) => b.valor - a.valor);

  const filteredCondominos = selectedCondominioId === 'all' ? condominios : condominios.filter(c => c.id === selectedCondominioId);

  const totalBanco = filteredCondominos.reduce((s, c) => s + (c.saldo_banco || 0), 0);
  const totalCaixa = filteredCondominos.reduce((s, c) => s + (c.saldo_caixa || 0), 0);

  // Movimentos combinados (quotas + movimentos) para a tabela
  const movimentosTabela = useMemo(() => {
    const quota_movs = filteredQuotas.map(q => ({
      id: `q-${q.id}`,
      data: q.data_pagamento,
      tipo: 'receita',
      categoria: 'quota',
      descricao: q.descricao || `Quota ${getFracaoCodigo(q.fracao_id)}`,
      fracao: getFracaoCodigo(q.fracao_id),
      valor: q.valor,
      conta: 'banco',
      metodo_pagamento: q.metodo_pagamento,
    }));
    const outros_movs = filteredMov.filter(m => m.categoria !== 'quota').map(m => ({
      ...m,
      fracao: m.referencia_id ? getFracaoCodigo(fracoes.find(f => f.id === m.referencia_id)?.id) : '',
    }));
    // Movimentos de quota já registados nos movimentos (evitar duplicação visual — mostrar apenas quotas da tabela quotas)
    const movs_quota = filteredMov.filter(m => m.categoria === 'quota').map(m => ({
      ...m,
      fracao: getFracaoCodigo(m.referencia_id ? fracoes.find(f => {
        const q = quotas.find(q2 => q2.id === m.referencia_id);
        return q && f.id === q.fracao_id;
      })?.id : null) || '',
    }));

    return [...quota_movs.filter(q => !filteredMov.some(m => m.referencia_id === q.id.replace('q-', '') && m.categoria === 'quota')),
            ...movs_quota, ...outros_movs]
      .sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [filteredQuotas, filteredMov, fracoes, quotas]);

  const btnConta = (val, label, Icon) => (
    <button
      onClick={() => setContaFiltro(val)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${contaFiltro === val ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card border border-border text-muted-foreground hover:bg-muted'}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Relatórios e extratos financeiros" />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          <Input type="date" className="w-36 h-8" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" className="w-36 h-8" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-2 shadow-sm">
          {btnConta('all', 'Todos', TrendingUp)}
          {btnConta('banco', 'Banco', Landmark)}
          {btnConta('caixa', 'Caixa', Wallet)}
        </div>
      </div>

      {/* Saldos Atuais (independente do período) */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Saldos Atuais</p>
        {isAll ? (
          /* Vista geral: cartão por condomínio */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-6">
            {condominios.filter(c => c.ativo !== false).map(c => (
              <div key={c.id} className="bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm font-semibold text-foreground truncate">{c.nome}</p>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" /> Banco</span>
                  <span className="font-medium text-blue-600">€{(c.saldo_banco || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Caixa</span>
                  <span className="font-medium text-emerald-600">€{(c.saldo_caixa || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2">
                  <span className="font-medium text-muted-foreground">Total</span>
                  <span className="font-bold">€{((c.saldo_banco || 0) + (c.saldo_caixa || 0)).toFixed(2)}</span>
                </div>
              </div>
            ))}
            {/* Totais gerais */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-primary mb-3">Total Geral</p>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" /> Banco</span>
                <span className="font-medium text-blue-600">€{totalBanco.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground flex items-center gap-1"><Wallet className="w-3 h-3" /> Caixa</span>
                <span className="font-medium text-emerald-600">€{totalCaixa.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-primary/20 pt-2">
                <span className="font-medium">Total</span>
                <span className="font-bold text-primary">€{(totalBanco + totalCaixa).toFixed(2)}</span>
              </div>
            </div>
          </div>
        ) : (
          /* Vista por condomínio: 3 cartões separados */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Saldo Banco</p>
                <div className="p-2 bg-blue-50 rounded-lg"><Landmark className="w-4 h-4 text-blue-600" /></div>
              </div>
              <p className="text-2xl font-bold text-blue-600">€{totalBanco.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Saldo atual</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Saldo Caixa</p>
                <div className="p-2 bg-emerald-50 rounded-lg"><Wallet className="w-4 h-4 text-emerald-600" /></div>
              </div>
              <p className="text-2xl font-bold text-emerald-600">€{totalCaixa.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Saldo atual</p>
            </div>
            <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">Total Geral</p>
                <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="w-4 h-4 text-primary" /></div>
              </div>
              <p className="text-2xl font-bold text-foreground">€{(totalBanco + totalCaixa).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Saldo atual</p>
            </div>
          </div>
        )}
      </div>

      {/* KPIs período — sempre visíveis, filtrados pelo período */}
      <div className="mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Período Selecionado</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Receitas no Período</p>
              <div className="p-2 bg-green-50 rounded-lg"><TrendingUp className="w-4 h-4 text-green-600" /></div>
            </div>
            <p className="text-3xl font-bold text-green-600">€{totalReceitas.toFixed(2)}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Despesas no Período</p>
              <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="w-4 h-4 text-red-600" /></div>
            </div>
            <p className="text-3xl font-bold text-red-600">€{totalDespesasVal.toFixed(2)}</p>
          </div>
          <div className={`rounded-xl border p-5 shadow-sm ${saldo >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Resultado do Período</p>
            </div>
            <p className={`text-3xl font-bold ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>€{saldo.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Receitas vs Despesas (Mensal)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Legend />
              <Bar dataKey="receitas" fill="hsl(var(--primary))" name="Receitas" radius={[3, 3, 0, 0]} />
              <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-foreground mb-4">Evolução do Saldo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `€${v.toFixed(2)}`} />
              <Area type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.1)" name="Saldo" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {catData.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm mb-8">
          <h3 className="font-semibold text-foreground mb-4">Despesas por Categoria</h3>
          <div className="space-y-3">
            {catData.map(({ categoria, valor }) => {
              const pct = totalDespesasVal > 0 ? (valor / totalDespesasVal * 100) : 0;
              return (
                <div key={categoria} className="flex items-center gap-3">
                  <div className="w-28 text-xs text-muted-foreground capitalize">{categoria}</div>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-sm font-medium w-20 text-right">€{valor.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Movimentos do período */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-semibold text-foreground mb-4">
          Movimentos do Período
          {contaFiltro !== 'all' && <span className="ml-2 text-sm font-normal text-muted-foreground">({contaFiltro === 'banco' ? 'Banco' : 'Caixa'})</span>}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Data', 'Descrição', 'Fração', 'Categoria', 'Conta', 'Método', 'Valor'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {movimentosTabela.map(m => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{m.data || '-'}</td>
                  <td className="px-3 py-2.5 font-medium">{m.descricao}</td>
                  <td className="px-3 py-2.5">
                    {m.fracao ? (
                      <span className="bg-accent text-accent-foreground text-xs px-2 py-0.5 rounded-full font-medium">{m.fracao}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground capitalize">{m.categoria || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.conta === 'caixa' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                      {m.conta === 'caixa' ? 'Caixa' : 'Banco'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground capitalize">{m.metodo_pagamento || '-'}</td>
                  <td className={`px-3 py-2.5 font-bold ${m.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.tipo === 'receita' ? '+' : '-'}€{(m.valor || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              {movimentosTabela.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">Sem movimentos no período</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}