import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Search, TrendingUp, TrendingDown, Wallet, Pencil, Trash2, Download, Calculator, FileCheck, Check, ChevronsUpDown, Eye, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';
import { cn } from '@/lib/utils';

const categoriasDespesa = {
  limpeza: 'Limpeza', manutencao_obras: 'Manutenção / Obras', seguros: 'Seguros',
  eletricidade: 'Eletricidade', agua: 'Água', elevadores: 'Elevadores',
  encargos_juridicos: 'Encargos Jurídicos', encargos_administrativos: 'Encargos Administrativos',
  encargos_bancarios: 'Encargos Bancários', acerto_contabilistico: 'Acerto Contabilístico',
  piscina: 'Piscina', encargos_camararios: 'Encargos Camarários'
};

const categoriasReceita = {
  quota: 'Quotas', recuperacao_divida: 'Recuperação Dívida', taxas_outros: 'Taxas / Outros Faturados'
};

const allCategorias = { ...categoriasDespesa, ...categoriasReceita };

const categoriasDespesaOrdenadas = Object.entries(categoriasDespesa).sort((a, b) => a[1].localeCompare(b[1], 'pt'));
const categoriasReceitaOrdenadas = Object.entries(categoriasReceita).sort((a, b) => a[1].localeCompare(b[1], 'pt'));

const emptyDespesa = {
  condominio_id: '', tipo: 'despesa', categoria: '', descricao: '',
  valor: '', data: format(new Date(), 'yyyy-MM-dd'), conta: 'banco',
  metodo_pagamento: 'transferencia', fornecedor_id: '', observacoes: ''
};

