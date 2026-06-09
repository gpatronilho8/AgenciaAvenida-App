import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Pencil, Home, Search, X, Printer, Check, ChevronsUpDown, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useCondominio } from '@/lib/CondominioContext';
import { cn } from '@/lib/utils';

// Filtro rigoroso para extrair tipos e normalizar
const normalizeTipo = (tipoData) => {
  if (!tipoData) return [];
  let parsed = Array.isArray(tipoData) ? tipoData : [];
  if (typeof tipoData === 'string') {
    try { parsed = JSON.parse(tipoData); } catch { parsed = tipoData.split(',').map(s => s.trim()); }
  }
  return parsed.map(t => t.toString().trim().toLowerCase());
};

const normalizeArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch(e) { return data.split(',').map(s => s.trim()).filter(Boolean); }
  }
  return [];
};

const empty = {
  condominio_id: '', codigo_fracao: '', descricao_piso_lado: '', permilagem: '',
  titulares: [], quota_mensal: 0
};

const emptyClient = { nome: '', nif: '', telefone: '', email: '', tipo: ['condomino'] };

// Algoritmo que descobre a próxima letra de fração válida em Portugal (exclui K, W, Y)
const getNextLetter = (existingCodes) => {
  const alphabet = "ABCDEFGHIJLMNOPQRSTUVXZ";
  const base = alphabet.length;
  const set = new Set(existingCodes.map(c => c?.trim().toUpperCase()));
  
  let i = 0;
  while (i < 1000) {
    let res = '';
    let n = i;
    while (n >= 0) {
      res = alphabet[n % base] + res;
      n = Math.floor(n / base) - 1;
    }
    if (!set.has(res)) return res;
    i++;
  }
  return '';
};

