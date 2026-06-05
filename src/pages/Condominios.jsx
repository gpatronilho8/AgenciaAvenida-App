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
import { Building2, Plus, Pencil, Banknote, Landmark, Printer, X, Eye, EyeOff, Check, ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCondominio } from '@/lib/CondominioContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const normalizeTipoPessoa = (tipoData) => {
  if (!tipoData) return [];
  let parsedArray = [];
  if (Array.isArray(tipoData)) parsedArray = tipoData;
  else if (typeof tipoData === 'string') {
    try { const parsed = JSON.parse(tipoData); parsedArray = Array.isArray(parsed) ? parsed : [tipoData]; }
    catch (e) { parsedArray = tipoData.startsWith('{') && tipoData.endsWith('}') ? tipoData.slice(1, -1).split(',') : (tipoData.includes(',') ? tipoData.split(',') : [tipoData]); }
  }
  let finalArray = [];
  parsedArray.forEach(item => {
    if (typeof item === 'string') {
      let clean = item.trim().replace(/^"|"$/g, '');
      if (clean.startsWith('[') && clean.endsWith(']')) { try { const innerParsed = JSON.parse(clean); if (Array.isArray(innerParsed)) { finalArray.push(...innerParsed); return; } } catch (e) { } }
      clean = clean.replace(/"/g, '').trim();
      if (clean.includes(',')) finalArray.push(...clean.split(',').map(s => s.trim()));
      else if (clean) finalArray.push(clean);
    } else if (item) finalArray.push(item);
  });
  return [...new Set(finalArray)].filter(Boolean);
};

const empty = {
  codigo_num: '', nome: '', nif: '', morada: '', codigo_postal: '', localidade: '',
  pessoa_id: '', email: '', iban: '', banco: '',
  saldo_banco: 0, saldo_caixa: 0, dados_acesso_bancario: ''
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
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
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
          <div className="px-6 py-5 space-y-3 print:py-8 max-h-[80vh] overflow-y-auto">
            
            <div className="flex items-start gap-4 mb-5">
              <div className="p-3 bg-primary/10 rounded-xl mt-1"><Building2 className="w-6 h-6 text-primary" /></div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-primary tracking-wider">{cond.codigo}</span>
                <h3 className="text-xl font-bold leading-tight mt-0.5">{cond.nome}</h3>
                {cond.nif && <p className="text-sm text-muted-foreground mt-1">NIF: {cond.nif}</p>}
              </div>
            </div>

            {[
              ['Contacto Principal', pessoaObj?.nome, pessoaObj], 
              ['Email', cond.email], 
              ['Morada', cond.morada], 
              ['Código Postal', cond.codigo_postal], 
              ['Localidade', cond.localidade], 
              ['Banco', bancoObj?.nome, bancoObj], 
              ['IBAN', cond.iban]
            ].map(([label, displayVal, clickObj]) =>
              displayVal ? (
                <div key={label} className="flex gap-3 text-sm items-center">
                  <span className="w-32 font-medium text-muted-foreground flex-shrink-0">{label}</span>
                  {clickObj ? (
                    <button 
                      onClick={() => setShowPessoa(clickObj)} 
                      className="text-foreground hover:underline text-left break-words"
                    >
                      {displayVal}
                    </button>
                  ) : (
                    <span className="text-foreground break-words">{displayVal}</span>
                  )}
                </div>
              ) : null
            )}

            <div className="grid grid-cols-2 gap-4 border-t pt-3 mt-3">
              <div className="text-sm">
                <p className="font-medium text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" />Saldo Banco</p>
                <p className="font-bold text-blue-600">€{(cond.saldo_banco || 0).toFixed(2)}</p>
              </div>
              <div className="text-sm">
                <p className="font-medium text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3" />Saldo Caixa</p>
                <p className="font-bold text-emerald-600">€{(cond.saldo_caixa || 0).toFixed(2)}</p>
              </div>
            </div>

            {cond.dados_acesso_bancario && (
              <div className="text-sm border-t pt-3 mt-3">
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
          <DialogContent className="max-w-sm z-[60]">
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

  const [openCombo, setOpenCombo] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState(emptyClient);

  const { data: condominios = [], isLoading: loadCond } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: pessoas = [], isLoading: loadPes } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const bancosList = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('banco'));

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
    const existingNumbers = condominios
      .map(c => c.codigo)
      .filter(c => c && c.startsWith('C'))
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
    if (c.codigo && c.codigo.startsWith('C')) {
      codigo_num = c.codigo.replace('C', '');
    }
    setForm({ ...c, codigo_num });
    setEditing(c.id);
    setOpen(true);
  };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader title="Condomínios" subtitle="Condomínios geridos pela Agência Avenida" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Condomínio</Button>
      } />

      {(loadCond || loadPes) && <div className="text-center py-16 text-muted-foreground">A carregar condomínios...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {condominios.map(c => (
          <div
            key={c.id}
            className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => setPreview(c)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <span className="font-extrabold text-xl text-primary">{c.codigo}</span>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
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
                <p className="font-semibold text-foreground">€{(c.saldo_banco || 0).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="w-3 h-3" />Caixa</p>
                <p className="font-semibold text-foreground">€{(c.saldo_caixa || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}
        {!loadCond && condominios.length === 0 && (
           <div className="col-span-full text-center py-12 text-muted-foreground">Nenhum Condomínio Registado</div>
        )}
      </div>

      {preview && <CondominioPreview cond={preview} pessoas={pessoas} onClose={() => setPreview(null)} onEdit={(c) => { setPreview(null); openEdit(c); }} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {pessoas.map((pes) => (
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
            
            <div className="sm:col-span-2 border-t mt-2 pt-4">
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
                  {bancosList.length === 0 && <p className="text-sm p-2 text-muted-foreground text-center">Nenhum Banco Registado</p>}
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
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.nome || !form.codigo_num}>
              {save.isPending ? 'A guardar...' : 'Guardar Condomínio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-sm z-[60]">
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