const normalizeTipoPessoa = (tipoData) => {
  if (!tipoData) return [];
  let parsedArray = [];
  if (Array.isArray(tipoData)) parsedArray = tipoData;
  else if (typeof tipoData === 'string') {
    try { const parsed = JSON.parse(tipoData); parsedArray = Array.isArray(parsed) ? parsed : [tipoData]; }
    catch (e) {
      const cleanStr = tipoData.trim().replace(/^\{|\}$/g, '');
      parsedArray = cleanStr.includes(',') ? cleanStr.split(',') : [cleanStr];
    }
  }
  let finalArray = [];
  parsedArray.forEach(item => {
    if (item === null || item === undefined) return;
    if (typeof item === 'string') {
      let clean = item.trim().replace(/^"|"$/g, '');
      if (clean.startsWith('[') && clean.endsWith(']')) { try { const innerParsed = JSON.parse(clean); if (Array.isArray(innerParsed)) { finalArray.push(...innerParsed); return; } } catch (e) { } }
      clean = clean.replace(/"/g, '').trim();
      if (clean.includes(',')) finalArray.push(...clean.split(',').map(s => s.trim()));
      else if (clean) finalArray.push(clean);
    } else finalArray.push(String(item));
  });
  return [...new Set(finalArray)].map(t => String(t).toLowerCase());
};

export default function Movimentos() {
  const qc = useQueryClient();
  const { selectedCondominioId, selectedAno } = useCondominio();

  const [openDespesa, setOpenDespesa] = useState(false);
  const [openFecho, setOpenFecho] = useState(false);
  const [openPreview, setOpenPreview] = useState(null);
  const [openEstorno, setOpenEstorno] = useState(null);

  const [comboCondominioOpen, setComboCondominioOpen] = useState(false);
  const [comboFornecedorOpen, setComboFornecedorOpen] = useState(false);
  const [form, setForm] = useState(emptyDespesa);
  const [editing, setEditing] = useState(null);

  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [filterConta, setFilterConta] = useState('all');
  const [filterCategoria, setFilterCategoria] = useState('all');

  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  useEffect(() => {
    if (selectedAno !== 'all') {
      setPeriodoInicio(`${selectedAno}-01-01`);
      setPeriodoFim(`${selectedAno}-12-31`);
    } else {
      const hoje = new Date();
      setPeriodoInicio(format(startOfMonth(hoje), 'yyyy-MM-dd'));
      setPeriodoFim(format(endOfMonth(hoje), 'yyyy-MM-dd'));
    }
  }, [selectedAno]);

  const [dreData, setDreData] = useState({ receitas: {}, despesas: {}, saldoInicial: 0, observacoes: '' });

  const { data: movimentos = [], isLoading } = useQuery({
    queryKey: ['movimentos'],
    queryFn: () => agenciaAvenida.entities.Movimento.list('-data')
  });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const condominiosAtivos = condominios.filter(c => c && c.ativo !== false && c.ativo !== 'false').sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const fornecedoresAtivos = pessoas.filter(p => p && normalizeTipoPessoa(p.tipo).includes('fornecedor')).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));

  const save = useMutation({
    mutationFn: (data) => editing
      ? agenciaAvenida.entities.Movimento.update(editing, data)
      : agenciaAvenida.entities.Movimento.create(data),
    onSuccess: async (saved, vars) => {
      const cond = condominios.find(c => c.id === vars.condominio_id);
      if (cond) {
        const delta = parseFloat(vars.valor) || 0;
        const saldoField = vars.conta === 'banco' ? 'saldo_banco' : 'saldo_caixa';
        const change = vars.tipo === 'receita' ? delta : -delta;

        if (editing) {
          const prev = movimentos.find(m => m.id === editing);
          if (prev) {
            const prevField = prev.conta === 'banco' ? 'saldo_banco' : 'saldo_caixa';
            const prevChange = prev.tipo === 'receita' ? -(prev.valor || 0) : (prev.valor || 0);
            await agenciaAvenida.entities.Condominio.update(cond.id, { [prevField]: (cond[prevField] || 0) + prevChange });
          }
        }
        const condAtual = await agenciaAvenida.entities.Condominio.list();
        const condNow = condAtual.find(c => c.id === vars.condominio_id);
        if (condNow) {
          await agenciaAvenida.entities.Condominio.update(cond.id, { [saldoField]: (condNow[saldoField] || 0) + change });
        }
      }
      qc.invalidateQueries({ queryKey: ['movimentos'] });
      qc.invalidateQueries({ queryKey: ['condominios'] });
      setOpenDespesa(false);
      toast.success(editing ? 'DESPESA ATUALIZADA COM SUCESSO' : 'DESPESA REGISTADA COM SUCESSO');
    },
  });

  const executarEstorno = useMutation({
    mutationFn: async (mov) => {
      await agenciaAvenida.entities.Movimento.delete(mov.id);

      const cond = condominios.find(c => c.id === mov.condominio_id);
      if (cond) {
        const saldoField = mov.conta === 'banco' ? 'saldo_banco' : 'saldo_caixa';
        const change = mov.tipo === 'receita' ? -(mov.valor || 0) : (mov.valor || 0);
        await agenciaAvenida.entities.Condominio.update(cond.id, { [saldoField]: (cond[saldoField] || 0) + change });
      }

      if (mov.tipo === 'receita') {
        const allQuotas = await agenciaAvenida.entities.Quota.list();
        const quotasAEstornar = allQuotas.filter(q =>
          q.condominio_id === mov.condominio_id &&
          (q.estado === 'pago' || q.valor_pago > 0)
        );

        const promises = quotasAEstornar.map(q => {
          if (q.tipo === 'linha_faturacao_credito') {
            return agenciaAvenida.entities.Quota.delete(q.id);
          }

          let novoEstado = 'pendente';
          if (q.tipo === 'linha_faturacao_divida') {
            novoEstado = 'vencida';
          } else if (q.data_vencimento) {
            const dataVenc = new Date(q.data_vencimento);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            if (dataVenc < hoje) {
              novoEstado = 'vencida';
            }
          }
          return agenciaAvenida.entities.Quota.update(q.id, { estado: novoEstado, valor_pago: 0 });
        });

        await Promise.all(promises);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['movimentos'] });
      qc.invalidateQueries({ queryKey: ['condominios'] });
      qc.invalidateQueries({ queryKey: ['quotas'] });
      setOpenEstorno(null);
      toast.success('MOVIMENTO ELIMINADO E CONTAS RESTAURADAS COM SUCESSO.');
    },
    onError: (e) => toast.error('ERRO NO ESTORNO ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const openNew = () => { setForm({ ...emptyDespesa, condominio_id: selectedCondominioId === 'all' ? '' : selectedCondominioId }); setEditing(null); setOpenDespesa(true); };
  const openEdit = (m) => { setForm(m); setEditing(m.id); setOpenDespesa(true); };
  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const handleOpenFecho = () => {
    const anoFecho = selectedAno === 'all' ? new Date().getFullYear() : selectedAno;
    const movsAno = movimentos.filter(m => m.condominio_id === selectedCondominioId && String(m.data).startsWith(String(anoFecho)));
    const movsAnteriores = movimentos.filter(m => m.condominio_id === selectedCondominioId && String(m.data) < `${anoFecho}-01-01`);

    const saldoTransitado = movsAnteriores.reduce((acc, m) => acc + (m.tipo === 'receita' ? m.valor : -m.valor), 0);

    const recs = {}; const desps = {};
    Object.keys(categoriasReceita).forEach(k => recs[k] = 0);
    Object.keys(categoriasDespesa).forEach(k => desps[k] = 0);

    movsAno.forEach(m => {
      if (m.tipo === 'receita') recs[m.categoria] = (recs[m.categoria] || 0) + m.valor;
      if (m.tipo === 'despesa') desps[m.categoria] = (desps[m.categoria] || 0) + m.valor;
    });

    setDreData({ receitas: recs, despesas: desps, saldoInicial: saldoTransitado, observacoes: '' });
    setOpenFecho(true);
  };

  const handleEmitirFecho = () => {
    toast.success('EMISSÃO DO FECHO DE CONTAS INICIADO');
    setOpenFecho(false);
  };

  const filtered = useMemo(() => movimentos.filter(m => {
    const matchCond = selectedCondominioId === 'all' || m.condominio_id === selectedCondominioId;
    const matchTipo = filterTipo === 'all' || m.tipo === filterTipo;
    const matchConta = filterConta === 'all' || m.conta === filterConta;
    const matchCat = filterCategoria === 'all' || m.categoria === filterCategoria;
    const matchSearch = !search || m.descricao?.toLowerCase().includes(search.toLowerCase());
    const d = m.data;
    const matchPeriodo = (!periodoInicio || d >= periodoInicio) && (!periodoFim || d <= periodoFim);
    return matchCond && matchTipo && matchConta && matchCat && matchSearch && matchPeriodo;
  }), [movimentos, selectedCondominioId, filterTipo, filterConta, filterCategoria, search, periodoInicio, periodoFim]);

  const totalReceitas = filtered.filter(m => m.tipo === 'receita').reduce((s, m) => s + (m.valor || 0), 0);
  const totalDespesas = filtered.filter(m => m.tipo === 'despesa').reduce((s, m) => s + (m.valor || 0), 0);
  const saldoPeriodo = totalReceitas - totalDespesas;

  const condAtual = condominios.find(c => c.id === selectedCondominioId);
  const saldoGlobal = condAtual ? ((condAtual.saldo_banco || 0) + (condAtual.saldo_caixa || 0)) : 0;

  return (
    <div className="space-y-6 relative z-10">
      <PageHeader
        title="Financeiro & Tesouraria"
        subtitle="Registo de movimentos, despesas e fecho de contas."
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full">
        <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white shadow-md gap-2" onClick={openNew}>
          <TrendingDown className="w-5 h-5" /> Registar Despesa
        </Button>
        <Button size="lg" variant="outline" className="shadow-md gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => toast.info('EXPORTAÇÃO DO FICHEIRO INICIADA')}>
          <Download className="w-5 h-5" /> Exportar Movimentos
        </Button>
        <div className="flex-1" />
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2" onClick={handleOpenFecho} disabled={selectedCondominioId === 'all'}>
          <FileCheck className="w-5 h-5" /> Fecho de Contas
        </Button>
      </div>

      {selectedCondominioId !== 'all' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-600" /><p className="text-sm text-emerald-800 font-medium">Receitas (período)</p></div>
              <p className="text-3xl font-black text-emerald-700">€{totalReceitas.toFixed(2)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-5 border border-red-100 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-600" /><p className="text-sm text-red-800 font-medium">Despesas (período)</p></div>
              <p className="text-3xl font-black text-red-700">€{totalDespesas.toFixed(2)}</p>
            </div>
            <div className={`rounded-xl p-5 border flex flex-col justify-center ${saldoPeriodo >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
              <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-primary" /><p className="text-sm font-medium text-muted-foreground">Variação (período)</p></div>
              <p className={`text-3xl font-black ${saldoPeriodo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>€{saldoPeriodo.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Saldos Atuais (Conta Real)</p>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="w-full sm:w-1/3 flex justify-between items-end border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pr-6">
                <span className="text-sm text-muted-foreground font-medium">Banco</span>
                <span className="text-2xl font-bold text-foreground">€{(condAtual?.saldo_banco || 0).toFixed(2)}</span>
              </div>
              <div className="w-full sm:w-1/3 flex justify-between items-end border-b sm:border-b-0 sm:border-r border-border pb-3 sm:pb-0 sm:pr-6">
                <span className="text-sm text-muted-foreground font-medium">Caixa</span>
                <span className="text-2xl font-bold text-foreground">€{(condAtual?.saldo_caixa || 0).toFixed(2)}</span>
              </div>
              <div className="w-full sm:w-1/3 flex justify-between items-end pt-1 sm:pt-0 sm:pl-2">
                <span className="text-sm text-muted-foreground font-bold">Total Disponível</span>
                <span className="text-3xl font-black text-primary">€{saldoGlobal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-8 bg-muted/30 border border-dashed rounded-xl text-center">
          <p className="text-muted-foreground">Selecione um condomínio na barra superior para visualizar o painel financeiro e os saldos.</p>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col lg:flex-row gap-3 bg-muted/20">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-background w-full" placeholder="Pesquisar movimento..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[120px] bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tipos</SelectItem>
                <SelectItem value="receita">Receitas</SelectItem>
                <SelectItem value="despesa">Despesas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="all">Categorias</SelectItem>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase text-muted-foreground">Despesas</SelectLabel>
                  {categoriasDespesaOrdenadas.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase text-muted-foreground mt-2">Receitas</SelectLabel>
                  {categoriasReceitaOrdenadas.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={filterConta} onValueChange={setFilterConta}>
              <SelectTrigger className="w-[120px] bg-background"><SelectValue placeholder="Conta" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Contas</SelectItem>
                <SelectItem value="banco">Banco</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 bg-background border border-input rounded-md px-2">
              <Input
                type="date"
                className="w-[125px] border-none shadow-none focus-visible:ring-0 px-1"
                value={periodoInicio}
                min={selectedAno !== 'all' ? `${selectedAno}-01-01` : undefined}
                max={selectedAno !== 'all' ? `${selectedAno}-12-31` : undefined}
                onChange={e => setPeriodoInicio(e.target.value)}
              />
              <span className="text-muted-foreground text-xs font-medium">a</span>
              <Input
                type="date"
                className="w-[125px] border-none shadow-none focus-visible:ring-0 px-1"
                value={periodoFim}
                min={selectedAno !== 'all' ? `${selectedAno}-01-01` : undefined}
                max={selectedAno !== 'all' ? `${selectedAno}-12-31` : undefined}
                onChange={e => setPeriodoFim(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Data', 'Tipo', 'Condomínio', 'Categoria', 'Descrição', 'Conta', 'Valor', 'Ações'].map(h => (
                  <th key={h} className={`px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap ${h === 'Ações' ? 'text-center' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">A carregar movimentos...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhum Movimento Encontrado no Período Selecionado</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setOpenPreview(m)}>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{m.data}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold ${m.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {m.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-muted-foreground">{getCondName(m.condominio_id)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{allCategorias[m.categoria] || m.categoria}</td>
                  <td className="px-4 py-3 font-medium">{m.descricao}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-[10px] font-bold tracking-wider bg-accent text-accent-foreground px-2 py-0.5 rounded-full border border-border">{m.conta}</span>
                  </td>
                  <td className={`px-4 py-3 font-bold ${m.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {m.tipo === 'receita' ? '+' : '-'}€{(m.valor || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-center gap-1">
                      {m.tipo !== 'receita' && (
                        <button onClick={() => openEdit(m)} className="p-1.5 hover:bg-muted rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (m.tipo === 'receita') {
                            setOpenEstorno(m);
                          } else {
                            executarEstorno.mutate(m);
                          }
                        }}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP DE PRÉ-VISUALIZAÇÃO DE MOVIMENTO */}
      <Dialog open={!!openPreview} onOpenChange={(v) => !v && setOpenPreview(null)}>
        <DialogContent className="max-w-md rounded-xl p-6 z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" /> Detalhes do Movimento
            </DialogTitle>
          </DialogHeader>
          {openPreview && (
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Condomínio:</span>
                <span className="font-bold text-right">{getCondName(openPreview.condominio_id)}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="font-bold text-right">{openPreview.descricao}</span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Valor:</span>
                <span className={cn("font-bold text-lg", openPreview.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600')}>
                  {openPreview.tipo === 'receita' ? '+' : '-'}€{openPreview.valor?.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Conta Utilizada:</span>
                <span className="capitalize font-bold px-2 py-0.5 bg-accent text-accent-foreground rounded-full text-xs">
                  {openPreview.conta}
                </span>
              </div>
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Método Pagamento:</span>
                <span className="capitalize font-medium text-right">{openPreview.metodo_pagamento?.replace('_', ' ') || 'N/A'}</span>
              </div>

              {openPreview.tipo === 'despesa' && openPreview.fornecedor_id && (
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-muted-foreground">Fornecedor:</span>
                  <span className="font-medium text-right">{pessoas.find(p => p.id === openPreview.fornecedor_id)?.nome || 'Desconhecido'}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-muted-foreground">Data Registo:</span>
                <span className="font-medium text-right">{openPreview.data}</span>
              </div>

              {openPreview.observacoes && (
                <div className="bg-muted/40 p-3 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block mb-1">Observações Adicionais:</span>
                  <p className="text-sm italic">{openPreview.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: ESTORNO AUDITADO DE RECEITAS */}
      <AlertDialog open={!!openEstorno} onOpenChange={(v) => !v && setOpenEstorno(null)}>
        <AlertDialogContent className="z-[250]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Confirmar Anulação / Estorno Financeiro
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Atenção: A eliminação deste movimento de receita irá <strong>reverter os abatimentos na faturação</strong>.
              As quotas correspondentes serão recolocadas automaticamente com o estado "Pendente" ou "Vencida".<br /><br />
              Esta ação limpa o histórico bancário desta receita e reverte os saldos de tesouraria do condomínio associado. Pretende prosseguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => executarEstorno.mutate(openEstorno)}>
              Confirmar Estorno Auditado
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* MODAL NOVA DESPESA */}
      <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><TrendingDown className="w-5 h-5" /> {editing ? 'Editar Despesa' : 'Registar Despesa'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">

            <div className="sm:col-span-2">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioOpen} onOpenChange={setComboCondominioOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioOpen} disabled={selectedCondominioId !== 'all'} className="w-full justify-between font-normal bg-background mt-1">
                    {form.condominio_id ? condominiosAtivos.find(c => c.id === form.condominio_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio por nome ou CXX..." />
                    <CommandEmpty>Condomínio não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { upd('condominio_id', c.id); setComboCondominioOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* SELETOR DE FORNECEDOR */}
            <div className="sm:col-span-2">
              <Label>Fornecedor</Label>
              <Popover open={comboFornecedorOpen} onOpenChange={setComboFornecedorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboFornecedorOpen} className="w-full justify-between font-normal bg-background mt-1">
                    {form.fornecedor_id ? fornecedoresAtivos.find(f => f.id === form.fornecedor_id)?.nome : "Selecione ou pesquise o fornecedor..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar fornecedor por nome..." />
                    <CommandEmpty>Fornecedor Não Encontrado</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      <CommandItem value="" onSelect={() => { upd('fornecedor_id', ''); setComboFornecedorOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", !form.fornecedor_id ? "opacity-100" : "opacity-0")} />
                        Nenhum / Particular
                      </CommandItem>
                      {fornecedoresAtivos.map(f => (
                        <CommandItem key={f.id} value={f.nome} onSelect={() => { upd('fornecedor_id', f.id); setComboFornecedorOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                          {f.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2">
              <Label>Categoria da Despesa *</Label>
              <Select value={form.categoria} onValueChange={v => upd('categoria', v)}>
                <SelectTrigger className="mt-1">
                  {/* ADICIONADO O PLACEHOLDER AQUI */}
                  <SelectValue placeholder="Selecione a categoria..." />
                </SelectTrigger>
                <SelectContent className="max-h-48 z-[210]">
                  {categoriasDespesaOrdenadas.map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Descrição da Despesa *</Label>
              <Input className="mt-1" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} placeholder="Ex: Avença Elevadores..." />
            </div>

            <div>
              <Label>Valor da Despesa (€) *</Label>
              <Input className="mt-1 font-bold text-red-600" type="number" step="0.01" value={form.valor || ''} onChange={e => upd('valor', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Data do Documento *</Label>
              <Input className="mt-1" type="date" value={form.data || ''} onChange={e => upd('data', e.target.value)} />
            </div>

            <div>
              <Label>Conta a Debitar *</Label>
              <Select
                value={form.conta}
                onValueChange={v => {
                  upd('conta', v);
                  // Lógica de bloqueio inteligente:
                  if (v === 'caixa') {
                    upd('metodo_pagamento', 'numerario');
                  } else if (v === 'banco' && form.metodo_pagamento === 'numerario') {
                    upd('metodo_pagamento', 'transferencia'); // Volta ao default do banco
                  }
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select
                value={form.metodo_pagamento || ''}
                onValueChange={v => upd('metodo_pagamento', v)}
                disabled={form.conta === 'caixa'}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {form.conta === 'banco' ? (
                    <>
                      <SelectItem value="transferencia">Transferência Bancária</SelectItem>
                      <SelectItem value="debito_direto">Débito Direto</SelectItem>
                      <SelectItem value="deposito">Depósito</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="numerario">Numerário (Dinheiro)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Observações Adicionais</Label>
              <Input className="mt-1" value={form.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} placeholder="Justificação, detalhes extras..." />
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpenDespesa(false)}>Cancelar</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => save.mutate(form)}
              disabled={save.isPending || !form.condominio_id || !form.valor || !form.descricao}
            >
              {save.isPending ? 'A registar...' : 'Registar Despesa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL FECHO DE CONTAS (DRE) */}
      <Dialog open={openFecho} onOpenChange={setOpenFecho}>
        <DialogContent className="w-[94vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-6 z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700"><Calculator className="w-5 h-5" /> Demonstração de Resultados (Fecho {selectedAno === 'all' ? new Date().getFullYear() : selectedAno})</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            <div className="bg-muted/40 border border-border p-4 rounded-xl flex justify-between items-center">
              <div>
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Saldo Transitado do Ano Anterior</p>
                <p className="text-xs text-muted-foreground">Saldo à data de 31 de dezembro do ano anterior.</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold">€</span>
                <Input
                  type="number"
                  className="w-32 font-bold text-right text-lg bg-background"
                  value={dreData.saldoInicial}
                  onChange={e => setDreData(p => ({ ...p, saldoInicial: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* COLUNA RECEITAS */}
              <div className="space-y-3">
                <div className="bg-emerald-50 border-b-2 border-emerald-500 p-3 rounded-t-xl">
                  <h4 className="font-bold text-emerald-800 uppercase tracking-wider text-sm">Resumo de Receitas</h4>
                </div>
                <div className="space-y-2 border border-border rounded-b-xl p-3 bg-card shadow-sm">
                  {categoriasReceitaOrdenadas.map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        className="w-24 h-7 text-xs text-right font-semibold"
                        value={dreData.receitas[k] || 0}
                        onChange={e => setDreData(p => ({ ...p, receitas: { ...p.receitas, [k]: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                  ))}
                  <div className="pt-3 mt-1 border-t border-border flex justify-between items-center">
                    <span className="text-sm font-black text-emerald-700">Total Receitas</span>
                    <span className="text-lg font-black text-emerald-700">€{Object.values(dreData.receitas).reduce((a, b) => a + b, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* COLUNA DESPESAS */}
              <div className="space-y-3">
                <div className="bg-red-50 border-b-2 border-red-500 p-3 rounded-t-xl">
                  <h4 className="font-bold text-red-800 uppercase tracking-wider text-sm">Resumo de Despesas</h4>
                </div>
                <div className="space-y-2 border border-border rounded-b-xl p-3 bg-card shadow-sm">
                  {categoriasDespesaOrdenadas.map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
                      <Input
                        type="number"
                        className="w-24 h-7 text-xs text-right font-semibold"
                        value={dreData.despesas[k] || 0}
                        onChange={e => setDreData(p => ({ ...p, despesas: { ...p.despesas, [k]: parseFloat(e.target.value) || 0 } }))}
                      />
                    </div>
                  ))}
                  <div className="pt-3 mt-1 border-t border-border flex justify-between items-center">
                    <span className="text-sm font-black text-red-700">Total Despesas</span>
                    <span className="text-lg font-black text-red-700">€{Object.values(dreData.despesas).reduce((a, b) => a + b, 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RESULTADO FINAL */}
            <div className="border-t border-border pt-5 flex flex-col md:flex-row gap-6 items-end justify-between">
              <div className="w-full md:w-1/2">
                <Label>Observações ao Fecho</Label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y"
                  placeholder="Parecer da administração, anomalias reportadas..."
                  value={dreData.observacoes}
                  onChange={e => setDreData(p => ({ ...p, observacoes: e.target.value }))}
                />
              </div>
              <div className="w-full md:w-1/2 bg-blue-50/50 border border-blue-200 p-4 rounded-xl text-right">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">Saldo de Fecho (Transportar)</p>
                <p className="text-4xl font-black text-blue-800">
                  €{(dreData.saldoInicial + Object.values(dreData.receitas).reduce((a, b) => a + b, 0) - Object.values(dreData.despesas).reduce((a, b) => a + b, 0)).toFixed(2)}
                </p>
              </div>
            </div>

          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-border flex justify-between sm:justify-between items-center">
            <p className="text-xs text-muted-foreground hidden sm:block">Este documento servirá de base à aprovação de contas em assembleia.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpenFecho(false)}>Cancelar</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleEmitirFecho}>
                <FileCheck className="w-4 h-4" /> Emitir PDF de Fecho
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}