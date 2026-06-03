import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, CreditCard, FileDown, CheckCircle, Edit, Settings, BarChart2, FileText } from 'lucide-react';
import ConfiguracaoQuotas from '@/pages/condominios/ConfiguracaoQuotas';
import MapaQuotas from '@/components/quotas/MapaQuotas';
import PagamentoDialog from '@/components/quotas/PagamentoDialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';
import { gerarReciboQuota } from '@/lib/pdfUtils';
import ReciboPDFDialog from '@/components/ReciboPDFDialog';

const makeEmpty = (condominioId) => ({
  condominio_id: condominioId !== 'all' ? condominioId : '',
  fracao_id: '',
  pessoa_id: '',
  tipo: 'mensal',
  descricao: '',
  valor: '',
  data_emissao: format(new Date(), 'yyyy-MM-dd'),
  data_vencimento: '',
  estado: 'pendente',
  metodo_pagamento: '',
  observacoes: '',
  ano: new Date().getFullYear(),
  mes: new Date().getMonth() + 1,
});

export default function Quotas() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(makeEmpty('all'));
  const [editing, setEditing] = useState(null);
  const { selectedCondominioId } = useCondominio();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterFracao, setFilterFracao] = useState('all');
  const [reciboDialog, setReciboDialog] = useState(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [mapaOpen, setMapaOpen] = useState(false);
  const [pagamentoDialog, setPagamentoDialog] = useState(null); // quota a pagar

  const { data: quotas = [], isLoading } = useQuery({ queryKey: ['quotas'], queryFn: () => base44.entities.Quota.list('-data_emissao') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => base44.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => base44.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => base44.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? base44.entities.Quota.update(editing, data) : base44.entities.Quota.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotas'] }); setOpen(false); toast.success('Quota guardada'); },
  });

  const marcarPago = useMutation({
    mutationFn: async ({ id, dataPagamento, metodo, conta, quota }) => {
      await base44.entities.Quota.update(id, { estado: 'pago', data_pagamento: dataPagamento, metodo_pagamento: metodo });
      const fracao = fracoes.find(f => f.id === quota.fracao_id);
      await base44.entities.Movimento.create({
        condominio_id: quota.condominio_id,
        tipo: 'receita',
        categoria: 'quota',
        descricao: quota.descricao || `Quota ${fracao?.codigo || ''}`,
        valor: quota.valor,
        data: dataPagamento,
        conta,
        metodo_pagamento: metodo,
        referencia_id: id,
      });
      const conds = await base44.entities.Condominio.list();
      const cond = conds.find(c => c.id === quota.condominio_id);
      if (cond) {
        const campo = conta === 'caixa' ? 'saldo_caixa' : 'saldo_banco';
        await base44.entities.Condominio.update(cond.id, { [campo]: (cond[campo] || 0) + (quota.valor || 0) });
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['quotas'] });
      qc.invalidateQueries({ queryKey: ['movimentos'] });
      qc.invalidateQueries({ queryKey: ['condominios'] });
      setPagamentoDialog(null);
      toast.success('Quota marcada como paga');
      // Abrir recibo após pagamento
      const q = vars.quota;
      const fracao = fracoes.find(f => f.id === q.fracao_id);
      const condominio = condominios.find(c => c.id === q.condominio_id);
      const pessoa = pessoas.find(p => p.id === q.pessoa_id);
      // Pequeno delay para dados atualizados
      setTimeout(() => setReciboDialog({ quota: { ...q, estado: 'pago', data_pagamento: vars.dataPagamento }, fracao, condominio, pessoa }), 500);
    },
  });

  const openNew = () => { setForm(makeEmpty(selectedCondominioId)); setEditing(null); setOpen(true); };
  const openEdit = (q) => { setForm(q); setEditing(q.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Quando muda o condomínio selecionado, atualizar o form se open e new
  useEffect(() => {
    if (open && !editing && selectedCondominioId !== 'all') {
      setForm(f => ({ ...f, condominio_id: selectedCondominioId }));
    }
  }, [selectedCondominioId, open, editing]);

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';
  const getFracaoCode = (id) => fracoes.find(f => f.id === id)?.codigo || '-';

  const fracoesByCondominio = fracoes.filter(f => !form.condominio_id || f.condominio_id === form.condominio_id);

  const filtered = quotas.filter(q => {
    const matchSearch = !search || q.descricao?.toLowerCase().includes(search.toLowerCase()) || getFracaoCode(q.fracao_id)?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'all' || q.estado === filterEstado;
    const matchTipo = filterTipo === 'all' || q.tipo === filterTipo;
    const matchCond = selectedCondominioId === 'all' || q.condominio_id === selectedCondominioId;
    const matchFracao = filterFracao === 'all' || q.fracao_id === filterFracao;
    return matchSearch && matchEstado && matchTipo && matchCond && matchFracao;
  });

  const fracoesFiltradas = fracoes.filter(f => selectedCondominioId === 'all' || f.condominio_id === selectedCondominioId);

  const gerarExtrato = () => {
    const linhas = filtered.map(q => {
      const fracao = fracoes.find(f => f.id === q.fracao_id);
      const cond = condominios.find(c => c.id === q.condominio_id);
      return `${q.data_emissao || '-'}\t${cond?.nome || '-'}\t${fracao?.codigo || '-'}\t${q.descricao || '-'}\t€${(q.valor||0).toFixed(2)}\t${q.estado}`;
    });
    const conteudo = `Data Emissão\tCondomínio\tFração\tDescrição\tValor\tEstado\n${linhas.join('\n')}`;
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'extrato_quotas.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPendente = filtered.filter(q => q.estado === 'pendente').reduce((s, q) => s + (q.valor || 0), 0);
  const totalPago = filtered.filter(q => q.estado === 'pago').reduce((s, q) => s + (q.valor || 0), 0);

  return (
    <div>
      <PageHeader title="Quotas" subtitle="Gestão e emissão de quotas de condomínio" action={
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={gerarExtrato} className="gap-2"><FileText className="w-4 h-4" />Emitir Extrato</Button>
          <Button variant="outline" onClick={() => setMapaOpen(v => !v)} className="gap-2"><BarChart2 className="w-4 h-4" />Mapa Anual</Button>
          <Button variant="outline" onClick={() => { setConfigOpen(true); }} className="gap-2"><Settings className="w-4 h-4" />Configurar</Button>
          <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Quota</Button>
        </div>
      } />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-green-700 font-medium">Recebido</p>
          <p className="text-xl font-bold text-green-800">€{totalPago.toFixed(2)}</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
          <p className="text-xs text-yellow-700 font-medium">Pendente</p>
          <p className="text-xl font-bold text-yellow-800">€{totalPendente.toFixed(2)}</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border">
          <p className="text-xs text-muted-foreground font-medium">Total de quotas</p>
          <p className="text-xl font-bold text-foreground">{filtered.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="mensal">Mensal</SelectItem>
            <SelectItem value="extraordinaria">Extraordinária</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFracao} onValueChange={setFilterFracao}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Fração" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as frações</SelectItem>
            {fracoesFiltradas.map(f => <SelectItem key={f.id} value={f.id}>{f.codigo}{f.descricao ? ` - ${f.descricao}` : ''}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Fração', 'Condomínio', 'Tipo', 'Descrição', 'Valor', 'Vencimento', 'Estado', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      <span className="font-medium">{getFracaoCode(q.fracao_id)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{getCondName(q.condominio_id)}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{q.tipo}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{q.descricao || '-'}</td>
                  <td className="px-4 py-3 font-bold text-foreground">€{(q.valor || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{q.data_vencimento || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={q.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {q.estado !== 'pago' && (
                        <button
                          onClick={() => setPagamentoDialog(q)}
                          className="p-1.5 hover:bg-green-50 rounded transition-colors" title="Marcar como pago"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                        </button>
                      )}
                      <button onClick={() => openEdit(q)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Editar">
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      {/* PDF apenas para quotas pagas */}
                      {q.estado === 'pago' && (
                        <button
                          onClick={() => {
                            const fracao = fracoes.find(f => f.id === q.fracao_id);
                            const condominio = condominios.find(c => c.id === q.condominio_id);
                            const pessoa = pessoas.find(p => p.id === q.pessoa_id);
                            setReciboDialog({ quota: q, fracao, condominio, pessoa });
                          }}
                          className="p-1.5 hover:bg-blue-50 rounded transition-colors" title="Descarregar recibo PDF"
                        >
                          <FileDown className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma quota encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {mapaOpen && (
        <div className="mt-6">
          <div className="flex justify-end mb-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-2 print:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
              Imprimir Mapa
            </Button>
          </div>
          <MapaQuotas quotas={quotas} fracoes={fracoes} condominioId={selectedCondominioId} />
        </div>
      )}

      {configOpen && (
        <ConfiguracaoQuotas
          key={selectedCondominioId}
          open={configOpen}
          onClose={() => setConfigOpen(false)}
          defaultCondominioId={selectedCondominioId !== 'all' ? selectedCondominioId : undefined}
        />
      )}

      {pagamentoDialog && (
        <PagamentoDialog
          open={!!pagamentoDialog}
          onClose={() => setPagamentoDialog(null)}
          quota={pagamentoDialog}
          fracaoCodigo={getFracaoCode(pagamentoDialog.fracao_id)}
          isPending={marcarPago.isPending}
          onConfirm={({ dataPagamento, metodo, conta }) =>
            marcarPago.mutate({ id: pagamentoDialog.id, dataPagamento, metodo, conta, quota: pagamentoDialog })
          }
        />
      )}

      {reciboDialog && (
        <ReciboPDFDialog
          open={!!reciboDialog}
          onClose={() => setReciboDialog(null)}
          emailDestinatario={reciboDialog.pessoa?.email}
          nomeDestinatario={reciboDialog.pessoa?.nome}
          tipoDoc="Recibo de Quota"
          onDownload={() => gerarReciboQuota(reciboDialog)}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Quota' : 'Nova Quota'}</DialogTitle>
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
              <Label>Fração *</Label>
              <Select value={form.fracao_id} onValueChange={v => upd('fracao_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{fracoesByCondominio.map(f => <SelectItem key={f.id} value={f.id}>{f.codigo} - {f.descricao}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="extraordinaria">Extraordinária</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (€) *</Label>
              <Input className="mt-1" type="number" value={form.valor || ''} onChange={e => upd('valor', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <Input className="mt-1" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} placeholder="Ex: Quota de janeiro 2025" />
            </div>
            <div>
              <Label>Data de Emissão</Label>
              <Input className="mt-1" type="date" value={form.data_emissao || ''} onChange={e => upd('data_emissao', e.target.value)} />
            </div>
            <div>
              <Label>Data de Vencimento</Label>
              <Input className="mt-1" type="date" value={form.data_vencimento || ''} onChange={e => upd('data_vencimento', e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => upd('estado', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mês / Ano</Label>
              <div className="flex gap-2 mt-1">
                <Input type="number" placeholder="Mês" min={1} max={12} value={form.mes || ''} onChange={e => upd('mes', parseInt(e.target.value) || 1)} />
                <Input type="number" placeholder="Ano" value={form.ano || ''} onChange={e => upd('ano', parseInt(e.target.value) || new Date().getFullYear())} />
              </div>
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" value={form.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
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