import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Scale, Trash2, Edit, Euro, PlusCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useCondominio } from '@/lib/CondominioContext';
import { format } from 'date-fns';

const FASES = {
  carta_normal: { label: 'Carta Normal Enviada', color: 'bg-yellow-100 text-yellow-700' },
  carta_registada_ar: { label: 'Carta Registada/AR Enviada', color: 'bg-orange-100 text-orange-700' },
  carta_advogado: { label: 'Carta Advogado Enviada', color: 'bg-purple-100 text-purple-700' },
  processo_judicial: { label: 'Processo Judicial', color: 'bg-red-100 text-red-700' },
  encerrado: { label: 'Encerrado', color: 'bg-green-100 text-green-700' },
};

const RESPOSTAS = {
  '': 'Sem resposta registada',
  nao_responde: 'Não Responde',
  carta_devolvida: 'Carta Devolvida',
  negociacao: 'Negociação',
  divida_paga: 'Dívida Paga',
  plano_pagamento: 'Plano de Pagamento Efetuado',
};

const empty = {
  condominio_id: '', fracao_id: '', pessoa_id: '', advogado_id: '',
  descricao: '', valor_divida: 0, fase: 'carta_normal', resposta_inquilino: '',
  data_inicio: format(new Date(), 'yyyy-MM-dd'), notas: '', custos: [],
};

