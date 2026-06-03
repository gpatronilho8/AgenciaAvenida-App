import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Trash2, Receipt } from 'lucide-react';

const CATEGORIAS = { reparacao: 'Reparação', manutencao: 'Manutenção', condominio: 'Condomínio', seguros: 'Seguros', impostos: 'Impostos', comissao_agencia: 'Comissão Agência', outro: 'Outro' };
const empty = { propriedade_id: '', descricao: '', categoria: 'outro', valor: 0, data: new Date().toISOString().split('T')[0], fornecedor_id: '', desconta_proprietario: true, notas: '' };

export default function DespesasPropriedade() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterProp, setFilterProp] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const { data: despesas = [] } = useQuery({ queryKey: ['despesas_prop'], queryFn: () => agenciaAvenida.entities.DespesaPropriedade.list() });
  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades'], queryFn: () => agenciaAvenida.entities.Propriedade.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const fornecedores = pessoas.filter(p => p.tipo === 'fornecedor');

  const save = useMutation({
    mutationFn: (d) => editing ? agenciaAvenida.entities.DespesaPropriedade.update(editing, d) : agenciaAvenida.entities.DespesaPropriedade.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas_prop'] }); setOpen(false); },
  });

  const remove = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.DespesaPropriedade.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['despesas_prop'] }),
  });

  const propNome = (id) => propriedades.find(p => p.id === id)?.morada || '—';

  const filtered = despesas.filter(d => {
    const matchSearch = !search || d.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchProp = filterProp === 'all' || d.propriedade_id === filterProp;
    return matchSearch && matchProp;
  }).sort((a, b) => new Date(b.data) - new Date(a.data));

  const total = filtered.reduce((s, d) => s + (d.valor || 0), 0);

  const openEdit = (d) => { setForm({ ...empty, ...d }); setEditing(d.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };

  return (
    <div>
      <PageHeader title="Despesas de Propriedades" subtitle={`Total filtrado: €${total.toFixed(2)}`}
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nova Despesa</Button>}
      />
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterProp} onValueChange={setFilterProp}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Todas as propriedades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as propriedades</SelectItem>
            {propriedades.map(p => <SelectItem key={p.id} value={p.id}>{p.morada}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sem despesas registadas</p>
            </div>
          )}
          {filtered.map(d => (
            <div key={d.id} className="px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-sm">{d.descricao}</p>
                <p className="text-xs text-muted-foreground">{propNome(d.propriedade_id)} · {CATEGORIAS[d.categoria] || d.categoria} · {d.data}</p>
                {!d.desconta_proprietario && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">Não desconta ao proprietário</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-red-600">-€{d.valor?.toFixed(2)}</span>
                <Button size="icon" variant="ghost" onClick={() => openEdit(d)}><Receipt className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => remove.mutate(d.id)} className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Propriedade *</Label>
              <Select value={form.propriedade_id} onValueChange={v => setForm(f => ({ ...f, propriedade_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar propriedade" /></SelectTrigger>
                <SelectContent>{propriedades.map(p => <SelectItem key={p.id} value={p.id}>{p.morada}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Categoria</Label>
                <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Valor (€)</Label><Input type="number" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            <div><Label>Fornecedor</Label>
              <Select value={form.fornecedor_id || ''} onValueChange={v => setForm(f => ({ ...f, fornecedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sem fornecedor" /></SelectTrigger>
                <SelectContent><SelectItem value={null}>Sem fornecedor</SelectItem>{fornecedores.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="desconta" checked={form.desconta_proprietario} onChange={e => setForm(f => ({ ...f, desconta_proprietario: e.target.checked }))} />
              <Label htmlFor="desconta">Desconta no repasse ao proprietário</Label>
            </div>
            <div><Label>Notas</Label><Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></div>
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