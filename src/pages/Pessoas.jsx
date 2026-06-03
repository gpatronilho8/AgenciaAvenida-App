import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Search, Trash2, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

const empty = { nome: '', tipo: 'condomino', nif: '', email: '', telefone: '', morada: '', codigo_postal: '', localidade: '', iban: '', senha_at: '', observacoes: '' };

const tipoLabel = { condomino: 'Condómino', fornecedor: 'Fornecedor', cliente: 'Cliente', advogado: 'Advogado' };
const tipoColor = { condomino: 'bg-blue-100 text-blue-700', fornecedor: 'bg-purple-100 text-purple-700', cliente: 'bg-orange-100 text-orange-700', advogado: 'bg-indigo-100 text-indigo-700' };

function PessoaPreview({ pessoa, onClose, onEdit }) {
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
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
              {pessoa.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold">{pessoa.nome}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[pessoa.tipo]}`}>{tipoLabel[pessoa.tipo]}</span>
            </div>
          </div>
          {[['NIF', pessoa.nif], ['Email', pessoa.email], ['Telefone', pessoa.telefone], ['Morada', pessoa.morada], ['Código Postal', pessoa.codigo_postal], ['Localidade', pessoa.localidade], ['IBAN', pessoa.iban], ['Senha AT', pessoa.senha_at]].map(([label, val]) =>
            val ? (
              <div key={label} className="flex gap-3 text-sm">
                <span className="w-28 font-medium text-muted-foreground flex-shrink-0">{label}</span>
                <span className="text-foreground">{val}</span>
              </div>
            ) : null
          )}
          {pessoa.observacoes && (
            <div className="text-sm border-t pt-3 mt-3">
              <p className="font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-foreground">{pessoa.observacoes}</p>
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pessoas'] }); setOpen(false); toast.success('Entidade guardada'); },
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Pessoa.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pessoas'] }); toast.success('Entidade eliminada'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (p) => { setForm(p); setEditing(p.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const filtered = pessoas.filter(p => {
    const matchSearch = !search || p.nome?.toLowerCase().includes(search.toLowerCase()) || p.email?.toLowerCase().includes(search.toLowerCase()) || p.nif?.includes(search);
    const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div>
      <PageHeader title="Entidades" subtitle="Condóminos, Advogados, Fornecedores e Clientes" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Entidade</Button>
      } />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por nome, email ou NIF..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="condomino">Condómino</SelectItem>
            <SelectItem value="fornecedor">Fornecedor</SelectItem>
            <SelectItem value="cliente">Cliente</SelectItem>
            <SelectItem value="advogado">Advogado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <button className="flex items-center gap-3 text-left" onClick={() => setPreview(p)}>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{p.nome?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-semibold text-foreground hover:text-primary transition-colors">{p.nome}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColor[p.tipo] || 'bg-gray-100 text-gray-700'}`}>{tipoLabel[p.tipo] || p.tipo}</span>
                </div>
              </button>
              <div className="flex gap-1">
                <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => del.mutate(p.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              {p.email && <p className="text-muted-foreground truncate">{p.email}</p>}
              {p.telefone && <p className="text-muted-foreground">{p.telefone}</p>}
              {p.nif && <p className="text-muted-foreground">NIF: {p.nif}</p>}
              {p.iban && <p className="text-muted-foreground text-xs truncate">IBAN: {p.iban}</p>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground">Nenhuma entidade encontrada</div>
        )}
      </div>

      {preview && <PessoaPreview pessoa={preview} onClose={() => setPreview(null)} onEdit={(p) => { setPreview(null); openEdit(p); }} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Entidade' : 'Nova Entidade'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="condomino">Condómino</SelectItem>
                  <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                  <SelectItem value="advogado">Advogado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {[['nome', 'Nome *'], ['nif', 'NIF'], ['email', 'Email'], ['telefone', 'Telefone'], ['morada', 'Morada'], ['codigo_postal', 'Código Postal'], ['localidade', 'Localidade'], ['iban', 'IBAN']].map(([k, l]) => (
              <div key={k} className={k === 'morada' || k === 'iban' ? 'sm:col-span-2' : ''}>
                <Label>{l}</Label>
                <Input className="mt-1" value={form[k] || ''} onChange={e => upd(k, e.target.value)} />
              </div>
            ))}
            <div>
              <Label>Senha AT</Label>
              <Input className="mt-1" value={form.senha_at || ''} onChange={e => upd('senha_at', e.target.value)} placeholder="Portal das Finanças" />
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