import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { useCondominio } from '@/lib/CondominioContext';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Plus, Search, Check, ChevronsUpDown, Mail, Download, Trash2, Banknote, FileText, Zap, AlertCircle, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MapaQuotas from '@/components/quotas/MapaQuotas';

// Helpers
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

const getOwners = (f) => {
  if (!f) return [];
  if (Array.isArray(f.titulares)) return f.titulares;
  if (typeof f.titulares === 'string') {
    try { return JSON.parse(f.titulares); } catch (e) { return [f.titulares]; }
  }
  if (f.pessoa_id) return [f.pessoa_id];
  if (f.proprietario_id) return [f.proprietario_id];
  return [];
};

const emptyConfig = { condominio_id: '', tipo: 'mensal', valor_mensal: 0, valor_total: 0, mes_inicio: new Date().getMonth() + 1, ano_inicio: new Date().getFullYear() };
const emptyQuota = { condominio_id: '', fracao_id: '', tipo: 'mensal', descricao: '', valor: 0, mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };

export default function Quotas() {
  const qc = useQueryClient();
  const { selectedCondominioId } = useCondominio();
  
  const [search, setSearch] = useState('');
  const [openConfig, setOpenConfig] = useState(false);
  const [openNova, setOpenNova] = useState(false);
  const [openPagamento, setOpenPagamento] = useState(false);
  const [openRecibo, setOpenRecibo] = useState(null);
  const [openDelete, setOpenDelete] = useState(null);
  
  const [configForm, setConfigForm] = useState(emptyConfig);
  const [quotaForm, setQuotaForm] = useState(emptyQuota);
  const [comboCondominioOpen, setComboCondominioOpen] = useState(false);
  const [comboCondominioNovaOpen, setComboCondominioNovaOpen] = useState(false);
  const [comboCondominoOpen, setComboCondominoOpen] = useState(false);

  // Estados Locais para a Interface Visual de Pagamentos
  const [pagamentoFiltro, setPagamentoFiltro] = useState('fracao'); 
  const [pagamentoAlvoId, setPagamentoAlvoId] = useState('');
  const [tipoLiquidacao, setTipoLiquidacao] = useState('total'); // 'total', 'parcial'
  const [quotasSelecionadas, setQuotasSelecionadas] = useState([]);

  // Queries
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });
  const { data: quotas = [], isLoading } = useQuery({ queryKey: ['quotas'], queryFn: () => agenciaAvenida.entities.Quota.list() });

  // Condomínios Ativos e Ordenados
  const condominiosAtivos = condominios
    .filter(c => c && c.ativo !== false && c.ativo !== 'false')
    .sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const fracoesCondominio = fracoes.filter(f => f.condominio_id === quotaForm.condominio_id);
  const fracoesDoCondominioAtual = fracoes.filter(f => selectedCondominioId === 'all' || f.condominio_id === selectedCondominioId);
  const condominosAtivos = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('condomino'));

  // Mutations
  const deleteQuota = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Quota.delete(id),
    onSuccess: () => { qc.invalidateQueries(['quotas']); setOpenDelete(null); toast.success('Quota eliminada.'); }
  });

  const handleGerarQuotasMes = () => {
    toast.success('Processo de geração automática de quotas para o mês corrente iniciado!');
  };

  // Filtros da Tabela Principal
  const quotasFiltradas = quotas.filter(q => {
    if (selectedCondominioId !== 'all' && q.condominio_id !== selectedCondominioId) return false;
    const fracao = fracoes.find(f => f.id === q.fracao_id);
    const termo = search.toLowerCase();
    const matchFracao = fracao?.codigo_fracao?.toLowerCase().includes(termo) || fracao?.descricao_piso_lado?.toLowerCase().includes(termo);
    const matchDesc = q.descricao?.toLowerCase().includes(termo);
    return !search || matchFracao || matchDesc;
  });

  const updConfig = (k, v) => setConfigForm(p => ({ ...p, [k]: v }));
  const updQuota = (k, v) => setQuotaForm(p => ({ ...p, [k]: v }));

  const handleOpenConfig = () => {
    setConfigForm({ ...emptyConfig, condominio_id: selectedCondominioId !== 'all' ? selectedCondominioId : '' });
    setOpenConfig(true);
  };

  const handleOpenNova = () => {
    setQuotaForm({ ...emptyQuota, condominio_id: selectedCondominioId !== 'all' ? selectedCondominioId : '' });
    setOpenNova(true);
  };

  // ---------------- LÓGICA DE PAGAMENTOS ----------------
  const handleClosePagamento = () => {
    setOpenPagamento(false);
    setPagamentoFiltro('fracao');
    setPagamentoAlvoId('');
    setQuotasSelecionadas([]);
    setTipoLiquidacao('total');
  };

  let pendentesReais = [];
  let numTitulares = 1;

  if (pagamentoAlvoId) {
    if (pagamentoFiltro === 'fracao') {
      pendentesReais = quotas.filter(q => q.estado === 'pendente' && q.fracao_id === pagamentoAlvoId);
      const fracaoSel = fracoes.find(f => f.id === pagamentoAlvoId);
      const owners = getOwners(fracaoSel);
      numTitulares = owners.length > 0 ? owners.length : 1;
    } else {
      const fracoesDaPessoa = fracoes.filter(f => getOwners(f).includes(pagamentoAlvoId)).map(f => f.id);
      pendentesReais = quotas.filter(q => q.estado === 'pendente' && fracoesDaPessoa.includes(q.fracao_id));
      numTitulares = 1; // Pagamento pelo condómino assume sempre a responsabilidade integral da sua parte
    }
  }

  const toggleSelectQuota = (id) => {
    setQuotasSelecionadas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  };

  const divisor = (tipoLiquidacao === 'parcial' && numTitulares > 1) ? numTitulares : 1;
  const totalSelecionado = pendentesReais
    .filter(q => quotasSelecionadas.includes(q.id))
    .reduce((acc, curr) => acc + (curr.valor / divisor), 0);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Quotas e Faturação" 
        subtitle="Gestão de quotas mensais, extraordinárias e processamento de pagamentos."
        action={
          <div className="flex gap-2">
            <Button variant="default" className="gap-2" onClick={() => setOpenPagamento(true)}>
              <Banknote className="w-4 h-4" /> Efetuar Pagamento
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleOpenNova}>
              <Plus className="w-4 h-4" /> Nova Quota
            </Button>
            <Button variant="secondary" className="gap-2 bg-muted text-muted-foreground" onClick={handleOpenConfig}>
              <Settings className="w-4 h-4" /> Configurar Quotas
            </Button>
          </div>
        } 
      />

      {/* LISTAGEM GERAL DE QUOTAS */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-full" placeholder="Pesquisar por fração ou descrição..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Fração</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">A carregar quotas...</td></tr>
              ) : quotasFiltradas.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">Nenhuma quota encontrada.</td></tr>
              ) : (
                quotasFiltradas.map(q => {
                  const fracao = fracoes.find(f => f.id === q.fracao_id);
                  const descFinal = q.tipo === 'mensal' ? 'Quota + FCR' : q.descricao;
                  
                  return (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-primary">{fracao?.codigo_fracao || '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{descFinal}</td>
                      <td className="px-4 py-3 text-muted-foreground">{q.data_vencimento || '-'}</td>
                      <td className="px-4 py-3 font-bold text-foreground">€{(q.valor || 0).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          q.estado === 'pago' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {q.estado === 'pago' ? 'Pago' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50" onClick={() => setOpenRecibo(q)} title="Emitir Recibo">
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => setOpenDelete(q)} title="Eliminar">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AVISOS E MAPA ANUAL (Por baixo da listagem) */}
      {selectedCondominioId === 'all' ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground">Mapa Anual Indisponível</h3>
          <p className="text-sm text-muted-foreground mt-1">Selecione um condomínio específico na barra superior para visualizar o mapa anual de quotas e os saldos por fração.</p>
        </div>
      ) : fracoesDoCondominioAtual.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground">Sem Frações</h3>
          <p className="text-sm text-muted-foreground mt-1">Este condomínio não tem frações. Adicione frações para visualizar o mapa.</p>
        </div>
      ) : quotas.filter(q => q.condominio_id === selectedCondominioId).length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground">Sem Quotas</h3>
          <p className="text-sm text-muted-foreground mt-1">Não existem quotas lançadas para este condomínio.</p>
        </div>
      ) : (
        <MapaQuotas condominioId={selectedCondominioId} fracoes={fracoes} quotas={quotas} />
      )}

      {/* MODAL DE CONFIGURAÇÃO DE QUOTAS */}
      <Dialog open={openConfig} onOpenChange={setOpenConfig}>
        <DialogContent className="w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5">
          <DialogHeader>
            <DialogTitle>Configuração de Quotas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            
            <div className="flex flex-col gap-1.5">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioOpen} onOpenChange={setComboCondominioOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioOpen} className="w-full justify-between font-normal bg-background mt-1">
                    {configForm.condominio_id ? condominiosAtivos.find(c => c.id === configForm.condominio_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[100]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { updConfig('condominio_id', c.id); setComboCondominioOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", configForm.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Tipo de Configuração</Label>
              <Select value={configForm.tipo} onValueChange={v => updConfig('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="mensal">Mensal (Valor Fixo)</SelectItem>
                  <SelectItem value="permilagem">Por Permilagem (Orçamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {configForm.tipo === 'mensal' ? (
               <div className="space-y-4 border-t pt-3 mt-1">
                 <div>
                   <Label>Valor da Quota Mensal (Quota + FCR incluído) (€)</Label>
                   <Input className="mt-1" type="number" value={configForm.valor_mensal || ''} onChange={e => updConfig('valor_mensal', e.target.value)} placeholder="0.00" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês de Início</Label>
                    <Select value={String(configForm.mes_inicio)} onValueChange={v => updConfig('mes_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                      <SelectContent className="z-[100] no-scrollbar max-h-36">
                        {Array.from({length:12}).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano de Início</Label>
                    <Select value={String(configForm.ano_inicio)} onValueChange={v => updConfig('ano_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                 </div>
               </div>
            ) : (
              <div className="space-y-4 border-t pt-3 mt-1">
                <div>
                   <Label>Valor Total do Orçamento Anual (€)</Label>
                   <Input className="mt-1" type="number" value={configForm.valor_total || ''} onChange={e => updConfig('valor_total', e.target.value)} placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês de Início</Label>
                    <Select value={String(configForm.mes_inicio)} onValueChange={v => updConfig('mes_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                      <SelectContent className="z-[100] no-scrollbar max-h-36">
                        {Array.from({length:12}).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano de Início</Label>
                    <Select value={String(configForm.ano_inicio)} onValueChange={v => updConfig('ano_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button type="button" variant="secondary" className="w-full gap-2 border border-primary/20 text-primary hover:bg-primary/5" onClick={handleGerarQuotasMes}>
                <Zap className="w-4 h-4 fill-primary" /> Gerar Quotas do Mês Corrente
              </Button>
            </div>

          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border gap-2 sm:gap-0">
             <Button variant="outline" onClick={() => setOpenConfig(false)}>Cancelar</Button>
             <Button onClick={() => setOpenConfig(false)}>Guardar Configuração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA QUOTA / LINHA MANUAL */}
      <Dialog open={openNova} onOpenChange={setOpenNova}>
        <DialogContent className="w-[92vw] sm:max-w-md max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5">
          <DialogHeader>
            <DialogTitle>Lançar Linha Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            
            <div className="flex flex-col gap-1.5">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioNovaOpen} onOpenChange={setComboCondominioNovaOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioNovaOpen} className="w-full justify-between font-normal bg-background mt-1">
                    {quotaForm.condominio_id ? condominiosAtivos.find(c => c.id === quotaForm.condominio_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[100]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { updQuota('condominio_id', c.id); updQuota('fracao_id', ''); setComboCondominioNovaOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", quotaForm.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Fração *</Label>
              <Select disabled={!quotaForm.condominio_id || fracoesCondominio.length === 0} value={quotaForm.fracao_id} onValueChange={v => updQuota('fracao_id', v)}>
                <SelectTrigger className="mt-1">
                   <SelectValue placeholder={!quotaForm.condominio_id ? "Selecione o condomínio" : (fracoesCondominio.length === 0 ? "Não Existem Frações" : "Selecione a fração")} />
                </SelectTrigger>
                <SelectContent className="z-[100] no-scrollbar max-h-40">
                  {fracoesCondominio.map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.codigo_fracao} - {f.descricao_piso_lado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={quotaForm.tipo} onValueChange={v => updQuota('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="linha_faturacao">Linha de Faturação (Taxas / Coimas)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed bg-muted/40 p-2 rounded border border-border/40">As quotas extraordinárias devem ser configuradas no menu de configuração de quotas.</p>
            </div>

            {quotaForm.tipo === 'linha_faturacao' ? (
              <div>
                <Label>Descrição da Taxa/Coima</Label>
                <Input className="mt-1" value={quotaForm.descricao} onChange={e => updQuota('descricao', e.target.value)} placeholder="Ex: Multa por atraso..." />
              </div>
            ) : (
              <div>
                <Label>Descrição da Quota</Label>
                <Input className="mt-1 bg-muted text-muted-foreground font-medium" disabled value="Quota + FCR" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Valor da Linha (€) *</Label>
                <Input className="mt-1" type="number" value={quotaForm.valor || ''} onChange={e => updQuota('valor', parseFloat(e.target.value))} placeholder="0.00" />
              </div>
              <div>
                 <Label>Mês Referência</Label>
                 <Select value={String(quotaForm.mes)} onValueChange={v => updQuota('mes', parseInt(v))}>
                   <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                   <SelectContent className="z-[100] no-scrollbar max-h-36">
                     {Array.from({length:12}).map((_, i) => <SelectItem key={i+1} value={String(i+1)}>{i+1}</SelectItem>)}
                   </SelectContent>
                 </Select>
              </div>
              <div>
                 <Label>Ano Referência</Label>
                 <Select value={String(quotaForm.ano)} onValueChange={v => updQuota('ano', parseInt(v))}>
                   <SelectTrigger className="mt-1"><SelectValue/></SelectTrigger>
                   <SelectContent className="z-[100]">
                     {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                   </SelectContent>
                 </Select>
              </div>
            </div>

          </div>
          <DialogFooter className="mt-5 pt-4 border-t border-border gap-2 sm:gap-0">
             <Button variant="outline" onClick={() => setOpenNova(false)}>Cancelar</Button>
             <Button disabled={!quotaForm.condominio_id || !quotaForm.fracao_id || !quotaForm.valor} onClick={() => setOpenNova(false)}>Lançar Linha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EFETUAR PAGAMENTO */}
      <Dialog open={openPagamento} onOpenChange={(val) => { if(!val) handleClosePagamento(); else setOpenPagamento(true); }}>
        <DialogContent className="w-[94vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-600" /> Registar Liquidação & Emissão de Recibo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtrar Alvo por</Label>
                <Select value={pagamentoFiltro} onValueChange={v => { setPagamentoFiltro(v); setPagamentoAlvoId(''); setQuotasSelecionadas([]); setTipoLiquidacao('total'); }}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    <SelectItem value="fracao">Fração Física</SelectItem>
                    <SelectItem value="condomino">Condómino (Pessoa)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Item Correspondente</Label>
                {pagamentoFiltro === 'fracao' ? (
                  <Select value={pagamentoAlvoId} onValueChange={setPagamentoAlvoId}>
                    <SelectTrigger className="mt-1 bg-background">
                      <SelectValue placeholder={fracoesDoCondominioAtual.length === 0 ? "Sem frações disponíveis" : "Escolha a fração..."} />
                    </SelectTrigger>
                    <SelectContent className="z-[100] no-scrollbar max-h-40">
                      {fracoesDoCondominioAtual.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.codigo_fracao} ({f.descricao_piso_lado})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Popover open={comboCondominoOpen} onOpenChange={setComboCondominoOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between mt-1 bg-background">
                        {pagamentoAlvoId ? pessoas.find(p => p.id === pagamentoAlvoId)?.nome : "Pesquisar condómino..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 z-[100]">
                      <Command>
                        <CommandInput placeholder="Pesquisar pelo nome..." />
                        <CommandEmpty>Nenhum condómino encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                          {condominosAtivos.map(p => (
                            <CommandItem key={p.id} value={p.nome} onSelect={() => { setPagamentoAlvoId(p.id); setComboCondominoOpen(false); setQuotasSelecionadas([]); setTipoLiquidacao('total'); }}>
                              <Check className={cn("mr-2 h-4 w-4", pagamentoAlvoId === p.id ? "opacity-100" : "opacity-0")} />
                              {p.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {pagamentoAlvoId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Quotas Pendentes Detetadas
                  </h4>
                  <span className="text-xs font-semibold text-primary">Apenas Pendentes</span>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-background">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel.</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Data Ref.</th>
                        <th className="p-3 text-right">Valor Original</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendentesReais.map(q => (
                        <tr key={q.id} className={cn("hover:bg-muted/10 transition-colors cursor-pointer", quotasSelecionadas.includes(q.id) && "bg-primary/5")} onClick={() => toggleSelectQuota(q.id)}>
                          <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                            <Checkbox checked={quotasSelecionadas.includes(q.id)} onCheckedChange={() => toggleSelectQuota(q.id)} />
                          </td>
                          <td className="p-3 font-medium">{q.descricao || (q.tipo === 'mensal' ? 'Quota + FCR' : 'Quota')}</td>
                          <td className="p-3 text-muted-foreground text-xs">{String(q.mes).padStart(2,'0')}/{q.ano}</td>
                          <td className="p-3 text-right font-bold">€{(q.valor||0).toFixed(2)}</td>
                        </tr>
                      ))}
                      {pendentesReais.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-6 text-muted-foreground">O alvo selecionado não possui quotas pendentes.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {numTitulares > 1 && pagamentoFiltro === 'fracao' && pendentesReais.length > 0 && (
                  <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-100 space-y-3">
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-emerald-800">A fração tem {numTitulares} titulares. Definir Proporção:</Label>
                      <Select value={tipoLiquidacao} onValueChange={setTipoLiquidacao}>
                        <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                        <SelectContent className="z-[100]">
                          <SelectItem value="total">Liquidar Quota na Totalidade (1/1)</SelectItem>
                          <SelectItem value="parcial">Pagamento Parcial (Apenas a sua quota-parte: 1/{numTitulares})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[11px] text-emerald-700/80 leading-tight">
                      Caso selecione o pagamento parcial, o sistema atualizará a quota dividindo-a e deixará a parte dos restantes titulares ainda em aberto.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 border border-dashed rounded-xl text-center text-sm text-muted-foreground bg-muted/10">
                Selecione uma Fração Física ou Condómino acima para mapear e carregar as contas correntes em atraso.
              </div>
            )}

            <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-xs text-muted-foreground font-medium block">A Pagar (Valor Final)</span>
                <span className="text-2xl font-black text-emerald-600">€{totalSelecionado.toFixed(2)}</span>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleClosePagamento}>Cancelar</Button>
                <Button disabled={true} className="flex-1 sm:flex-none gap-2 bg-muted-foreground text-white cursor-not-allowed">
                  Em desenvolvimento (Aguarda Módulo Movimentos)
                </Button>
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* POPUP RECIBO DE QUOTA ISOLADA */}
      <Dialog open={!!openRecibo} onOpenChange={(open) => !open && setOpenRecibo(null)}>
        <DialogContent className="w-[92vw] sm:max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5">
          <DialogHeader { ... (openRecibo ? { title: "Emitir Recibo" } : {}) }>
            <DialogTitle>Emitir Recibo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
             <p className="text-sm text-muted-foreground leading-relaxed">Como pretende disponibilizar o recibo unificado referente a esta quota?</p>
             <div>
               <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviar por Correio Eletrónico</Label>
               <div className="flex gap-2 mt-1">
                 <Input defaultValue="condomino@email.com" placeholder="Email do condómino..." />
                 <Button variant="secondary" size="icon" onClick={() => { setOpenRecibo(null); toast.success('Recibo enviado por e-mail com sucesso!'); }}><Mail className="w-4 h-4"/></Button>
               </div>
             </div>
             <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink-0 mx-3 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">OU</span>
                <div className="flex-grow border-t border-border"></div>
             </div>
             <Button variant="outline" className="w-full gap-2 text-foreground" onClick={() => { setOpenRecibo(null); toast.success('Download do PDF iniciado.'); }}><Download className="w-4 h-4" /> Descarregar Documento PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!openDelete} onOpenChange={(open) => !open && setOpenDelete(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Registro de Faturação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que pretende eliminar esta linha de faturação? Esta ação é completamente irreversível e irá limpar o histórico em aberto da conta corrente do condómino afetado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 border-red-500" onClick={() => deleteQuota.mutate(openDelete.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}