export default function ProcessosJudiciais() {
  const qc = useQueryClient();
  const { selectedCondominioId } = useCondominio();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState('all');
  const [novoCusto, setNovoCusto] = useState({ descricao: '', valor: '', fase: 'carta_normal', data: format(new Date(), 'yyyy-MM-dd') });
  const [showCustoForm, setShowCustoForm] = useState(false);

  const { data: processos = [] } = useQuery({ queryKey: ['processos-judiciais'], queryFn: () => agenciaAvenida.entities.ProcessoJudicial.list('-created_date') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (d) => editing ? agenciaAvenida.entities.ProcessoJudicial.update(editing, d) : agenciaAvenida.entities.ProcessoJudicial.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos-judiciais'] }); setOpen(false); toast.success('Processo guardado'); },
  });

  const remove = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.ProcessoJudicial.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos-judiciais'] }); toast.success('Processo eliminado'); },
  });

  const lancarDespesa = useMutation({
    mutationFn: async ({ processo, custoIdx }) => {
      const custo = processo.custos[custoIdx];
      const despesa = await agenciaAvenida.entities.Despesa.create({
        condominio_id: processo.condominio_id,
        descricao: `Processo judicial: ${custo.descricao}`,
        valor: custo.valor,
        data: custo.data,
        categoria: 'outros',
      });
      const custos = [...processo.custos];
      custos[custoIdx] = { ...custo, despesa_lancada: true, despesa_id: despesa.id };
      return agenciaAvenida.entities.ProcessoJudicial.update(processo.id, { custos });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos-judiciais'] }); toast.success('Despesa lançada no condomínio'); },
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setForm({ ...empty, condominio_id: selectedCondominioId && selectedCondominioId !== 'all' ? selectedCondominioId : '', custos: [] });
    setEditing(null);
    setShowCustoForm(false);
    setTimeout(() => setOpen(true), 0);
  };
  const openEdit = (p) => { setForm({ ...p, custos: p.custos || [] }); setEditing(p.id); setShowCustoForm(false); setOpen(true); };

  const addCusto = () => {
    if (!novoCusto.descricao || !novoCusto.valor) return;
    const custo = { ...novoCusto, id: Date.now().toString(), valor: parseFloat(novoCusto.valor), despesa_lancada: false };
    setForm(f => ({ ...f, custos: [...(f.custos || []), custo] }));
    setNovoCusto({ descricao: '', valor: '', fase: 'carta_normal', data: format(new Date(), 'yyyy-MM-dd') });
    setShowCustoForm(false);
  };

  const removeCusto = (idx) => setForm(f => ({ ...f, custos: f.custos.filter((_, i) => i !== idx) }));

  const getPessoa = (id) => pessoas.find(p => p.id === id);
  const getCond = (id) => condominios.find(c => c.id === id)?.nome || '-';
  const getFracao = (id) => fracoes.find(f => f.id === id)?.codigo || '-';

  const filtered = processos.filter(p => {
    const matchCond = selectedCondominioId === 'all' || p.condominio_id === selectedCondominioId;
    const devedor = getPessoa(p.pessoa_id);
    const matchSearch = !search || devedor?.nome?.toLowerCase().includes(search.toLowerCase()) || p.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchFase = filterFase === 'all' || p.fase === filterFase;
    return matchCond && matchSearch && matchFase;
  });

  return (
    <div>
      <PageHeader title="Processos Judiciais" subtitle="Acompanhamento de cobranças e processos legais"
        action={<Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Processo</Button>}
      />

      {/* Stats — clicáveis para filtrar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {Object.entries(FASES).map(([k, v]) => (
          <div
            key={k}
            onClick={() => setFilterFase(f => f === k ? 'all' : k)}
            className={`border rounded-xl p-4 cursor-pointer transition-all ${filterFase === k ? 'border-primary bg-primary/5' : 'bg-card border-border hover:border-primary/40'}`}
          >
            <p className="text-xs text-muted-foreground">{v.label}</p>
            <p className="text-2xl font-bold">{processos.filter(p => (selectedCondominioId === 'all' || p.condominio_id === selectedCondominioId) && p.fase === k).length}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-card border border-border rounded-xl text-muted-foreground">
            <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum processo judicial encontrado</p>
          </div>
        )}
        {filtered.map(proc => {
          const devedor = getPessoa(proc.pessoa_id);
          const fase = FASES[proc.fase] || { label: proc.fase, color: 'bg-gray-100 text-gray-700' };
          const totalCustos = (proc.custos || []).reduce((s, c) => s + (c.valor || 0), 0);
          return (
            <div key={proc.id} className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Scale className="w-4 h-4 text-red-500" />
                    <span className="font-semibold">{devedor?.nome || '—'}</span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${fase.color}`}>{fase.label}</span>
                    {proc.resposta_inquilino && proc.resposta_inquilino !== '' && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{RESPOSTAS[proc.resposta_inquilino]}</span>
                    )}
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>Condomínio: {getCond(proc.condominio_id)}</span>
                    {proc.fracao_id && <span>Fração: {getFracao(proc.fracao_id)}</span>}
                    <span className="font-medium text-foreground">Dívida: €{(proc.valor_divida || 0).toFixed(2)}</span>
                    {totalCustos > 0 && <span>Custos: €{totalCustos.toFixed(2)}</span>}
                    {proc.data_inicio && <span>Início: {proc.data_inicio}</span>}
                  </div>
                  {proc.descricao && <p className="text-sm text-muted-foreground mt-1">{proc.descricao}</p>}

                  {/* Custos */}
                  {(proc.custos || []).length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Custos associados:</p>
                      {proc.custos.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-1.5">
                          <span>{c.descricao} — €{c.valor?.toFixed(2)} ({FASES[c.fase]?.label || c.fase})</span>
                          {!c.despesa_lancada ? (
                            <button
                              onClick={() => lancarDespesa.mutate({ processo: proc, custoIdx: idx })}
                              className="text-primary hover:underline flex items-center gap-1 ml-2"
                            >
                              <Euro className="w-3 h-3" /> Lançar despesa
                            </button>
                          ) : (
                            <span className="text-green-600 flex items-center gap-1 ml-2"><CheckCircle className="w-3 h-3" /> Lançado</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(proc)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(proc.id)} className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Processo Judicial' : 'Novo Processo Judicial'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condomínio *</Label>
                <Select value={form.condominio_id} onValueChange={v => upd('condominio_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{condominios.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fração</Label>
                <Select value={form.fracao_id || ''} onValueChange={v => upd('fracao_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">Nenhuma</SelectItem>{fracoes.filter(f => !form.condominio_id || f.condominio_id === form.condominio_id).map(f => <SelectItem key={f.id} value={f.id}>{f.codigo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Devedor *</Label>
                <Select value={form.pessoa_id} onValueChange={v => upd('pessoa_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Advogado</Label>
                <Select value={form.advogado_id || ''} onValueChange={v => upd('advogado_id', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">Nenhum</SelectItem>{pessoas.filter(p => p.tipo === 'advogado').map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Input value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} placeholder="Ex: Dívida de quotas 2023-2024" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor da Dívida (€)</Label>
                <Input type="number" value={form.valor_divida || ''} onChange={e => upd('valor_divida', parseFloat(e.target.value) || 0)} className="mt-1" />
              </div>
              <div>
                <Label>Data de Início</Label>
                <Input type="date" value={form.data_inicio || ''} onChange={e => upd('data_inicio', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fase / Estado</Label>
                <Select value={form.fase} onValueChange={v => upd('fase', v)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(FASES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resposta do Devedor</Label>
                <Select value={form.resposta_inquilino || ''} onValueChange={v => upd('resposta_inquilino', v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sem resposta" /></SelectTrigger>
                  <SelectContent>{Object.entries(RESPOSTAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" value={form.notas || ''} onChange={e => upd('notas', e.target.value)} />
            </div>

            {/* Custos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Custos por Fase</Label>
                <button onClick={() => setShowCustoForm(true)} className="text-xs text-primary flex items-center gap-1 hover:underline">
                  <PlusCircle className="w-3.5 h-3.5" /> Adicionar custo
                </button>
              </div>
              {showCustoForm && (
                <div className="border border-border rounded-lg p-3 space-y-2 mb-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Descrição" value={novoCusto.descricao} onChange={e => setNovoCusto(p => ({ ...p, descricao: e.target.value }))} />
                    <Input type="number" placeholder="Valor (€)" value={novoCusto.valor} onChange={e => setNovoCusto(p => ({ ...p, valor: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={novoCusto.fase} onValueChange={v => setNovoCusto(p => ({ ...p, fase: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(FASES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input type="date" value={novoCusto.data} onChange={e => setNovoCusto(p => ({ ...p, data: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={() => setShowCustoForm(false)}>Cancelar</Button>
                    <Button size="sm" onClick={addCusto}>Adicionar</Button>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                {(form.custos || []).map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5">
                    <span>{c.descricao} — €{parseFloat(c.valor).toFixed(2)} ({FASES[c.fase]?.label || c.fase})</span>
                    <button onClick={() => removeCusto(idx)} className="text-red-400 hover:text-red-600 ml-2 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.pessoa_id) { toast.error('Selecione o devedor'); return; }
                if (!form.condominio_id) { toast.error('Selecione o condomínio'); return; }
                save.mutate(form);
              }}
              disabled={save.isPending}
            >{save.isPending ? 'A guardar...' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}