import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Search, Scale, Trash2, Edit, PlusCircle, Pencil, Printer, Check, ChevronsUpDown, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useCondominio } from '@/lib/CondominioContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const FASES = {
  carta_normal: { label: 'Carta Normal Enviada', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  carta_registada_ar: { label: 'Carta Registada/AR', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  carta_advogado: { label: 'Carta Advogado', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  processo_judicial: { label: 'Processo Judicial', color: 'bg-red-100 text-red-700 border-red-200' },
  encerrado: { label: 'Encerrado', color: 'bg-green-100 text-green-700 border-green-200' },
};

const RESPOSTAS = {
  __none__: 'Sem resposta registada',
  nao_responde: 'Não Responde',
  carta_devolvida: 'Carta Devolvida',
  negociacao: 'Negociação',
  cobranca_judicial: 'Aguarda Cobrança Judicial',
  divida_paga: 'Dívida Paga',
  plano_pagamento: 'Plano de Pagamento Efetuado',
};

const empty = {
  condominio_id: '', fracao_id: '', pessoa_id: [], advogado_id: '', 
  descricao: '', valor_divida: 0, fase: 'carta_normal', resposta_inquilino: '',
  data_inicio: format(new Date(), 'yyyy-MM-dd'), notas: '', custos: [],
};

const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try { const parsed = JSON.parse(data); return Array.isArray(parsed) ? parsed : [data]; }
    catch (e) { return data.includes(',') ? data.split(',').map(s => s.trim()) : [data]; }
  }
  return [];
};

const formatFracao = (f) => {
  if (!f) return '-';
  return `${f.codigo_fracao || f.codigo || ''} ${f.descricao_piso_lado ? `(${f.descricao_piso_lado})` : ''}`.trim() || '-';
};