function FracaoPreview({ fracao, condominios, pessoas, onClose, onShowPessoa }) {
  const cond = condominios.find(c => c.id === fracao.condominio_id);
  const titularesArray = normalizeArray(fracao.titulares);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <h2 className="font-bold text-lg">Ficha de Fração</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-primary hover:underline border border-transparent hover:border-primary/20 px-2 py-1 rounded">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3 print:py-8 max-h-[80vh] overflow-y-auto no-scrollbar">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Home className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground leading-tight">{fracao.codigo_fracao}</h3>
              <p className="text-primary font-medium text-sm mt-0.5">{cond?.nome || 'Condomínio Desconhecido'}</p>
            </div>
          </div>

          {[
            ['Piso / Lado - Descrição', fracao.descricao_piso_lado],
            ['Permilagem', fracao.permilagem ? `${fracao.permilagem}‰` : null],
            ['Quota Mensal', fracao.quota_mensal ? `€${parseFloat(fracao.quota_mensal).toFixed(2)}` : null],
          ].map(([label, val]) => val ? (
            <div key={label} className="flex gap-3 text-sm items-center">
              <span className="w-40 font-medium text-muted-foreground flex-shrink-0">{label}</span>
              <span className="text-foreground">{val}</span>
            </div>
          ) : null)}

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-bold text-foreground">Titulares da Fração</p>
            </div>
            {titularesArray.length > 0 ? (
              <div className="flex flex-col gap-2">
                {titularesArray.map(tId => {
                  const p = pessoas.find(x => x.id === tId);
                  if (!p) return null;
                  return (
                    <button 
                      key={tId} 
                      onClick={() => onShowPessoa(p)}
                      className="text-left text-sm text-primary font-semibold hover:underline bg-primary/5 hover:bg-primary/10 px-3 py-2 rounded-lg transition-colors"
                    >
                      {p.nome}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhum titular associado.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Fracoes() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const { selectedCondominioId } = useCondominio();
  const [search, setSearch] = useState('');
  
  const [preview, setPreview] = useState(null);
  const [showPessoa, setShowPessoa] = useState(null);
  
  const [openCondCombo, setOpenCondCombo] = useState(false);
  const [openTitularCombo, setOpenTitularCombo] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState(emptyClient);

  const { data: fracoes = [], isLoading } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const condominiosAtivos = condominios.filter(c => c.ativo !== false && c.ativo !== 'false');
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  // FILTRO: Apenas entidades que tenham a classe 'condomino'
  const condominosList = pessoas.filter(p => normalizeTipo(p.tipo).includes('condomino'));

  const save = useMutation({
    mutationFn: (data) => editing ? agenciaAvenida.entities.Fracao.update(editing, data) : agenciaAvenida.entities.Fracao.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fracoes'] }); setOpen(false); toast.success('FRAÇÃO GUARDADA COM SUCESSO'); },
  });

  const saveClient = useMutation({
    mutationFn: (data) => agenciaAvenida.entities.Pessoa.create(data),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['pessoas'] });
      setShowNewClient(false);
      setForm(p => ({ ...p, titulares: [...normalizeArray(p.titulares), created.id] }));
      toast.success('TITULAR CRIADO E ASSOCIADO COM SUCESSO');
    },
  });

  const openNew = () => { 
    const cid = selectedCondominioId !== 'all' ? selectedCondominioId : '';
    let suggestedCode = '';
    if (cid) {
       const existing = fracoes.filter(f => f.condominio_id === cid).map(f => f.codigo_fracao);
       suggestedCode = getNextLetter(existing);
    }
    setForm({ ...empty, condominio_id: cid, codigo_fracao: suggestedCode }); 
    setEditing(null); 
    setOpen(true); 
  };
  
  const openEdit = (f) => { setForm({ ...empty, ...f, titulares: normalizeArray(f.titulares) }); setEditing(f.id); setOpen(true); };
  
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const removeTitular = (idToRemove) => {
    setForm(p => ({ ...p, titulares: normalizeArray(p.titulares).filter(id => id !== idToRemove) }));
  };

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const filtered = fracoes.filter(f => {
    const matchSearch = !search || f.codigo_fracao?.toLowerCase().includes(search.toLowerCase()) || f.descricao_piso_lado?.toLowerCase().includes(search.toLowerCase());
    const matchCond = selectedCondominioId === 'all' || f.condominio_id === selectedCondominioId;
    return matchSearch && matchCond;
  });

  const totalPermilagem = filtered.reduce((acc, f) => acc + (parseFloat(f.permilagem) || 0), 0);
  const titularesList = normalizeArray(form.titulares);

  return (
    <div>
      <PageHeader title="Frações" subtitle="Gestão de apartamentos e unidades" action={
        <div className="flex items-center gap-4">
           {selectedCondominioId !== 'all' && (
             <div className="bg-muted/50 px-4 py-2 rounded-lg border border-border">
               <span className="text-xs font-semibold text-muted-foreground uppercase">Total Permilagem: </span>
               <span className="font-bold text-foreground">{totalPermilagem.toFixed(2)}‰</span>
             </div>
           )}
           <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Fração</Button>
        </div>
      } />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por código ou descrição..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Fração', 'Condomínio', 'Piso / Lado', 'Permilagem', 'Titulares', 'Quota', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(f => {
               const fTitulares = normalizeArray(f.titulares);
               return (
                 <tr key={f.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setPreview(f)}>
                   <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                     <div className="flex items-center gap-2">
                       <div className="p-1.5 bg-primary/10 rounded"><Home className="w-3 h-3 text-primary" /></div>
                       <span className="font-bold text-foreground">{f.codigo_fracao}</span>
                     </div>
                   </td>
                   <td className="px-4 py-3 text-muted-foreground">{getCondName(f.condominio_id)}</td>
                   <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]" title={f.descricao_piso_lado}>{f.descricao_piso_lado || '-'}</td>
                   <td className="px-4 py-3 text-muted-foreground">{f.permilagem ? `${f.permilagem}‰` : '-'}</td>
                   <td className="px-4 py-3">
                     <div className="flex flex-wrap gap-x-2 gap-y-1">
                       {fTitulares.length > 0 ? fTitulares.map(tId => {
                         const p = pessoas.find(x => x.id === tId);
                         if (!p) return null;
                         return (
                           <button 
                             key={tId} 
                             onClick={(e) => { e.stopPropagation(); setShowPessoa(p); }} 
                             className="text-primary hover:underline text-xs font-semibold whitespace-nowrap bg-primary/5 px-2 py-0.5 rounded"
                           >
                             {p.nome}
                           </button>
                         )
                       }) : <span className="text-muted-foreground text-xs italic">Sem titulares</span>}
                     </div>
                   </td>
                   <td className="px-4 py-3 font-semibold">€{(f.quota_mensal || 0).toFixed(2)}</td>
                   <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                     <button onClick={() => openEdit(f)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Editar">
                       <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                     </button>
                   </td>
                 </tr>
               )
            })}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhuma Fração Encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {preview && (
        <FracaoPreview 
          fracao={preview} 
          condominios={condominios} 
          pessoas={pessoas} 
          onClose={() => setPreview(null)} 
          onShowPessoa={(p) => setShowPessoa(p)}
        />
      )}

      <Dialog open={showPessoa !== null} onOpenChange={(open) => !open && setShowPessoa(null)}>
        {showPessoa && (
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
        )}
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Fração' : 'Nova Fração'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            
            <div className="sm:col-span-2">
              <Label>Condomínio *</Label>
              <Popover open={openCondCombo} onOpenChange={setOpenCondCombo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openCondCombo} className="w-full justify-between font-normal bg-background mt-1">
                    {form.condominio_id ? condominios.find(c => c.id === form.condominio_id)?.nome : "Pesquise e selecione..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio Não Encontrado</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map((c) => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { 
                          const updates = { condominio_id: c.id };
                          if (!editing) {
                             const existing = fracoes.filter(f => f.condominio_id === c.id).map(f => f.codigo_fracao);
                             updates.codigo_fracao = getNextLetter(existing);
                          }
                          setForm(prev => ({ ...prev, ...updates }));
                          setOpenCondCombo(false); 
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", form.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1 opacity-70">({c.codigo})</span>} {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Letra da Fração *</Label>
              <Input className="mt-1 font-bold text-foreground" value={form.codigo_fracao || ''} onChange={e => upd('codigo_fracao', e.target.value)} />
            </div>

            <div>
              <Label>Piso / Lado - Descrição</Label>
              <Input className="mt-1" placeholder="Ex: 1EQ, RCFT, 3DT, LJA" value={form.descricao_piso_lado || ''} onChange={e => upd('descricao_piso_lado', e.target.value)} />
            </div>

            <div>
              <Label>Permilagem (‰)</Label>
              <Input className="mt-1" type="number" step="0.01" value={form.permilagem || ''} onChange={e => upd('permilagem', parseFloat(e.target.value) || '')} />
            </div>

            <div>
              <Label>Quota Mensal Base (€)</Label>
              <Input className="mt-1 bg-muted cursor-not-allowed font-semibold text-muted-foreground" type="number" value={form.quota_mensal || 0} readOnly disabled title="Definida pelo Mapa de Quotas" />
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">Automático via Quotas</p>
            </div>

            <div className="sm:col-span-2 border-t border-border mt-2 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <Label className="text-base">Titulares da Fração</Label>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Os titulares listados aqui serão automaticamente incluídos na faturação/recibos.</p>
              
              <div className="space-y-2 mb-3">
                {titularesList.map(tId => {
                  const p = pessoas.find(x => x.id === tId);
                  return (
                    <div key={tId} className="flex items-center justify-between p-2.5 border border-border rounded-lg bg-card shadow-sm">
                      <span className="text-sm font-semibold text-foreground">{p?.nome || 'Entidade Desconhecida'}</span>
                      <button type="button" onClick={() => removeTitular(tId)} className="p-1 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Remover titular">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <Popover open={openTitularCombo} onOpenChange={setOpenTitularCombo}>
                <PopoverTrigger asChild>
                  <button type="button" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 transition-all">
                    {titularesList.length > 0 ? '+ Adicionar outro titular' : '+ Adicionar primeiro titular'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-80" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar entidade..." />
                    <CommandEmpty>Titular Não Encontrado</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominosList.filter(p => !titularesList.includes(p.id)).map((pes) => (
                        <CommandItem key={pes.id} value={`${pes.nome} ${pes.nif || ''}`} onSelect={() => { 
                          setForm(prev => ({ ...prev, titulares: [...titularesList, pes.id] }));
                          setOpenTitularCombo(false); 
                        }}>
                          {pes.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <div className="p-2 border-t border-border bg-muted/30">
                      <Button variant="secondary" className="w-full justify-start text-primary font-medium" onClick={() => { setOpenTitularCombo(false); setNewClientForm(emptyClient); setShowNewClient(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Criar Rápido
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

          </div>
          <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.condominio_id || !form.codigo_fracao}>
              {save.isPending ? 'A guardar...' : 'Guardar Fração'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-sm z-[60] no-scrollbar">
          <DialogHeader>
            <DialogTitle>Novo Titular</DialogTitle>
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
              {saveClient.isPending ? 'A criar...' : 'Criar e Adicionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}