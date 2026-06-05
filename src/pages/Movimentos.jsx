import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, TrendingUp, TrendingDown, Wallet, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';

const categoriaLabels = {
  quota: 'Quota', limpeza: 'Limpeza', manutencao: 'Manutenção', seguros: 'Seguros',
  eletricidade: 'Eletricidade', agua: 'Água', elevador: 'Elevador',
  jardim: 'Jardim', administracao: 'Administração', obras: 'Obras', outros: 'Outros'
};

const empty = {
  condominio_id: '', tipo: 'despesa', categoria: 'outros', descricao: '',
  valor: '', data: format(new Date(), 'yyyy-MM-dd'), conta: 'banco',
  metodo_pagamento: 'transferencia', numero_documento: '', observacoes: ''
};

export default function Movimentos() {
  const qc = useQueryClient();
  const { selectedCondominioId } = useCondominio();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterConta, setFilterConta] = useState('all');

  // Filtro de período — default: mês corrente
  const hoje = new Date();
  const [periodoInicio, setPeriodoInicio] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [periodoFim, setPeriodoFim] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));

  const { data: movimentos = [], isLoading } = useQuery({
    queryKey: ['movimentos'],
    queryFn: () => agenciaAvenida.entities.Movimento.list('-data')
  });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });

  const save = useMutation({
    mutationFn: (data) => editing
      ? agenciaAvenida.entities.Movimento.update(editing, data)
      : agenciaAvenida.entities.Movimento.create(data),
    onSuccess: async (saved, vars) => {
      // Atualizar saldo do condomínio
      const cond = condominios.find(c => c.id === vars.condominio_id);
      if (cond) {
        const delta = parseFloat(vars.valor) || 0;
        const saldoField = vars.conta === 'banco' ? 'saldo_banco' : 'saldo_caixa';
        const change = vars.tipo === 'receita' ? delta : -delta;
        // Se editando, reverter o anterior
        if (editing) {
          const prev = movimentos.find(m => m.id === editing);
          if (prev) {
            const prevField = prev.conta === 'banco' ? 'saldo_banco' : 'saldo_caixa';
            const prevChange = prev.tipo === 'receita' ? -(prev.valor || 0) : (prev.valor || 0);
            const updates = { [prevField]: (cond[prevField] || 0) + prevChange };
            await agenciaAvenida.entities.Condominio.update(cond.id, updates);
          }
        }
        const condAtual = await agenciaAvenida.entities.Condominio.list();
        const condNow = condAtual.find(c => c.id === vars.condominio_id);
        if (condNow) {
          await agenciaAvenida.entities.Condominio.update(cond.id, {
            [saldoField]: (condNow[saldoField] || 0) + change
          });
        }
      }
      qc.invalidateQueries({ queryKey: ['movimentos'] });
      qc.invalidateQueries({ queryKey: ['condominios'] });
      setOpen(false);
      toast.success('Movimento guardado');
    },
  });

  const del = useMutation({
    mutationFn: async (m) => {
      await agenciaAvenida.entities.Movimento.delete(m.id);
      // Reverter saldo
      const cond = condominios.find(c => c.id === m.condominio_id);
      if (cond) {
        const saldoField = m.conta === 'banco' ? 'saldo_banco' : 'saldo_caixa';
        const change = m.tipo === 'receita' ? -(m.valor || 0) : (m.valor || 0);
        await agenciaAvenida.entities.Condominio.update(cond.id, {
          [saldoField]: (cond[saldoField] || 0) + change
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentos'] });
      qc.invalidateQueries({ queryKey: ['condominios'] });
      toast.success('Movimento eliminado');
    },
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (m) => { setForm(m); setEditing(m.id); setOpen(true); };
  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const filtered = useMemo(() => movimentos.filter(m => {
    const matchCond = selectedCondominioId === 'all' || m.condominio_id === selectedCondominioId;
    const matchTipo = filterTipo === 'all' || m.tipo === filterTipo;
    const matchConta = filterConta === 'all' || m.conta === filterConta;
    const matchSearch = !search || m.descricao?.toLowerCase().includes(search.toLowerCase());
    const d = m.data;
    const matchPeriodo = (!periodoInicio || d >= periodoInicio) && (!periodoFim || d <= periodoFim);
    return matchCond && matchTipo && matchConta && matchSearch && matchPeriodo;
  }), [movimentos, selectedCondominioId, filterTipo, filterConta, search, periodoInicio, periodoFim]);

  const totalReceitas = filtered.filter(m => m.tipo === 'receita').reduce((s, m) => s + (m.valor || 0), 0);
  const totalDespesas = filtered.filter(m => m.tipo === 'despesa').reduce((s, m) => s + (m.valor || 0), 0);
  const saldo = totalReceitas - totalDespesas;

  // Saldos por conta (todos os movimentos do condomínio selecionado, sem filtro de período)
  const condSaldos = useMemo(() => {
    const condFiltrados = selectedCondominioId === 'all' ? condominios : condominios.filter(c => c.id === selectedCondominioId);
    return condFiltrados.map(c => ({
      nome: c.nome,
      banco: c.saldo_banco || 0,
      caixa: c.saldo_caixa || 0,
    }));
  }, [condominios, selectedCondominioId]);

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Registo de movimentos financeiros" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Movimento</Button>
      } />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-600" /><p className="text-xs text-green-700 font-medium">Receitas (período)</p></div>
          <p className="text-2xl font-bold text-green-800">€{totalReceitas.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <div className="flex items-center gap-2 mb-1"><TrendingDown className="w-4 h-4 text-red-600" /><p className="text-xs text-red-700 font-medium">Despesas (período)</p></div>
          <p className="text-2xl font-bold text-red-800">€{totalDespesas.toFixed(2)}</p>
        </div>
        <div className={`rounded-xl p-4 border ${saldo >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-primary" /><p className="text-xs font-medium text-muted-foreground">Saldo (período)</p></div>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>€{saldo.toFixed(2)}</p>
        </div>
      </div>

      {/* Saldos contas */}
      {condSaldos.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-4 mb-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground mb-3">Saldos atuais</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {condSaldos.map(c => (
              <div key={c.nome} className="border border-border rounded-lg p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 truncate">{c.nome}</p>
                <div className="flex gap-4">
                  <div><p className="text-xs text-muted-foreground">Banco</p><p className="font-bold text-foreground">€{c.banco.toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Caixa</p><p className="font-bold text-foreground">€{c.caixa.toFixed(2)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Total</p><p className="font-bold text-primary">€{(c.banco + c.caixa).toFixed(2)}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="receita">Receitas</SelectItem>
            <SelectItem value="despesa">Despesas</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterConta} onValueChange={setFilterConta}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Conta" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="banco">Banco</SelectItem>
            <SelectItem value="caixa">Caixa</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Input type="date" className="w-36" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
          <span className="text-muted-foreground text-sm">até</span>
          <Input type="date" className="w-36" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Data', 'Tipo', 'Condomínio', 'Categoria', 'Descrição', 'Conta', 'Valor', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{m.data}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {m.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{getCondName(m.condominio_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{categoriaLabels[m.categoria] || m.categoria}</td>
                  <td className="px-4 py-3">{m.descricao}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{m.conta}</span>
                  </td>
                  <td className={`px-4 py-3 font-bold ${m.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.tipo === 'receita' ? '+' : '-'}€{(m.valor || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => del.mutate(m)} className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum movimento encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Movimento' : 'Novo Movimento'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <Label>Condomínio *</Label>
              <Select value={form.condominio_id} onValueChange={v => upd('condominio_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{condominios.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => upd('categoria', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoriaLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta</Label>
              <Select value={form.conta} onValueChange={v => upd('conta', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição *</Label>
              <Input className="mt-1" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
            </div>
            <div>
              <Label>Valor (€) *</Label>
              <Input className="mt-1" type="number" value={form.valor || ''} onChange={e => upd('valor', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Data *</Label>
              <Input className="mt-1" type="date" value={form.data || ''} onChange={e => upd('data', e.target.value)} />
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select value={form.metodo_pagamento || ''} onValueChange={v => upd('metodo_pagamento', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="mb">Referência MB</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº Documento</Label>
              <Input className="mt-1" value={form.numero_documento || ''} onChange={e => upd('numero_documento', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[70px] resize-y" value={form.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>{save.isPending ? 'A guardar...' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}