function ProcessoPreview({ proc, pessoas, condNome, fracaoCod, onClose, onEdit }) {
  const qc = useQueryClient();
  const [notas, setNotas] = useState(proc.notas || '');
  const [showCustoForm, setShowCustoForm] = useState(false);
  const [novoCusto, setNovoCusto] = useState({ descricao: '', valor: '', fase: proc.fase, data: format(new Date(), 'yyyy-MM-dd') });

  // Manter as notas sincronizadas caso o proc atualize por fora
  useEffect(() => { setNotas(proc.notas || ''); }, [proc.notas]);

  const updateProc = useMutation({
    mutationFn: async (partialData) => {
      if (partialData.resposta_inquilino === '__none__') partialData.resposta_inquilino = '';
      return await agenciaAvenida.entities.ProcessoJudicial.update(proc.id, partialData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['processos-judiciais'] });
      toast.success('PROCESSO ATUALIZADO COM SUCESSO');
    },
    onError: (e) => toast.error('ERRO AO ATUALIZAR: ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const handleAddCusto = () => {
    if (!novoCusto.descricao || !novoCusto.valor) return;
    const custo = { ...novoCusto, id: Date.now().toString(), valor: parseFloat(novoCusto.valor) };
    const updatedCustos = [...(proc.custos || []), custo];
    
    updateProc.mutate({ custos: updatedCustos }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['processos-judiciais'] });
        toast.success('CUSTO ADICIONADO COM SUCESSO');
        setNovoCusto({ descricao: '', valor: '', fase: proc.fase, data: format(new Date(), 'yyyy-MM-dd') });
        setShowCustoForm(false);
      }
    });
  };

  const handleRemoveCusto = (idx) => {
    const updatedCustos = proc.custos.filter((_, i) => i !== idx);
    updateProc.mutate({ custos: updatedCustos }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['processos-judiciais'] });
        toast.success('CUSTO REMOVIDO COM SUCESSO');
      }
    });
  };

  const fase = FASES[proc.fase] || { label: proc.fase, color: 'bg-gray-100 text-gray-700' };
  const totalCustos = (proc.custos || []).reduce((s, c) => s + (c.valor || 0), 0);
  const valorTotal = (proc.valor_divida || 0) + totalCustos;
  
  const devedoresIds = normalizeArray(proc.pessoa_id);
  const adv = pessoas.find(p => p.id === proc.advogado_id);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl z-[200]">
        <div className="flex items-start justify-between mb-4 print:hidden pr-8">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> Detalhes do Processo</h2>
            <p className="text-sm text-muted-foreground">{condNome} {fracaoCod && `· Fração ${fracaoCod}`}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />Imprimir
            </Button>
            <Button size="sm" onClick={() => { onClose(); onEdit(proc); }} className="gap-1">
              <Pencil className="w-3.5 h-3.5" />Editar Tudo
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 bg-muted/40 border border-border rounded-lg p-5 mb-4 text-sm">
          <div>
            <span className="font-medium text-muted-foreground block mb-1">Fase Atual</span>
            <Select value={proc.fase} onValueChange={(v) => updateProc.mutate({ fase: v })}>
              <SelectTrigger className={cn("h-8 text-xs font-semibold border", fase.color)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[250]">
                {Object.entries(FASES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="font-medium text-muted-foreground block mb-1">Resposta do Devedor</span> 
            <Select value={proc.resposta_inquilino || '__none__'} onValueChange={(v) => updateProc.mutate({ resposta_inquilino: v })}>
              <SelectTrigger className="h-8 text-xs font-semibold bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[250]">
                {Object.entries(RESPOSTAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 border-t border-border pt-3 mt-1">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Valor em Dívida</span><span className="font-bold text-base text-red-600">€{(proc.valor_divida || 0).toFixed(2)}</span></div>
              <div><span className="text-muted-foreground block text-xs uppercase tracking-wider">Custos Judiciais / Honorários</span><span className="font-bold text-base text-orange-600">€{totalCustos.toFixed(2)}</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Devedores Associados</p>
            {devedoresIds.length === 0 && <p className="text-sm text-muted-foreground">Nenhum devedor</p>}
            <div className="space-y-2">
              {devedoresIds.map(id => {
                const d = pessoas.find(p => p.id === id);
                if(!d) return null;
                return (
                  <div key={id} className="pb-2 border-b border-border last:border-0 last:pb-0">
                    <p className="font-semibold text-sm text-foreground">{d.nome}</p>
                    {d.telefone && <span className="text-xs text-muted-foreground mr-2">Tel: {d.telefone}</span>}
                    {d.nif && <span className="text-xs text-muted-foreground">NIF: {d.nif}</span>}
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Advogado Atribuído</p>
            <p className="font-semibold text-foreground">{adv?.nome || 'Nenhum'}</p>
            {adv?.telefone && <p className="text-xs text-muted-foreground mt-1">Tel: {adv.telefone}</p>}
          </div>
        </div>

        {proc.descricao && (
          <div className="mb-4 bg-background border border-border rounded-lg p-3 shadow-sm">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Descrição</p>
            <p className="text-sm text-foreground">{proc.descricao}</p>
          </div>
        )}

        {/* OBSERVAÇÕES INTERNAS - EDIÇÃO RÁPIDA */}
        <div className="mb-6 bg-muted/10 border border-border rounded-lg p-3">
          <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Notas Internas</p>
          <textarea
            className="w-full text-sm text-foreground bg-background p-2 rounded-md border border-dashed border-input min-h-[80px] resize-y focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mb-2"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Escreva ou edite anotações exclusivas para a equipa..."
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground font-semibold transition-colors"
            onClick={() => updateProc.mutate({ notas })}
            disabled={updateProc.isPending || notas === (proc.notas || '')}
          >
            {updateProc.isPending ? 'A GRAVAR...' : 'GUARDAR NOTAS'}
          </Button>
        </div>

        {/* CUSTOS - EDIÇÃO RÁPIDA */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Histórico de Custos Associados</p>
            <button onClick={() => setShowCustoForm(!showCustoForm)} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline bg-primary/10 px-2 py-1 rounded-md">
              <PlusCircle className="w-3.5 h-3.5" /> Adicionar custo
            </button>
          </div>

          {showCustoForm && (
            <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-3 mb-4 shadow-inner">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Descrição</Label><Input placeholder="Ex: Taxa de justiça" value={novoCusto.descricao} onChange={e => setNovoCusto(p => ({ ...p, descricao: e.target.value }))} className="bg-background mt-1 h-8 text-sm" /></div>
                <div><Label className="text-xs">Valor (€)</Label><Input type="number" placeholder="0.00" value={novoCusto.valor} onChange={e => setNovoCusto(p => ({ ...p, valor: e.target.value }))} className="bg-background mt-1 h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Fase Associada</Label>
                  <Select value={novoCusto.fase} onValueChange={v => setNovoCusto(p => ({ ...p, fase: v }))}>
                    <SelectTrigger className="bg-background mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[250]">{Object.entries(FASES).map(([k, v]) => <SelectItem key={k} value={k} className="text-sm">{v.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Data</Label><Input type="date" value={novoCusto.data} onChange={e => setNovoCusto(p => ({ ...p, data: e.target.value }))} className="bg-background mt-1 h-8 text-sm" /></div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-border">
                <Button size="sm" variant="outline" onClick={() => setShowCustoForm(false)} className="h-8">Cancelar</Button>
                <Button size="sm" onClick={handleAddCusto} disabled={updateProc.isPending} className="h-8 gap-1"><Plus className="w-3.5 h-3.5"/>Inserir Custo</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {(proc.custos || []).length === 0 && !showCustoForm && <p className="text-xs text-muted-foreground italic">Sem custos registados neste processo.</p>}
            {(proc.custos || []).map((c, idx) => (
              <div key={idx} className="flex justify-between items-center bg-muted/50 border border-border rounded-lg p-3 text-sm hover:border-red-200 group transition-colors">
                <div>
                  <p className="font-semibold">{c.descricao} <span className="text-muted-foreground font-normal ml-1">({FASES[c.fase]?.label || c.fase})</span></p>
                  <p className="text-xs text-muted-foreground">{c.data}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-orange-600">€{parseFloat(c.valor).toFixed(2)}</p>
                  <button onClick={() => handleRemoveCusto(idx)} className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100" title="Remover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}

export default function ProcessosJudiciais() {
  const qc = useQueryClient();
  const { selectedCondominioId, selectedAno } = useCondominio();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [previewId, setPreviewId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterFase, setFilterFase] = useState('all');
  const [showEmAberto, setShowEmAberto] = useState(false);
  
  const [novoCusto, setNovoCusto] = useState({ descricao: '', valor: '', fase: 'carta_normal', data: format(new Date(), 'yyyy-MM-dd') });
  const [showCustoForm, setShowCustoForm] = useState(false);

  // Combobox States
  const [comboCond, setComboCond] = useState(false);
  const [comboDev, setComboDev] = useState(false);
  const [comboAdv, setComboAdv] = useState(false);

  const { data: processos = [] } = useQuery({ queryKey: ['processos-judiciais'], queryFn: () => agenciaAvenida.entities.ProcessoJudicial.list('-created_at') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const condominiosAtivos = condominios.filter(c => c && c.ativo !== false).sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const advogados = pessoas.filter(p => normalizeArray(p.tipo).includes('advogado')).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
  const devedores = pessoas.filter(p => normalizeArray(p.tipo).includes('condomino')).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));

  const save = useMutation({
    mutationFn: async (d) => {
      const payload = { 
        ...d, 
        fracao_id: d.fracao_id === '__none__' ? null : d.fracao_id,
        advogado_id: d.advogado_id === '__none__' ? null : d.advogado_id,
        resposta_inquilino: d.resposta_inquilino === '__none__' ? '' : d.resposta_inquilino
      };
      return editing ? await agenciaAvenida.entities.ProcessoJudicial.update(editing, payload) : await agenciaAvenida.entities.ProcessoJudicial.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos-judiciais'] }); setOpen(false); toast.success('PROCESSO GUARDADO COM SUCESSO'); },
    onError: (e) => toast.error('ERRO AO GUARDAR: ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const remove = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.ProcessoJudicial.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos-judiciais'] }); toast.success('PROCESSO ELIMINADO COM SUCESSO'); },
    onError: (e) => toast.error('ERRO AO ELIMINAR: ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setForm({ 
      ...empty, 
      condominio_id: selectedCondominioId && selectedCondominioId !== 'all' ? selectedCondominioId : '', 
      pessoa_id: [],
      custos: [] 
    });
    setEditing(null);
    setShowCustoForm(false);
    setOpen(true);
  };

  const openEdit = (p) => { 
    setForm({ 
      ...p, 
      fracao_id: p.fracao_id || '__none__',
      advogado_id: p.advogado_id || '__none__',
      resposta_inquilino: p.resposta_inquilino || '__none__',
      pessoa_id: normalizeArray(p.pessoa_id),
      custos: p.custos || [] 
    }); 
    setEditing(p.id); 
    setShowCustoForm(false); 
    setOpen(true); 
  };

  const handleFracaoChange = (fracaoId) => {
    upd('fracao_id', fracaoId);
    if (fracaoId !== '__none__') {
      const fracao = fracoes.find(x => x.id === fracaoId);
      if (fracao && fracao.titulares) {
        const titularesArr = normalizeArray(fracao.titulares);
        if (titularesArr.length > 0) {
          upd('pessoa_id', titularesArr);
          toast.success('DEVEDORES PREENCHIDOS AUTOMATICAMENTE');
        }
      }
    }
  };

  const addCusto = () => {
    if (!novoCusto.descricao || !novoCusto.valor) return;
    const custo = { ...novoCusto, id: Date.now().toString(), valor: parseFloat(novoCusto.valor) };
    setForm(f => ({ ...f, custos: [...(f.custos || []), custo] }));
    setNovoCusto({ descricao: '', valor: '', fase: 'carta_normal', data: format(new Date(), 'yyyy-MM-dd') });
    setShowCustoForm(false);
  };

  const removeCusto = (idx) => setForm(f => ({ ...f, custos: f.custos.filter((_, i) => i !== idx) }));

  const getCond = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const filtered = processos.filter(p => {
    const matchCond = selectedCondominioId === 'all' || p.condominio_id === selectedCondominioId;
    
    // Regra do Botão "Em Aberto, Desde Sempre"
    const dataStr = String(p.data_inicio || p.created_at || '');
    const matchAno = showEmAberto ? true : (!selectedAno || selectedAno === 'all' || dataStr.includes(String(selectedAno)));
    const matchFase = showEmAberto ? p.fase !== 'encerrado' : (filterFase === 'all' || p.fase === filterFase);
    
    const devedoresDoProcesso = normalizeArray(p.pessoa_id);
    const devedoresNomes = devedoresDoProcesso.map(id => pessoas.find(x => x.id === id)?.nome).join(' ');
    const matchSearch = !search || devedoresNomes.toLowerCase().includes(search.toLowerCase()) || p.descricao?.toLowerCase().includes(search.toLowerCase());
    
    return matchCond && matchSearch && matchFase && matchAno;
  });

  // Garantir que a pré-visualização tem sempre os dados mais recentes após as gravações internas
  const procPreviewData = previewId ? processos.find(p => p.id === previewId) : null;

  return (
    <div>
      <PageHeader title="Processos Judiciais" subtitle="Acompanhamento de processos judiciais e gestão da dívida."
        action={<Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Processo</Button>}
      />

      <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl mb-6 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <p><strong>AVISO IMPORTANTE:</strong> Encerrar um processo nesta página não liquida a dívida existente. Após o processo ser marcado como encerrado nesta página, o registo do pagamento da dívida e a emissão do respetivo recibo devem ser feitos no módulo correspondente.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {Object.entries(FASES).map(([k, v]) => {
          const count = processos.filter(p => (selectedCondominioId === 'all' || p.condominio_id === selectedCondominioId) && p.fase === k).length;
          return (
            <div
              key={k}
              onClick={() => { setFilterFase(f => f === k ? 'all' : k); setShowEmAberto(false); }}
              className={`border rounded-xl p-4 cursor-pointer transition-all ${filterFase === k && !showEmAberto ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'bg-card border-border hover:border-primary/40'}`}
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate">{v.label}</p>
              <p className="text-3xl font-black mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-background w-full" placeholder="Pesquisar por devedor ou descrição..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button 
          variant={showEmAberto ? "default" : "outline"}
          className={showEmAberto ? "bg-primary text-primary-foreground font-bold" : "bg-background text-muted-foreground"}
          onClick={() => { setShowEmAberto(!showEmAberto); setFilterFase('all'); }}
        >
          Em Aberto, Desde Sempre
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 bg-card border border-dashed border-border rounded-xl text-muted-foreground">
            <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum Processo Judicial Encontrado</p>
          </div>
        )}
        {filtered.map(proc => {
          const devIds = normalizeArray(proc.pessoa_id);
          const nomesDevedores = devIds.map(id => pessoas.find(p => p.id === id)?.nome).filter(Boolean).join(', ') || 'Devedor Desconhecido';
          const fase = FASES[proc.fase] || { label: proc.fase, color: 'bg-gray-100 text-gray-700 border-gray-200' };
          const totalCustos = (proc.custos || []).reduce((s, c) => s + (c.valor || 0), 0);
          
          return (
            <div 
              key={proc.id} 
              onClick={() => setPreviewId(proc.id)}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-red-50 rounded-xl shrink-0">
                      <Scale className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground leading-tight line-clamp-1">{nomesDevedores}</span>
                      <p className="text-xs font-medium text-muted-foreground mt-0.5">{getCond(proc.condominio_id)} {proc.fracao_id && `· ${formatFracao(fracoes.find(f => f.id === proc.fracao_id))}`}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(proc)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                    <button onClick={() => remove.mutate(proc.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${fase.color}`}>{fase.label}</span>
                  {proc.resposta_inquilino && proc.resposta_inquilino !== '' && proc.resposta_inquilino !== '__none__' && (
                    <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">{RESPOSTAS[proc.resposta_inquilino]}</span>
                  )}
                </div>

                <div className="flex justify-between items-center bg-muted/40 p-3 rounded-lg border border-border mb-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Valor Dívida</p>
                    <p className="font-black text-red-600">€{(proc.valor_divida || 0).toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground">Data Início</p>
                    <p className="font-bold text-foreground">{proc.data_inicio ? format(new Date(proc.data_inicio), 'dd/MM/yyyy') : '-'}</p>
                  </div>
                  {totalCustos > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Custos</p>
                      <p className="font-bold text-orange-600">€{totalCustos.toFixed(2)}</p>
                    </div>
                  )}
                </div>

                {proc.descricao && <p className="text-sm text-muted-foreground line-clamp-2">{proc.descricao}</p>}
              </div>

              {(proc.custos || []).length > 0 && (
                <div className="mt-4 pt-3 border-t border-border" onClick={e => e.stopPropagation()}>
                  <div className="space-y-1">
                    {proc.custos.map((c, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1.5">
                        <span className="truncate flex-1" title={c.descricao}>{c.descricao}</span>
                        <span className="font-bold text-orange-600 shrink-0">€{parseFloat(c.valor || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {procPreviewData && (
        <ProcessoPreview 
          proc={procPreviewData} 
          pessoas={pessoas}
          condNome={getCond(procPreviewData.condominio_id)}
          fracaoCod={procPreviewData.fracao_id ? formatFracao(fracoes.find(f => f.id === procPreviewData.fracao_id)) : null}
          onClose={() => setPreviewId(null)} 
          onEdit={(p) => { setPreviewId(null); openEdit(p); }} 
        />
      )}

      {/* Dialog Criação/Edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Scale className="w-5 h-5 text-primary" />{editing ? 'Editar Processo Judicial' : 'Novo Processo Judicial'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condomínio *</Label>
                <Popover open={comboCond} onOpenChange={setComboCond}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboCond} className="w-full justify-between font-normal bg-background mt-1">
                      <span className="truncate">
                        {form.condominio_id ? condominiosAtivos.find(c => c.id === form.condominio_id)?.nome : "Selecione ou pesquise..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar condomínio..." />
                      <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        {condominiosAtivos.map(c => (
                          <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { upd('condominio_id', c.id); upd('fracao_id', '__none__'); setComboCond(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", form.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                            {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>} {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Fração Associada</Label>
                <Select value={form.fracao_id || '__none__'} onValueChange={handleFracaoChange} disabled={!form.condominio_id}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent className="z-[210] max-h-48">
                    <SelectItem value="__none__">Sem Fração / Geral</SelectItem>
                    {fracoes.filter(f => String(f.condominio_id) === String(form.condominio_id)).map(f => (
                      <SelectItem key={f.id} value={f.id}>{formatFracao(f)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Devedor / Devedores *</Label>
                <Popover open={comboDev} onOpenChange={setComboDev}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboDev} className="w-full justify-between font-normal bg-background mt-1">
                      <span className="truncate">Adicionar devedor...</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar devedor..." />
                      <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        {devedores.map(p => (
                          <CommandItem key={p.id} value={p.nome} onSelect={() => { 
                            if (!form.pessoa_id.includes(p.id)) upd('pessoa_id', [...form.pessoa_id, p.id]);
                            setComboDev(false); 
                          }}>
                            <Check className={cn("mr-2 h-4 w-4", form.pessoa_id.includes(p.id) ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                {form.pessoa_id.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.pessoa_id.map(id => {
                      const p = pessoas.find(x => x.id === id);
                      if(!p) return null;
                      return (
                        <div key={id} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2.5 py-1 rounded-md text-xs font-semibold">
                          {p.nome}
                          <button onClick={() => upd('pessoa_id', form.pessoa_id.filter(x => x !== id))} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                            <X className="w-3 h-3"/>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              
              <div>
                <Label>Advogado Atribuído</Label>
                <Popover open={comboAdv} onOpenChange={setComboAdv}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboAdv} className="w-full justify-between font-normal bg-background mt-1">
                      <span className="truncate">
                        {form.advogado_id && form.advogado_id !== '__none__' ? advogados.find(p => p.id === form.advogado_id)?.nome : "Nenhum"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar advogado..." />
                      <CommandEmpty>Nenhum advogado encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        <CommandItem value="__none__" onSelect={() => { upd('advogado_id', '__none__'); setComboAdv(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.advogado_id === '__none__' || !form.advogado_id ? "opacity-100" : "opacity-0")} />
                          Nenhum
                        </CommandItem>
                        {advogados.map(p => (
                          <CommandItem key={p.id} value={p.nome} onSelect={() => { upd('advogado_id', p.id); setComboAdv(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", form.advogado_id === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div>
              <Label>Descrição / Resumo</Label>
              <Input value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} placeholder="Ex: Dívida de Quotas 2023-2024" className="mt-1 bg-background" />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
              <div>
                <Label>Valor Inicial da Dívida (€)</Label>
                <Input type="number" value={form.valor_divida || ''} onChange={e => upd('valor_divida', parseFloat(e.target.value) || 0)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label>Data de Início do Processo</Label>
                <Input type="date" value={form.data_inicio || ''} onChange={e => upd('data_inicio', e.target.value)} className="mt-1 bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fase / Estado Atual</Label>
                <Select value={form.fase} onValueChange={v => upd('fase', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    {Object.entries(FASES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Resposta do Devedor</Label>
                <Select value={form.resposta_inquilino || '__none__'} onValueChange={v => upd('resposta_inquilino', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Sem resposta" /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    {Object.entries(RESPOSTAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Notas Internas</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" placeholder="Escreva ou edite anotações exclusivas para a equipa..." value={form.notas || ''} onChange={e => upd('notas', e.target.value)} />
            </div>

            {/* Custos */}
            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center justify-between mb-3">
                <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Custos Judiciais, Honorários e Despesas</Label>
                <button onClick={() => setShowCustoForm(!showCustoForm)} className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline bg-primary/10 px-2 py-1 rounded-md">
                  <PlusCircle className="w-3.5 h-3.5" /> Adicionar Custo
                </button>
              </div>
              
              {showCustoForm && (
                <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-3 mb-4 shadow-inner">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Descrição</Label><Input placeholder="Ex: Taxa de justiça" value={novoCusto.descricao} onChange={e => setNovoCusto(p => ({ ...p, descricao: e.target.value }))} className="bg-background mt-1 h-8 text-sm" /></div>
                    <div><Label className="text-xs">Valor (€)</Label><Input type="number" placeholder="0.00" value={novoCusto.valor} onChange={e => setNovoCusto(p => ({ ...p, valor: e.target.value }))} className="bg-background mt-1 h-8 text-sm" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Fase Associada</Label>
                      <Select value={novoCusto.fase} onValueChange={v => setNovoCusto(p => ({ ...p, fase: v }))}>
                        <SelectTrigger className="bg-background mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[210]">{Object.entries(FASES).map(([k, v]) => <SelectItem key={k} value={k} className="text-sm">{v.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-xs">Data</Label><Input type="date" value={novoCusto.data} onChange={e => setNovoCusto(p => ({ ...p, data: e.target.value }))} className="bg-background mt-1 h-8 text-sm" /></div>
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t border-border">
                    <Button size="sm" variant="outline" onClick={() => setShowCustoForm(false)} className="h-8">Cancelar</Button>
                    <Button size="sm" onClick={addCusto} className="h-8 gap-1"><Plus className="w-3.5 h-3.5"/>Inserir Custo</Button>
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5">
                {(form.custos || []).length === 0 && !showCustoForm && <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded text-center">Sem custos registados neste processo.</p>}
                {(form.custos || []).map((c, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-background border border-border rounded-lg px-3 py-2 shadow-sm">
                    <div>
                      <span className="font-semibold text-foreground">{c.descricao}</span>
                      <span className="text-xs text-muted-foreground ml-2">({FASES[c.fase]?.label || c.fase})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-orange-600">€{parseFloat(c.valor).toFixed(2)}</span>
                      <button onClick={() => removeCusto(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Remover"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.pessoa_id || form.pessoa_id.length === 0) { toast.error('SELECIONE PELO MENOS UM DEVEDOR'); return; }
                if (!form.condominio_id) { toast.error('SELECIONE O CONDOMÍNIO'); return; }
                save.mutate(form);
              }}
              disabled={save.isPending}
            >{save.isPending ? 'A GUARDAR...' : 'GUARDAR PROCESSO'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}