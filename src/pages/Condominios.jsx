import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, Plus, Pencil, Banknote, Landmark, Printer, X, Eye, EyeOff, Check, ChevronsUpDown, Archive, Filter, Zap, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCondominio } from '@/lib/CondominioContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const POTENCIAS = ["1,15 kVA", "2,30 kVA", "3,45 kVA", "4,60 kVA", "5,75 kVA", "6,90 kVA", "10,35 kVA", "13,80 kVA", "17,25 kVA", "20,70 kVA", "27,60 kVA", "34,50 kVA", "41,40 kVA"];

// Blinda a extração de dados
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

const empty = {
  codigo_num: '', nome: '', nif: '', morada: '', codigo_postal: '', localidade: '',
  pessoa_id: '', email: '', iban: '', banco: '',
  saldo_banco: 0, saldo_caixa: 0, dados_acesso_bancario: '',
  ativo: true,
  goldenergy_status: false, goldenergy_id: '', goldenergy_fe: false, goldenergy_dd: false, goldenergy_potencia: ''
};

const emptyClient = { nome: '', nif: '', telefone: '', email: '', tipo: ['condomino'] };

function CondominioPreview({ cond, pessoas, onClose, onEdit }) {
  const [showAcesso, setShowAcesso] = useState(false);
  const [showPessoa, setShowPessoa] = useState(null);

  const pessoaObj = pessoas.find(p => p.id === cond.pessoa_id);
  const bancoObj = pessoas.find(p => p.id === cond.banco);

  useEffect(() => {
    let t; if (showAcesso) t = setTimeout(() => setShowAcesso(false), 10000); return () => clearTimeout(t);
  }, [showAcesso]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
            <h2 className="font-bold text-lg">Detalhe do Condomínio</h2>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground border rounded-md px-2 py-1">
                <Printer className="w-4 h-4" /> Imprimir
              </button>
              <button onClick={() => { onClose(); onEdit(cond); }} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 border border-primary rounded-md px-2 py-1">
                <Pencil className="w-4 h-4" /> Editar
              </button>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5 text-muted-foreground" /></button>
            </div>
          </div>
          <div className="px-6 py-5 space-y-3 print:py-8 max-h-[80vh] overflow-y-auto no-scrollbar">
            
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-primary/10 rounded-xl mt-1"><Building2 className="w-6 h-6 text-primary" /></div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-primary tracking-wider flex items-center gap-2">
                  {cond.codigo}
                  {Boolean(cond.goldenergy_status) && <Zap className="w-3.5 h-3.5 text-yellow-500" title="Contrato Goldenergy Ativo" />}
                </span>
                <h3 className="text-xl font-bold leading-tight mt-0.5">{cond.nome}</h3>
                {cond.nif && <p className="text-sm text-muted-foreground mt-1">NIF: {cond.nif}</p>}
              </div>
            </div>

            {/* NOVA GESTÃO DE ESPAÇO: Títulos por cima e campos longos ocupam 2 colunas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              {[
                { label: 'Contacto Principal', val: pessoaObj?.nome, click: pessoaObj, full: false },
                { label: 'Email', val: cond.email, click: null, full: false },
                { label: 'Morada', val: cond.morada, click: null, full: true },
                { label: 'Código Postal', val: cond.codigo_postal, click: null, full: false },
                { label: 'Localidade', val: cond.localidade, click: null, full: false },
                { label: 'Banco', val: bancoObj?.nome, click: bancoObj, full: false },
                { label: 'IBAN', val: cond.iban, click: null, full: true }
              ].map((item) =>
                item.val ? (
                  <div key={item.label} className={`flex flex-col gap-1 text-sm ${item.full ? 'sm:col-span-2' : ''}`}>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                    {item.click ? (
                      <button 
                        onClick={() => setShowPessoa(item.click)} 
                        className="text-foreground hover:underline text-left break-words font-medium"
                      >
                        {item.val}
                      </button>
                    ) : (
                      <span className={`text-foreground font-medium ${item.label === 'Email' || item.label === 'IBAN' ? 'break-all' : 'break-words'}`}>
                        {item.val}
                      </span>
                    )}
                  </div>
                ) : null
              )}
            </div>

            {Boolean(cond.goldenergy_status) && (
               <div className="border-t pt-4 mt-4">
                  <p className="font-semibold text-muted-foreground mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500"/> Contrato Goldenergy</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-muted/30 p-4 rounded-lg border border-border/50">
                     <div><span className="text-muted-foreground block text-xs mb-0.5">Nº Conta</span> <span className="font-medium break-all">{cond.goldenergy_id || '-'}</span></div>
                     <div><span className="text-muted-foreground block text-xs mb-0.5">Potência</span> <span className="font-medium">{cond.goldenergy_potencia || '-'}</span></div>
                     <div><span className="text-muted-foreground block text-xs mb-0.5">Fatura Elet.</span> <span className="font-medium">{Boolean(cond.goldenergy_fe) ? 'Sim' : 'Não'}</span></div>
                     <div><span className="text-muted-foreground block text-xs mb-0.5">Débito Dir.</span> <span className="font-medium">{Boolean(cond.goldenergy_dd) ? 'Sim' : 'Não'}</span></div>
                  </div>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
              <div className="text-sm">
                <p className="font-medium text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" />Saldo Banco</p>
                <p className="font-bold text-blue-600 text-lg">€{Number(cond.saldo_banco || 0).toFixed(2)}</p>
              </div>
              <div className="text-sm">
                <p className="font-medium text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3" />Saldo Caixa</p>
                <p className="font-bold text-emerald-600 text-lg">€{Number(cond.saldo_caixa || 0).toFixed(2)}</p>
              </div>
            </div>

            {cond.dados_acesso_bancario && (
              <div className="text-sm border-t pt-4 mt-4">
                <p className="font-medium text-muted-foreground mb-2">Dados de Acesso Bancário</p>
                <div className="flex items-center gap-2 bg-muted/30 p-2 rounded border border-border/50">
                  <span className="text-foreground font-mono bg-background px-3 py-2 rounded border w-full text-sm whitespace-pre-wrap flex-1 min-h-[40px] flex items-center">
                    {showAcesso ? cond.dados_acesso_bancario : '••••••••••'}
                  </span>
                  <button onClick={() => setShowAcesso(!showAcesso)} className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors p-2 rounded-md self-start border border-transparent hover:border-border" title="Mostrar por 10s">
                    {showAcesso ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPessoa && (
        <Dialog open onOpenChange={() => setShowPessoa(null)}>
          <DialogContent className="max-w-sm z-[60] no-scrollbar">
            <DialogHeader>
              <DialogTitle>Dados de Contacto</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Nome</p>
                <p className="font-bold text-foreground text-lg">{showPessoa.nome}</p>
              </div>
              {showPessoa.telefone && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Telefone</p>
                  <p className="text-foreground">{showPessoa.telefone}</p>
                </div>
              )}
              {showPessoa.email && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-foreground">{showPessoa.email}</p>
                </div>
              )}
              {showPessoa.nif && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">NIF</p>
                  <p className="text-foreground">{showPessoa.nif}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default function Condominios() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setSelectedCondominioId } = useCondominio();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [inactivateModal, setInactivateModal] = useState(null);

  const [openCombo, setOpenCombo] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState(emptyClient);

  // Search e Filtros Goldenergy
  const [search, setSearch] = useState('');
  const defaultGE = { status: 'all', fe: 'all', dd: 'all', potencia: 'all' };
  const [geFilters, setGeFilters] = useState(defaultGE);
  const [showGeFilters, setShowGeFilters] = useState(false);

  const { data: condominios = [], isLoading: loadCond } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: pessoas = [], isLoading: loadPes } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const bancosList = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('banco'));
  const condominosList = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('condomino'));

  const save = useMutation({
    mutationFn: (data) => {
      const payload = { ...data };
      if (payload.codigo_num) {
        payload.codigo = `C${payload.codigo_num.toString().padStart(2, '0')}`;
      }
      delete payload.codigo_num;
      
      return editing ? agenciaAvenida.entities.Condominio.update(editing, payload) : agenciaAvenida.entities.Condominio.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['condominios'] }); setOpen(false); toast.success('Condomínio guardado'); },
  });

  const inactivate = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Condominio.update(id, { ativo: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['condominios'] });
      setInactivateModal(null);
      setOpen(false); // Fecha o formulário de edição após inativar
      toast.success('Condomínio arquivado e inativado.');
    }
  });

  const saveClient = useMutation({
    mutationFn: (data) => agenciaAvenida.entities.Pessoa.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      setShowNewClient(false);
      f('pessoa_id', created.id);
      toast.success('Pessoa criada e selecionada!');
    },
  });

  const openNew = () => {
    // CORREÇÃO: Não filtramos por ativo/inativo para descobrir o próximo número livre
    const existingNumbers = condominios
      .filter(c => c)
      .map(c => String(c.codigo || ''))
      .filter(c => c.startsWith('C'))
      .map(c => parseInt(c.replace('C', ''), 10))
      .filter(n => !isNaN(n));

    let nextNum = 1;
    if (existingNumbers.length > 0) {
      const max = Math.max(...existingNumbers);
      for (let i = 1; i <= max + 1; i++) {
        if (!existingNumbers.includes(i)) {
          nextNum = i;
          break;
        }
      }
    }

    setForm({ ...empty, codigo_num: nextNum.toString().padStart(2, '0') });
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (c) => {
    let codigo_num = '';
    const codStr = String(c.codigo || '');
    if (codStr.startsWith('C')) {
      codigo_num = codStr.replace('C', '');
    }
    setForm({ ...empty, ...c, codigo_num });
    setEditing(c.id);
    setOpen(true);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Ordenação Segura APENAS DOS ATIVOS para a listagem
  const activeCondominios = condominios.filter(c => c && c.ativo !== false && c.ativo !== 'false');
  const sortedCondominios = [...activeCondominios].sort((a, b) => 
    String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' })
  );

  // Filtros Seguros 
  const filtered = sortedCondominios.filter(c => {
    const searchLower = search.toLowerCase();
    
    const nomeStr = String(c.nome || '').toLowerCase();
    const nifStr = String(c.nif || '').toLowerCase();
    const codigoStr = String(c.codigo || '').toLowerCase();

    const matchSearch = !search || 
      nomeStr.includes(searchLower) || 
      nifStr.includes(searchLower) || 
      codigoStr.includes(searchLower);
    
    const statusVal = c.goldenergy_status === true || c.goldenergy_status === 'true';
    const matchStatus = geFilters.status === 'all' || (geFilters.status === 'yes' ? statusVal : !statusVal);
    
    const feVal = c.goldenergy_fe === true || c.goldenergy_fe === 'true';
    const matchFe = geFilters.fe === 'all' || (geFilters.fe === 'yes' ? feVal : !feVal);
    
    const ddVal = c.goldenergy_dd === true || c.goldenergy_dd === 'true';
    const matchDd = geFilters.dd === 'all' || (geFilters.dd === 'yes' ? ddVal : !ddVal);
    
    const matchPot = geFilters.potencia === 'all' || c.goldenergy_potencia === geFilters.potencia;
    
    return matchSearch && matchStatus && matchFe && matchDd && matchPot;
  });

  return (
    <div>
      <PageHeader title="Condomínios" subtitle="Condomínios geridos pela Agência Avenida" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Condomínio</Button>
      } />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por nome, NIF ou ID..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="secondary" className="gap-2 bg-muted text-muted-foreground" onClick={() => setShowGeFilters(true)}>
          <Filter className="w-4 h-4" /> Filtros Goldenergy
        </Button>

        <Dialog open={showGeFilters} onOpenChange={setShowGeFilters}>
          <DialogContent className="w-[320px] z-[60] no-scrollbar rounded-xl p-5">
             <DialogHeader>
               <DialogTitle className="flex items-center gap-2 text-sm"><Zap className="w-4 h-4 text-yellow-500" /> Filtros Goldenergy</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 mt-2">
               <div className="space-y-1.5">
                 <Label className="text-xs text-muted-foreground">Tem Contrato?</Label>
                 <Select value={geFilters.status} onValueChange={v => setGeFilters({...geFilters, status: v})}>
                   <SelectTrigger><SelectValue/></SelectTrigger>
                   <SelectContent className="z-[100] no-scrollbar">
                     <SelectItem value="all">Todos</SelectItem>
                     <SelectItem value="yes">Sim</SelectItem>
                     <SelectItem value="no">Não</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-1.5">
                 <Label className="text-xs text-muted-foreground">Fatura Eletrónica?</Label>
                 <Select value={geFilters.fe} onValueChange={v => setGeFilters({...geFilters, fe: v})}>
                   <SelectTrigger><SelectValue/></SelectTrigger>
                   <SelectContent className="z-[100] no-scrollbar">
                     <SelectItem value="all">Todos</SelectItem>
                     <SelectItem value="yes">Sim</SelectItem>
                     <SelectItem value="no">Não</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-1.5">
                 <Label className="text-xs text-muted-foreground">Débito Direto?</Label>
                 <Select value={geFilters.dd} onValueChange={v => setGeFilters({...geFilters, dd: v})}>
                   <SelectTrigger><SelectValue/></SelectTrigger>
                   <SelectContent className="z-[100] no-scrollbar">
                     <SelectItem value="all">Todos</SelectItem>
                     <SelectItem value="yes">Sim</SelectItem>
                     <SelectItem value="no">Não</SelectItem>
                   </SelectContent>
                 </Select>
               </div>

               <div className="space-y-1.5">
                 <Label className="text-xs text-muted-foreground">Potência Contratada</Label>
                 <Select value={geFilters.potencia} onValueChange={v => setGeFilters({...geFilters, potencia: v})}>
                   <SelectTrigger><SelectValue/></SelectTrigger>
                   <SelectContent className="z-[100] no-scrollbar">
                     <SelectItem value="all">Todas as Potências</SelectItem>
                     {POTENCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                   </SelectContent>
                 </Select>
               </div>

               <div className="pt-4 mt-2 border-t border-border flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setGeFilters(defaultGE)}>Limpar Filtros</Button>
                  <Button size="sm" onClick={() => setShowGeFilters(false)}>Aplicar</Button>
               </div>
             </div>
          </DialogContent>
        </Dialog>
      </div>

      {(loadCond || loadPes) && <div className="text-center py-16 text-muted-foreground">A carregar condomínios...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map(c => (
          <div
            key={c.id}
            className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => setPreview(c)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl relative">
                  <Building2 className="w-5 h-5 text-primary" />
                  {Boolean(c.goldenergy_status) && <div className="absolute -top-1.5 -right-1.5 bg-background rounded-full p-0.5 shadow-sm"><Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /></div>}
                </div>
                <span className="font-extrabold text-xl text-primary">{c.codigo}</span>
              </div>
              <div className="flex gap-1 items-center" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setSelectedCondominioId(c.id); navigate('/condominios/dashboard'); }} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Abrir dashboard">
                  <Building2 className="w-4 h-4 text-primary" />
                </button>
                <button onClick={() => openEdit(c)} className="p-2 hover:bg-muted rounded-lg transition-colors" title="Editar">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-foreground text-lg leading-tight">{c.nome}</h3>
            <p className="text-sm text-muted-foreground mt-1">{c.morada}</p>
            {c.nif && <p className="text-xs text-muted-foreground mt-1">NIF: {c.nif}</p>}
            
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" />Banco</p>
                <p className="font-semibold text-foreground">€{Number(c.saldo_banco || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3" />Caixa</p>
                <p className="font-semibold text-foreground">€{Number(c.saldo_caixa || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
        {!loadCond && filtered.length === 0 && (
           <div className="col-span-full text-center py-12 text-muted-foreground">Nenhum Condomínio Encontrado</div>
        )}
      </div>

      {preview && <CondominioPreview cond={preview} pessoas={pessoas} onClose={() => setPreview(null)} onEdit={(c) => { setPreview(null); openEdit(c); }} />}

      <Dialog open={!!inactivateModal} onOpenChange={(open) => !open && setInactivateModal(null)}>
        {inactivateModal && (
          <DialogContent className="max-w-md no-scrollbar z-[60]">
             <DialogHeader>
               <DialogTitle className="text-red-500 flex items-center gap-2"><Archive className="w-5 h-5"/> Inativar Condomínio</DialogTitle>
             </DialogHeader>
             <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
               Tem certeza que pretende inativar este condomínio? Ao inativar, este condomínio será arquivado mas os dados não serão eliminados afim de cumprir com o RGPD. Após inativado, apenas poderá ser reativado ou eliminado de forma permanente via acesso direto à base de dados.
             </p>
             <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setInactivateModal(null)}>Cancelar</Button>
                <Button variant="destructive" onClick={() => inactivate.mutate(inactivateModal.id)} disabled={inactivate.isPending}>
                   {inactivate.isPending ? 'A inativar...' : 'Sim, inativar'}
                </Button>
             </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Condomínio' : 'Novo Condomínio'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            
            <div>
              <Label>Código do Condomínio *</Label>
              <div className="flex mt-1 shadow-sm">
                <span className="inline-flex items-center px-4 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm font-bold">
                  C
                </span>
                <Input 
                  className="rounded-l-none" 
                  value={form.codigo_num || ''} 
                  onChange={e => f('codigo_num', e.target.value.replace(/\D/g, ''))} 
                  maxLength={4}
                  placeholder="01"
                />
              </div>
            </div>

            <div>
              <Label>Nome *</Label>
              <Input className="mt-1" value={form.nome || ''} onChange={e => f('nome', e.target.value)} />
            </div>

            <div>
              <Label>NIF</Label>
              <Input className="mt-1" value={form.nif || ''} onChange={e => f('nif', e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Pessoa de Contacto</Label>
              <Popover open={openCombo} onOpenChange={setOpenCombo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openCombo} className="w-full justify-between font-normal bg-background mt-1">
                    {form.pessoa_id ? pessoas.find((p) => p.id === form.pessoa_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar entidade..." />
                    <CommandEmpty>Pessoa não encontrada.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominosList.map((pes) => (
                        <CommandItem key={pes.id} value={`${pes.nome} ${pes.nif || ''}`} onSelect={() => { f('pessoa_id', pes.id); setOpenCombo(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.pessoa_id === pes.id ? "opacity-100" : "opacity-0")} />
                          {pes.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <div className="p-2 border-t border-border">
                      <Button variant="secondary" className="w-full justify-start text-primary font-medium" onClick={() => { setOpenCombo(false); setNewClientForm(emptyClient); setShowNewClient(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Criar Rápido
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-2">
              <Label>Morada</Label>
              <Input className="mt-1" value={form.morada || ''} onChange={e => f('morada', e.target.value)} />
            </div>
            <div>
              <Label>Código Postal</Label>
              <Input className="mt-1" value={form.codigo_postal || ''} onChange={e => f('codigo_postal', e.target.value)} />
            </div>
            <div>
              <Label>Localidade</Label>
              <Input className="mt-1" value={form.localidade || ''} onChange={e => f('localidade', e.target.value)} />
            </div>

            {/* SEÇÃO GOLDENERGY */}
            <div className="sm:col-span-2 border-t border-border mt-2 pt-5 pb-1">
               <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-500" /> Contrato Goldenergy</h4>
                    <p className="text-xs text-muted-foreground mt-1">Ative se este condomínio possui fornecimento elétrico Goldenergy.</p>
                  </div>
                  <Switch checked={Boolean(form.goldenergy_status)} onCheckedChange={v => f('goldenergy_status', v)} />
               </div>
               
               {Boolean(form.goldenergy_status) && (
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-muted/30 p-4 rounded-xl border border-border/60">
                    <div>
                      <Label>Nº Conta Goldenergy</Label>
                      <Input className="mt-1 bg-background" value={form.goldenergy_id || ''} onChange={e => f('goldenergy_id', e.target.value)} />
                    </div>
                    <div>
                      <Label>Potência Contratada</Label>
                      <Select value={form.goldenergy_potencia || ''} onValueChange={v => f('goldenergy_potencia', v)}>
                        <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent className="no-scrollbar">
                          {POTENCIAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2 flex items-center gap-6 mt-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="fe" checked={Boolean(form.goldenergy_fe)} onCheckedChange={v => f('goldenergy_fe', v)} />
                        <label htmlFor="fe" className="text-sm font-medium leading-none cursor-pointer">Fatura Eletrónica</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="dd" checked={Boolean(form.goldenergy_dd)} onCheckedChange={v => f('goldenergy_dd', v)} />
                        <label htmlFor="dd" className="text-sm font-medium leading-none cursor-pointer">Débito Direto</label>
                      </div>
                    </div>
                 </div>
               )}
            </div>
            
            <div className="sm:col-span-2 border-t border-border mt-1 pt-4">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Dados Bancários</h4>
            </div>

            <div>
              <Label>Banco</Label>
              <Select value={form.banco || ''} onValueChange={v => f('banco', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione um banco" /></SelectTrigger>
                <SelectContent>
                  {bancosList.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                  ))}
                  {bancosList.length === 0 && <p className="text-sm p-2 text-muted-foreground text-center">Nenhum banco registado nas Entidades.</p>}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>IBAN</Label>
              <Input className="mt-1" value={form.iban || ''} onChange={e => f('iban', e.target.value)} />
            </div>

            <div>
              <Label>Saldo Banco (€)</Label>
              <Input className="mt-1 bg-muted cursor-not-allowed text-muted-foreground font-semibold" type="number" disabled value={form.saldo_banco || 0} />
            </div>
            <div>
              <Label>Saldo Caixa (€)</Label>
              <Input className="mt-1 bg-muted cursor-not-allowed text-muted-foreground font-semibold" type="number" disabled value={form.saldo_caixa || 0} />
            </div>

            <div className="sm:col-span-2">
              <Label>Dados de Acesso Bancário</Label>
              <p className="text-xs text-muted-foreground mb-1">Preencha os dados de homebanking. Estes dados estarão ocultos na pré-visualização.</p>
              <textarea 
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" 
                placeholder="Ex: N.º Adesão: 123456 | Utilizador: AgenciaAvenida..." 
                value={form.dados_acesso_bancario || ''} 
                onChange={e => f('dados_acesso_bancario', e.target.value)} 
              />
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <div>
              {editing && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                  onClick={() => setInactivateModal(form)}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Inativar Condomínio
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.nome || !form.codigo_num}>
                {save.isPending ? 'A guardar...' : 'Guardar Condomínio'}
              </Button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-sm z-[60] no-scrollbar">
          <DialogHeader>
            <DialogTitle>Nova Entidade Rápida</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <div>
              <Label>Nome *</Label>
              <Input value={newClientForm.nome} onChange={e => setNewClientForm({...newClientForm, nome: e.target.value})} autoFocus />
            </div>
            <div>
              <Label>NIF</Label>
              <Input value={newClientForm.nif} onChange={e => setNewClientForm({...newClientForm, nif: e.target.value})} />
            </div>
            <div>
              <Label>Telemóvel</Label>
              <Input value={newClientForm.telefone} onChange={e => setNewClientForm({...newClientForm, telefone: e.target.value})} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={newClientForm.email} onChange={e => setNewClientForm({...newClientForm, email: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowNewClient(false)}>Cancelar</Button>
            <Button onClick={() => saveClient.mutate(newClientForm)} disabled={saveClient.isPending || !newClientForm.nome}>
              {saveClient.isPending ? 'A criar...' : 'Criar e Selecionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}