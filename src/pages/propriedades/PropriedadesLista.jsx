import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, Home, Edit, Percent, Euro } from 'lucide-react';

const TIPOS = { apartamento: 'Apartamento', moradia: 'Moradia', loja: 'Loja', escritorio: 'Escritório', garagem: 'Garagem', armazem: 'Armazém', outro: 'Outro' };

const empty = { morada: '', codigo_postal: '', localidade: '', tipo: 'apartamento', proprietario_id: '', inquilino_id: '', renda_mensal: 0, comissao_agencia: 0, comissao_percentagem: false, iban_proprietario: '', dia_vencimento: 8, atribuido_a: '', ativa: true, notas: '' };

export default function PropriedadesLista() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);

  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades'], queryFn: () => base44.entities.Propriedade.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => base44.entities.Pessoa.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });

  const proprietarios = pessoas.filter(p => p.tipo === 'proprietario');
  const inquilinos = pessoas.filter(p => p.tipo === 'inquilino');

  const save = useMutation({
    mutationFn: (d) => editing ? base44.entities.Propriedade.update(editing, d) : base44.entities.Propriedade.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['propriedades'] }); setOpen(false); },
  });

  const filtered = propriedades.filter(p => !search || p.morada?.toLowerCase().includes(search.toLowerCase()));

  const openEdit = (p) => { setForm({ ...empty, ...p }); setEditing(p.id); setOpen(true); };
  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };

  const pessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || '—';

  return (
    <div>
      <PageHeader title="Propriedades" subtitle="Moradas geridas pela agência"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Nova Propriedade</Button>}
      />
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar morada..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 rounded-lg"><Home className="w-4 h-4 text-emerald-600" /></div>
                <div>
                  <p className="font-semibold text-sm text-foreground leading-tight">{p.morada}</p>
                  <p className="text-xs text-muted-foreground">{p.codigo_postal} {p.localidade}</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-medium">{TIPOS[p.tipo] || p.tipo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Proprietário</span>
                <span className="font-medium">{pessoaNome(p.proprietario_id)}</span>
              </div>
              {p.inquilino_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inquilino</span>
                  <span className="font-medium">{pessoaNome(p.inquilino_id)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 mt-2">
                <span className="text-muted-foreground">Renda Mensal</span>
                <span className="font-bold text-emerald-600">€{(p.renda_mensal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comissão Agência</span>
                <span className="font-medium">{p.comissao_percentagem ? `${p.comissao_agencia}%` : `€${(p.comissao_agencia || 0).toFixed(2)}`}</span>
              </div>
            </div>
            <div className={`mt-3 text-center text-xs py-1 rounded-full ${p.ativa !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.ativa !== false ? 'Ativa' : 'Inativa'}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            <Home className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma propriedade encontrada</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Propriedade' : 'Nova Propriedade'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Morada *</Label><Input value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código Postal</Label><Input value={form.codigo_postal} onChange={e => setForm(f => ({ ...f, codigo_postal: e.target.value }))} /></div>
              <div><Label>Localidade</Label><Input value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} /></div>
            </div>
            <div><Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Proprietário *</Label>
              <Select value={form.proprietario_id} onValueChange={v => setForm(f => ({ ...f, proprietario_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar proprietário" /></SelectTrigger>
                <SelectContent>{proprietarios.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Inquilino</Label>
              <Select value={form.inquilino_id || '__none__'} onValueChange={v => setForm(f => ({ ...f, inquilino_id: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Sem inquilino" /></SelectTrigger>
                <SelectContent><SelectItem value="__none__">Sem inquilino</SelectItem>{inquilinos.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Renda Mensal (€)</Label><Input type="number" value={form.renda_mensal} onChange={e => setForm(f => ({ ...f, renda_mensal: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Dia de Vencimento</Label><Input type="number" value={form.dia_vencimento} onChange={e => setForm(f => ({ ...f, dia_vencimento: parseInt(e.target.value) || 8 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Comissão Agência</Label><Input type="number" value={form.comissao_agencia} onChange={e => setForm(f => ({ ...f, comissao_agencia: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Tipo de Comissão</Label>
                <Select value={form.comissao_percentagem ? 'percent' : 'fixo'} onValueChange={v => setForm(f => ({ ...f, comissao_percentagem: v === 'percent' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="fixo">Valor Fixo (€)</SelectItem><SelectItem value="percent">Percentagem (%)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>IBAN do Proprietário</Label><Input value={form.iban_proprietario} onChange={e => setForm(f => ({ ...f, iban_proprietario: e.target.value }))} /></div>
            <div><Label>Colaborador Responsável</Label>
              <Select value={form.atribuido_a || '__none__'} onValueChange={v => setForm(f => ({ ...f, atribuido_a: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Notas</Label><Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              {save.isPending ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}