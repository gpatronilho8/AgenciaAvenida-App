import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Receipt, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';

const empty = { condominio_id: '', fornecedor_id: '', categoria: 'manutencao', descricao: '', valor: '', data: format(new Date(), 'yyyy-MM-dd'), metodo_pagamento: 'transferencia', conta: 'banco', numero_fatura: '', observacoes: '' };

const categoriaLabels = {
  limpeza: 'Limpeza', manutencao: 'Manutenção', seguros: 'Seguros',
  eletricidade: 'Eletricidade', agua: 'Água', elevador: 'Elevador',
  jardim: 'Jardim', administracao: 'Administração', obras: 'Obras', outros: 'Outros'
};

const categoriaColor = {
  limpeza: 'bg-blue-100 text-blue-700', manutencao: 'bg-orange-100 text-orange-700',
  seguros: 'bg-purple-100 text-purple-700', eletricidade: 'bg-yellow-100 text-yellow-700',
  agua: 'bg-cyan-100 text-cyan-700', elevador: 'bg-gray-100 text-gray-700',
  jardim: 'bg-green-100 text-green-700', administracao: 'bg-indigo-100 text-indigo-700',
  obras: 'bg-red-100 text-red-700', outros: 'bg-gray-100 text-gray-700',
};

export default function Despesas() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const { selectedCondominioId } = useCondominio();
  const [search, setSearch] = useState('');

  const { data: despesas = [], isLoading } = useQuery({ queryKey: ['despesas'], queryFn: () => base44.entities.Despesa.list('-data') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => base44.entities.Condominio.list() });
  const { data: fornecedores = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => base44.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? base44.entities.Despesa.update(editing, data) : base44.entities.Despesa.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); setOpen(false); toast.success('Despesa guardada'); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Despesa.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas'] }); toast.success('Despesa eliminada'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (d) => { setForm(d); setEditing(d.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';
  const getFornecedorName = (id) => fornecedores.find(p => p.id === id)?.nome || '-';

  const filtered = despesas.filter(d => {
    const matchSearch = !search || d.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchCond = selectedCondominioId === 'all' || d.condominio_id === selectedCondominioId;
    return matchSearch && matchCond;
  });

  const totalDespesas = filtered.reduce((s, d) => s + (d.valor || 0), 0);

  return (
    <div>
      <PageHeader title="Despesas" subtitle="Controlo de despesas por condomínio" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Despesa</Button>
      } />

      <div className="bg-red-50 rounded-xl p-4 border border-red-100 mb-6 inline-block">
        <p className="text-xs text-red-700 font-medium">Total Despesas (filtrado)</p>
        <p className="text-2xl font-bold text-red-800">€{totalDespesas.toFixed(2)}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Data', 'Condomínio', 'Categoria', 'Descrição', 'Fornecedor', 'Conta', 'Valor', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{d.data}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getCondName(d.condominio_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoriaColor[d.categoria] || 'bg-gray-100 text-gray-700'}`}>
                      {categoriaLabels[d.categoria] || d.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3">{d.descricao}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getFornecedorName(d.fornecedor_id)}</td>
                  <td className="px-4 py-3">
                    <span className="capitalize text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full">{d.conta}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-red-600">€{(d.valor || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button onClick={() => del.mutate(d.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !isLoading && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma despesa encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <Label>Condomínio *</Label>
              <Select value={form.condominio_id} onValueChange={v => upd('condominio_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{condominios.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={v => upd('categoria', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(categoriaLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição *</Label>
              <Input className="mt-1" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
            </div>
            <div>
              <Label>Valor (€) *</Label>
              <Input className="mt-1" type="number" value={form.valor || ''} onChange={e => upd('valor', parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <Label>Data *</Label>
              <Input className="mt-1" type="date" value={form.data || ''} onChange={e => upd('data', e.target.value)} />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={form.fornecedor_id || ''} onValueChange={v => upd('fornecedor_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{fornecedores.filter(p => p.tipo === 'fornecedor').map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta</Label>
              <Select value={form.conta} onValueChange={v => upd('conta', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="banco">Banco</SelectItem>
                  <SelectItem value="caixa">Caixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Método de Pagamento</Label>
              <Select value={form.metodo_pagamento} onValueChange={v => upd('metodo_pagamento', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="mb">Referência MB</SelectItem>
                  <SelectItem value="mbway">MB WAY</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nº Fatura</Label>
              <Input className="mt-1" value={form.numero_fatura || ''} onChange={e => upd('numero_fatura', e.target.value)} />
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