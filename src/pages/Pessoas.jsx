import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Search, Trash2, Printer, X, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const empty = { nome: '', tipo: [], nif: '', email: '', telefone: '', morada: '', codigo_postal: '', localidade: '', iban: '', senha_at: '', observacoes: '' };

const tipoLabel = { condomino: 'Condómino', fornecedor: 'Fornecedor', cliente: 'Cliente', advogado: 'Advogado', banco: 'Banco' };
const tipoColor = { condomino: 'bg-blue-100 text-blue-700', fornecedor: 'bg-purple-100 text-purple-700', cliente: 'bg-orange-100 text-orange-700', advogado: 'bg-indigo-100 text-indigo-700', banco: 'bg-emerald-100 text-emerald-700' };

const TIPOS_DISPONIVEIS = [
  { id: 'condomino', label: 'Condómino' },
  { id: 'fornecedor', label: 'Fornecedor' },
  { id: 'cliente', label: 'Cliente' },
  { id: 'advogado', label: 'Advogado' },
  { id: 'banco', label: 'Banco' }
];

const normalizeTipo = (tipoData) => {
  if (!tipoData) return [];
  
  let parsedArray = [];
  
  if (Array.isArray(tipoData)) {
    parsedArray = tipoData;
  } else if (typeof tipoData === 'string') {
    try {
      const parsed = JSON.parse(tipoData);
      if (Array.isArray(parsed)) {
        parsedArray = parsed;
      } else {
        parsedArray = [tipoData];
      }
    } catch (e) {
      if (tipoData.startsWith('{') && tipoData.endsWith('}')) {
        parsedArray = tipoData.slice(1, -1).split(',');
      } else if (tipoData.includes(',')) {
        parsedArray = tipoData.split(',');
      } else {
        parsedArray = [tipoData];
      }
    }
  }

  let finalArray = [];
  parsedArray.forEach(item => {
    if (typeof item === 'string') {
      let clean = item.trim().replace(/^"|"$/g, '');
      
      if (clean.startsWith('[') && clean.endsWith(']')) {
        try {
          const innerParsed = JSON.parse(clean);
          if (Array.isArray(innerParsed)) {
            finalArray.push(...innerParsed);
            return;
          }
        } catch(e) {}
      }
      
      clean = clean.replace(/"/g, '').trim();
      if (clean.includes(',')) {
        finalArray.push(...clean.split(',').map(s => s.trim()));
      } else if (clean) {
        finalArray.push(clean);
      }
    } else if (item) {
      finalArray.push(item);
    }
  });
  
  return [...new Set(finalArray)].filter(Boolean);
};

function PessoaPreview({ pessoa, onClose, onEdit }) {
  const tiposArray = normalizeTipo(pessoa.tipo);
  const isCliente = tiposArray.includes('cliente');
  const [showSenha, setShowSenha] = useState(false);

  useEffect(() => {
    let timer;
    if (showSenha) {
      timer = setTimeout(() => setShowSenha(false), 10000);
    }
    return () => clearTimeout(timer);
  }, [showSenha]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <h2 className="font-bold text-lg">Ficha de Entidade</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground border rounded-md px-2 py-1">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={() => { onClose(); onEdit(pessoa); }} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 border border-primary rounded-md px-2 py-1">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3 print:py-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
              {pessoa.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold line-clamp-1">{pessoa.nome}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {tiposArray.length > 0 ? tiposArray.map(t => (
                  <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[t] || 'bg-gray-100 text-gray-700'}`}>
                    {tipoLabel[t] || t}
                  </span>
                )) : <span className="text-xs text-muted-foreground font-medium bg-gray-100 px-2 py-0.5 rounded-full">Sem tipo</span>}
              </div>
            </div>
          </div>

          {[['NIF', pessoa.nif], ['Email', pessoa.email], ['Telefone', pessoa.telefone], ['Morada', pessoa.morada], ['Código Postal', pessoa.codigo_postal], ['Localidade', pessoa.localidade], ['IBAN', pessoa.iban]].map(([label, val]) =>
            val ? (
              <div key={label} className="flex gap-3 text-sm">
                <span className="w-28 font-medium text-muted-foreground flex-shrink-0">{label}</span>
                <span className="text-foreground break-all">{val}</span>
              </div>
            ) : null
          )}

          {isCliente && pessoa.senha_at && (
             <div className="flex gap-3 text-sm items-center mt-2 bg-muted/30 p-2 rounded border border-border/50">
               <span className="w-28 font-medium text-muted-foreground flex-shrink-0">Senha AT</span>
               <div className="flex items-center gap-2 flex-1">
                 <span className="text-foreground font-mono bg-background px-2 py-1 rounded border min-w-[100px] text-center">
                   {showSenha ? pessoa.senha_at : '••••••••••'}
                 </span>
                 <button onClick={() => setShowSenha(!showSenha)} className="text-muted-foreground hover:text-foreground hover:bg-muted transition-colors p-1.5 rounded-md" title="Mostrar por 10s">
                   {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                 </button>
               </div>
             </div>
          )}

          {pessoa.observacoes && (
            <div className="text-sm border-t pt-3 mt-3">
              <p className="font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-foreground whitespace-pre-wrap">{pessoa.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pessoas() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('all');
  const [preview, setPreview] = useState(null);

  const { data: pessoas = [], isLoading } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? agenciaAvenida.entities.Pessoa.update(editing, data) : agenciaAvenida.entities.Pessoa.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pessoas'] }); setOpen(false); toast.success('Entidade guardada com sucesso!'); },
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Pessoa.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pessoas'] }); toast.success('Entidade eliminada!'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  
  const openEdit = (p) => { setForm({ ...p, tipo: normalizeTipo(p.tipo) }); setEditing(p.id); setOpen(true); };
  
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleTipo = (tipoId) => {
    setForm(prev => {
      const currentTipos = normalizeTipo(prev.tipo);
      if (currentTipos.includes(tipoId)) {
        return { ...prev, tipo: currentTipos.filter(t => t !== tipoId) };
      } else {
        return { ...prev, tipo: [...currentTipos, tipoId] };
      }
    });
  };

  const filtered = pessoas.filter(p => {
    const matchSearch = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()) || p.nif?.includes(search);
    const pTipos = normalizeTipo(p.tipo);
    const matchTipo = filterTipo === 'all' || pTipos.includes(filterTipo);
    return matchSearch && matchTipo;
  });

  const isClienteForm = normalizeTipo(form.tipo).includes('cliente');

  return (
    <div>
      <PageHeader title="Entidades" subtitle="Gestão global de todas as entidades" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Entidade</Button>
      } />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por nome, email ou NIF..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filtrar tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="condomino">Condómino</SelectItem>
            <SelectItem value="fornecedor">Fornecedor</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="advogado">Advogado</SelectItem>
            <SelectItem value="banco">Banco</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const tiposArray = normalizeTipo(p.tipo);
          return (
            <div 
              key={p.id} 
              className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative group flex flex-col h-full"
              onClick={() => setPreview(p)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 text-left w-full">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-sm">{p.nome?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{p.nome}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tiposArray.length > 0 ? tiposArray.map(t => (
                        <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tipoColor[t] || 'bg-gray-100 text-gray-700'}`}>
                          {tipoLabel[t] || t}
                        </span>
                      )) : <span className="text-[10px] text-muted-foreground font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">Sem tipo</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => del.mutate(p.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors" title="Apagar">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-sm mt-auto pt-4 border-t border-border/50">
                {p.email && <p className="text-muted-foreground truncate">{p.email}</p>}
                {p.telefone && <p className="text-muted-foreground">{p.telefone}</p>}
                {p.nif && <p className="text-muted-foreground">NIF: <span className="text-foreground">{p.nif}</span></p>}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground">Nenhuma Entidade Encontrada</div>
        )}
      </div>

      {preview && <PessoaPreview pessoa={preview} onClose={() => setPreview(null)} onEdit={(p) => { setPreview(null); openEdit(p); }} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            
            <div className="sm:col-span-2 bg-muted/30 p-4 rounded-lg border">
              <Label className="text-base font-semibold mb-3 block">Papéis / Tipos de Entidade *</Label>
              <div className="flex flex-wrap gap-4">
                {TIPOS_DISPONIVEIS.map((t) => (
                  <div key={t.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tipo-${t.id}`}
                      checked={normalizeTipo(form.tipo).includes(t.id)}
                      onCheckedChange={() => toggleTipo(t.id)}
                    />
                    <label
                      htmlFor={`tipo-${t.id}`}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {t.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {[['nome', 'Nome *'], ['nif', 'NIF'], ['email', 'Email'], ['telefone', 'Telefone'], ['morada', 'Morada'], ['codigo_postal', 'Código Postal'], ['localidade', 'Localidade'], ['iban', 'IBAN']].map(([k, l]) => (
              <div key={k} className={k === 'morada' || k === 'iban' ? 'sm:col-span-2' : ''}>
                <Label>{l}</Label>
                <Input className="mt-1" value={form[k] || ''} onChange={e => upd(k, e.target.value)} />
              </div>
            ))}

            {/* ADICIONADO: Caixa de texto simples para a Senha AT */}
            {isClienteForm && (
              <div>
                <Label>Senha AT</Label>
                <Input 
                  className="mt-1 font-mono" 
                  value={form.senha_at || ''} 
                  onChange={e => upd('senha_at', e.target.value)} 
                />
              </div>
            )}
            
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