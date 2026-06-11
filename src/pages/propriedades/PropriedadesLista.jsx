import { useState } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Search, Home, Edit, Trash2, Check, ChevronsUpDown, X, Save, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TIPOS = { apartamento: 'Apartamento', moradia: 'Moradia', loja: 'Loja', escritorio: 'Escritório', garagem: 'Garagem', armazem: 'Armazém', outro: 'Outro' };

// DEFAULT ATUALIZADO: Comissão de 5% por defeito
const empty = { morada: '', codigo_postal: '', localidade: '', tipo: 'apartamento', proprietario_id: [], inquilino_id: [], renda_mensal: 0, comissao_agencia: 5, comissao_percentagem: true, dia_vencimento: 8, ativa: true, notas: '' };

const parseJsonArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try { 
    const parsed = JSON.parse(data); 
    return Array.isArray(parsed) ? parsed : [data]; 
  } catch { 
    return [data]; 
  }
};

export default function PropriedadesLista() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  
  // Modals Data State
  const [previewData, setPreviewData] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showPessoa, setShowPessoa] = useState(null); 
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);

  // Modals Boolean/Open State (Evita o efeito "TV")
  const [open, setOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pessoaOpen, setPessoaOpen] = useState(false);
  
  // Combobox State
  const [comboProprietariosOpen, setComboProprietariosOpen] = useState(false);
  const [comboInquilinosOpen, setComboInquilinosOpen] = useState(false);

  // Queries
  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades'], queryFn: () => agenciaAvenida.entities.Propriedade.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  // Apenas clientes
  const clientes = pessoas.filter(p => {
    try {
      const tipos = Array.isArray(p.tipo) ? p.tipo : JSON.parse(p.tipo || '[]');
      return tipos.includes('cliente');
    } catch {
      return p.tipo === 'cliente' || String(p.tipo).includes('cliente');
    }
  });

  // Mutações
  const save = useMutation({
    mutationFn: (d) => editing ? agenciaAvenida.entities.Propriedade.update(editing, d) : agenciaAvenida.entities.Propriedade.create(d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ['propriedades'] }); 
      setOpen(false); 
      toast.success(editing ? 'PROPRIEDADE ATUALIZADA' : 'PROPRIEDADE CRIADA');
    },
    onError: (e) => toast.error('ERRO: ' + (e?.message || 'DESCONHECIDO').toUpperCase())
  });

  const archive = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Propriedade.update(id, { ativa: false }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['propriedades'] }); toast.success('PROPRIEDADE INATIVADA COM SUCESSO'); },
    onError: (e) => toast.error('ERRO: ' + (e?.message || 'DESCONHECIDO').toUpperCase())
  });

  const saveNotas = useMutation({
    mutationFn: (payload) => agenciaAvenida.entities.Propriedade.update(payload.id, { notas: payload.notas }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['propriedades'] }); toast.success('NOTAS ATUALIZADAS'); },
    onError: () => toast.error('ERRO AO GUARDAR NOTAS')
  });

  // Filtro principal: Ativas (invisível) + Pesquisa textual
  const filtered = propriedades.filter(p => {
    if (p.ativa === false || p.ativa === 'false') return false; 
    if (search && !p.morada?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openEdit = (p) => { 
    setForm({ 
      ...empty, 
      ...p,
      proprietario_id: parseJsonArray(p.proprietario_id),
      inquilino_id: parseJsonArray(p.inquilino_id)
    }); 
    setEditing(p.id); 
    setOpen(true); 
  };
  
  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };

  const pessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || '—';
  const pessoaParaMostrar = pessoas.find(p => p.id === showPessoa);

  // Lógica de Adicionar / Remover em formato "Tags/Chips"
  const addArrayItem = (key, id) => {
    setForm(prev => {
      const arr = prev[key] || [];
      if (arr.includes(id)) return prev;
      return { ...prev, [key]: [...arr, id] };
    });
  };

  const removeArrayItem = (key, id) => {
    setForm(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(item => item !== id)
    }));
  };

  return (
    <div>
      <PageHeader title="Propriedades" subtitle="Gestão de todos os imóveis geridos pela Agência Avenida."
        action={<Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Propriedade</Button>}
      />
      
      <div className="flex gap-3 mb-6 w-full">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar morada..." className="pl-9 w-full bg-background" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const propsArray = parseJsonArray(p.proprietario_id);
          const inqArray = parseJsonArray(p.inquilino_id);

          return (
            <div 
              key={p.id} 
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all cursor-pointer flex flex-col justify-between"
              onClick={() => {
                setPreviewData({...p, proprietario_id: propsArray, inquilino_id: inqArray});
                setPreviewOpen(true);
              }}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-50 rounded-lg"><Home className="w-4 h-4 text-emerald-600" /></div>
                    <div>
                      <p className="font-bold text-foreground leading-tight">{p.morada}</p>
                      <p className="text-xs font-medium text-muted-foreground">{p.codigo_postal} {p.localidade}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => { setDeleteConfirmId(p.id); setDeleteOpen(true); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Tipo</span>
                    <span className="font-semibold text-xs bg-muted px-2 py-0.5 rounded-md border border-border">{TIPOS[p.tipo] || p.tipo}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-dashed pt-2">
                    <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Proprietários</span>
                    <div className="text-right flex flex-col">
                      {propsArray.length === 0 ? <span className="text-muted-foreground italic text-xs">Nenhum</span> : 
                        propsArray.map(id => <span key={id} className="font-medium text-xs">{pessoaNome(id)}</span>)
                      }
                    </div>
                  </div>
                  {inqArray.length > 0 && (
                    <div className="flex justify-between items-center border-t border-dashed pt-2">
                      <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Inquilinos</span>
                      <div className="text-right flex flex-col">
                        {inqArray.map(id => <span key={id} className="font-medium text-xs">{pessoaNome(id)}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-3 mt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-muted-foreground">Renda Mensal</span>
                  <span className="font-black text-emerald-600 text-base">€{(p.renda_mensal || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Comissão</span>
                  <span className="font-bold text-xs">{p.comissao_percentagem ? `${p.comissao_agencia}%` : `€${(p.comissao_agencia || 0).toFixed(2)}`}</span>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground bg-card border border-dashed rounded-xl">
            <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma Propriedade Ativa Encontrada</p>
          </div>
        )}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Home className="w-5 h-5 text-emerald-600" /> Detalhes da Propriedade</DialogTitle>
          </DialogHeader>
          
          {previewData && (
            <div className="space-y-6 mt-2">
              <div className="bg-muted/40 p-4 rounded-xl border border-border">
                <h3 className="font-black text-xl text-foreground">{previewData.morada}</h3>
                <p className="font-medium text-muted-foreground text-sm">{previewData.codigo_postal} {previewData.localidade}</p>
                <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-background border border-border">
                  {TIPOS[previewData.tipo] || previewData.tipo}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Proprietários Locadores</p>
                  <div className="flex flex-col gap-1">
                    {previewData.proprietario_id.length === 0 ? <span className="text-sm italic text-muted-foreground">Nenhum registado</span> : 
                      previewData.proprietario_id.map(id => (
                        <span 
                          key={id} 
                          className="text-sm font-semibold text-primary hover:underline cursor-pointer w-fit"
                          onClick={(e) => { e.stopPropagation(); setShowPessoa(id); setPessoaOpen(true); }}
                        >
                          {pessoaNome(id)}
                        </span>
                      ))
                    }
                  </div>
                </div>
                <div className="border border-border rounded-lg p-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-2">Inquilinos Arrendatários</p>
                  <div className="flex flex-col gap-1">
                    {previewData.inquilino_id.length === 0 ? <span className="text-sm italic text-muted-foreground">Nenhum registado</span> : 
                      previewData.inquilino_id.map(id => (
                        <span 
                          key={id} 
                          className="text-sm font-semibold text-primary hover:underline cursor-pointer w-fit"
                          onClick={(e) => { e.stopPropagation(); setShowPessoa(id); setPessoaOpen(true); }}
                        >
                          {pessoaNome(id)}
                        </span>
                      ))
                    }
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Renda Fixada</p>
                  <p className="text-xl font-black text-emerald-600">€{(previewData.renda_mensal || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Comissão Agência</p>
                  <p className="text-lg font-bold">{previewData.comissao_percentagem ? `${previewData.comissao_agencia}%` : `€${(previewData.comissao_agencia || 0).toFixed(2)}`}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Dia Limite</p>
                  <p className="text-lg font-bold">Dia {previewData.dia_vencimento || 8}</p>
                </div>
              </div>

              <div className="pt-2">
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações Internas</Label>
                  <Button size="sm" variant="secondary" className="h-7 text-xs gap-1.5" onClick={() => saveNotas.mutate({ id: previewData.id, notas: previewData.notas })} disabled={saveNotas.isPending}>
                    {saveNotas.isPending ? 'A gravar...' : <><Save className="w-3 h-3"/> Gravar Notas</>}
                  </Button>
                </div>
                <textarea 
                  className="w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm min-h-[100px] resize-y focus:bg-background focus:ring-1 focus:border-primary transition-colors"
                  value={previewData.notas || ''}
                  onChange={e => setPreviewData({...previewData, notas: e.target.value})}
                  placeholder="Anotações internas sobre esta propriedade, cauções, acordos informais..."
                />
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Home className="w-5 h-5 text-primary" /> {editing ? 'Editar Propriedade' : 'Nova Propriedade'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            
            <div className="sm:col-span-2"><Label>Morada da Propriedade *</Label><Input className="mt-1 bg-background" value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} /></div>
            
            <div><Label>Código Postal</Label><Input className="mt-1 bg-background" value={form.codigo_postal} onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))} /></div>
            <div><Label>Localidade</Label><Input className="mt-1 bg-background" value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} /></div>
            
            <div className="sm:col-span-2"><Label>Tipologia</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="">{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* PROPRIETÁRIOS - ADD / REMOVE LOGIC */}
            <div className="sm:col-span-2 border border-border p-4 rounded-xl bg-muted/20">
              <Label className="font-bold text-primary mb-2 block">Proprietários / Locadores *</Label>
              
              {form.proprietario_id?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.proprietario_id.map(id => (
                    <div key={id} className="flex items-center gap-2 bg-background border border-primary/30 text-primary px-3 py-1.5 rounded-md text-sm shadow-sm">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-semibold">{pessoaNome(id)}</span>
                      <button type="button" onClick={() => removeArrayItem('proprietario_id', id)} className="ml-1 text-muted-foreground hover:text-red-500 transition-colors" title="Remover">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Popover open={comboProprietariosOpen} onOpenChange={setComboProprietariosOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-start bg-background border-dashed text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> Pesquisar e adicionar proprietário...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar cliente por nome..." />
                    <CommandEmpty>Nenhum Cliente Encontrado</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {clientes.filter(p => !form.proprietario_id?.includes(p.id)).map(p => (
                        <CommandItem key={p.id} value={p.nome} onSelect={() => { addArrayItem('proprietario_id', p.id); setComboProprietariosOpen(false); }}>
                          <Plus className="mr-2 h-4 w-4 text-emerald-600" />
                          {p.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-[10px] text-muted-foreground mt-2">O IBAN para transferências será obtido automaticamente da ficha principal de cada proprietário associado.</p>
            </div>

            {/* INQUILINOS - ADD / REMOVE LOGIC */}
            <div className="sm:col-span-2 border border-border p-4 rounded-xl bg-muted/20">
              <Label className="font-bold text-amber-700 mb-2 block">Inquilinos / Arrendatários</Label>
              
              {form.inquilino_id?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.inquilino_id.map(id => (
                    <div key={id} className="flex items-center gap-2 bg-background border border-amber-500/30 text-amber-700 px-3 py-1.5 rounded-md text-sm shadow-sm">
                      <User className="w-3.5 h-3.5" />
                      <span className="font-semibold">{pessoaNome(id)}</span>
                      <button type="button" onClick={() => removeArrayItem('inquilino_id', id)} className="ml-1 text-muted-foreground hover:text-red-500 transition-colors" title="Remover">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Popover open={comboInquilinosOpen} onOpenChange={setComboInquilinosOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-start bg-background border-dashed text-muted-foreground hover:text-foreground hover:border-amber-600/50 transition-colors">
                    <Plus className="mr-2 h-4 w-4" /> Pesquisar e adicionar inquilino...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar cliente por nome..." />
                    <CommandEmpty>Nenhum Cliente Encontrado</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {clientes.filter(p => !form.inquilino_id?.includes(p.id)).map(p => (
                        <CommandItem key={p.id} value={p.nome} onSelect={() => { addArrayItem('inquilino_id', p.id); setComboInquilinosOpen(false); }}>
                          <Plus className="mr-2 h-4 w-4 text-emerald-600" />
                          {p.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* FINANCEIRO */}
            <div className="sm:col-span-2 border-t border-border pt-4 mt-2 mb-2"><Label className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Condições Financeiras</Label></div>

            <div><Label>Renda Mensal (€)</Label><Input type="number" className="mt-1 font-bold text-emerald-600 bg-background" value={form.renda_mensal} onChange={e => setForm(f => ({ ...f, renda_mensal: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Dia de Vencimento</Label><Input type="number" min={1} max={31} className="mt-1 bg-background" value={form.dia_vencimento} onChange={e => setForm(f => ({ ...f, dia_vencimento: parseInt(e.target.value) || 8 }))} /></div>

            <div><Label>Comissão Agência</Label><Input type="number" className="mt-1 bg-background" value={form.comissao_agencia} onChange={e => setForm(f => ({ ...f, comissao_agencia: parseFloat(e.target.value) || 0 }))} /></div>
            <div><Label>Tipo de Comissão</Label>
              <Select value={form.comissao_percentagem ? 'percent' : 'fixo'} onValueChange={v => setForm(f => ({ ...f, comissao_percentagem: v === 'percent' }))}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className=""><SelectItem value="fixo">Valor Fixo Mensal (€)</SelectItem><SelectItem value="percent">Percentagem sobre a Renda (%)</SelectItem></SelectContent>
              </Select>
            </div>

          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.morada || form.proprietario_id?.length === 0}>
              {save.isPending ? 'A guardar...' : 'Gravar Propriedade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL CENTRAL DE DETALHES DA PESSOA (Sobreposto) */}
      <Dialog open={pessoaOpen} onOpenChange={setPessoaOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl">
          {pessoaParaMostrar && (
            <>
              <DialogHeader>
                <DialogTitle>Dados de Contacto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Nome</p>
                  <p className="font-bold text-foreground text-lg">{pessoaParaMostrar.nome}</p>
                </div>
                {pessoaParaMostrar.telefone && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Telefone</p>
                    <p className="text-foreground">{pessoaParaMostrar.telefone}</p>
                  </div>
                )}
                {pessoaParaMostrar.email && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                    <p className="text-foreground">{pessoaParaMostrar.email}</p>
                  </div>
                )}
                {pessoaParaMostrar.nif && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">NIF</p>
                    <p className="text-foreground">{pessoaParaMostrar.nif}</p>
                  </div>
                )}
                {pessoaParaMostrar.iban && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">IBAN</p>
                    <p className="text-foreground">{pessoaParaMostrar.iban}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" /> Confirmar Inativação
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              Tem a certeza que deseja inativar esta propriedade? Ela deixará de aparecer na lista de propriedades ativas, mas o seu histórico e fechos associados serão mantidos no sistema de forma segura para cumprimento do RGPD.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-amber-600 hover:bg-amber-700 text-white" onClick={() => { archive.mutate(deleteConfirmId); setDeleteOpen(false); }}>
              Inativar Propriedade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}