import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Home, Search, X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useCondominio } from '@/lib/CondominioContext';

const empty = {
  condominio_id: '', codigo: '', descricao: '', piso: '', permilagem: '', area_m2: '',
  proprietario_id: '', proprietario2_id: '', inquilino_id: '', inquilino2_id: '',
  recibo_incluir: ['proprietario'], responsavel_pagamento: 'proprietario', quota_mensal: 0
};

const tipoLabel = { condomino: 'Condómino', fornecedor: 'Fornecedor', cliente: 'Cliente', advogado: 'Advogado' };

function FracaoPreview({ fracao, condominios, pessoas, onClose }) {
  const cond = condominios.find(c => c.id === fracao.condominio_id);
  const getPessoa = (id) => pessoas.find(p => p.id === id);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <h2 className="font-bold text-lg">Ficha de Fração</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3 print:py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Home className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{fracao.codigo}</h3>
              <p className="text-muted-foreground">{fracao.descricao}</p>
            </div>
          </div>
          {[
            ['Condomínio', cond?.nome],
            ['Piso', fracao.piso],
            ['Permilagem', fracao.permilagem ? `${fracao.permilagem}‰` : null],
            ['Área', fracao.area_m2 ? `${fracao.area_m2} m²` : null],
            ['Quota Mensal', fracao.quota_mensal ? `€${parseFloat(fracao.quota_mensal).toFixed(2)}` : null],
            ['Responsável', fracao.responsavel_pagamento === 'proprietario' ? 'Proprietário' : 'Inquilino'],
          ].map(([label, val]) => val ? (
            <div key={label} className="flex gap-3 text-sm">
              <span className="w-32 font-medium text-muted-foreground flex-shrink-0">{label}</span>
              <span>{val}</span>
            </div>
          ) : null)}

          {/* Titulares */}
          <div className="border-t pt-3 mt-2">
            <p className="text-sm font-semibold mb-2">Titulares</p>
            {['proprietario_id', 'proprietario2_id', 'inquilino_id', 'inquilino2_id'].map(key => {
              const pessoa = getPessoa(fracao[key]);
              if (!pessoa) return null;
              const labels = { proprietario_id: 'Proprietário 1', proprietario2_id: 'Proprietário 2', inquilino_id: 'Inquilino 1', inquilino2_id: 'Inquilino 2' };
              return (
                <div key={key} className="flex gap-3 text-sm mb-1">
                  <span className="w-32 font-medium text-muted-foreground flex-shrink-0">{labels[key]}</span>
                  <span>{pessoa.nome}</span>
                </div>
              );
            })}
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

  const { data: fracoes = [], isLoading } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? agenciaAvenida.entities.Fracao.update(editing, data) : agenciaAvenida.entities.Fracao.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['fracoes'] }); setOpen(false); toast.success('Fração guardada'); },
  });

  const openNew = () => { setForm({ ...empty, condominio_id: selectedCondominioId !== 'all' ? selectedCondominioId : '' }); setEditing(null); setOpen(true); };
  const openEdit = (f) => { setForm({ ...empty, ...f, recibo_incluir: f.recibo_incluir || ['proprietario'] }); setEditing(f.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleRecibo = (val) => {
    setForm(f => {
      const list = f.recibo_incluir || [];
      return { ...f, recibo_incluir: list.includes(val) ? list.filter(x => x !== val) : [...list, val] };
    });
  };

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';
  const getPessoaName = (id) => pessoas.find(p => p.id === id)?.nome || '-';

  const filtered = fracoes.filter(f => {
    const matchSearch = !search || f.codigo?.toLowerCase().includes(search.toLowerCase()) || f.descricao?.toLowerCase().includes(search.toLowerCase());
    const matchCond = selectedCondominioId === 'all' || f.condominio_id === selectedCondominioId;
    return matchSearch && matchCond;
  });

  const pessoaSelect = (key, label) => (
    <div>
      <Label>{label}</Label>
      <Select value={form[key] || ''} onValueChange={v => upd(key, v)}>
        <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={null}>— Nenhum —</SelectItem>
          {pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      <PageHeader title="Frações" subtitle="Gestão de apartamentos e unidades" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Fração</Button>
      } />

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar fração..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['Código', 'Condomínio', 'Piso', 'Permilagem', 'Proprietário 1', 'Inquilino 1', 'Quota', 'Ações'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(f => (
              <tr key={f.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setPreview(f)}>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded"><Home className="w-3 h-3 text-primary" /></div>
                    <span className="font-medium">{f.codigo}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{getCondName(f.condominio_id)}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.piso || '-'}</td>
                <td className="px-4 py-3 text-muted-foreground">{f.permilagem || '-'}‰</td>
                <td className="px-4 py-3">
                  {f.proprietario_id ? (
                    <button
                      onClick={e => { e.stopPropagation(); const p = pessoas.find(p => p.id === f.proprietario_id); if (p) setPreview({ _tipo: 'pessoa', ...p }); }}
                      className="text-primary hover:underline"
                    >
                      {getPessoaName(f.proprietario_id)}
                    </button>
                  ) : '-'}
                </td>
                <td className="px-4 py-3">
                  {f.inquilino_id ? (
                    <button
                      onClick={e => { e.stopPropagation(); const p = pessoas.find(p => p.id === f.inquilino_id); if (p) setPreview({ _tipo: 'pessoa', ...p }); }}
                      className="text-primary hover:underline"
                    >
                      {getPessoaName(f.inquilino_id)}
                    </button>
                  ) : '-'}
                </td>
                <td className="px-4 py-3 font-medium">€{(f.quota_mensal || 0).toFixed(2)}</td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(f)} className="p-1.5 hover:bg-muted rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && !isLoading && (
              <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Nenhuma Fração Encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      {preview && preview._tipo === 'pessoa' ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg">Ficha de Entidade</h2>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="text-sm text-primary hover:underline flex items-center gap-1"><Printer className="w-4 h-4"/>Imprimir</button>
                <button onClick={() => setPreview(null)}><X className="w-5 h-5 text-muted-foreground"/></button>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-bold text-xl">{preview.nome}</p>
              {[['NIF', preview.nif], ['Email', preview.email], ['Telefone', preview.telefone], ['Morada', preview.morada], ['IBAN', preview.iban]].map(([l, v]) =>
                v ? <div key={l} className="flex gap-3"><span className="w-24 font-medium text-muted-foreground">{l}</span><span>{v}</span></div> : null
              )}
            </div>
          </div>
        </div>
      ) : preview ? (
        <FracaoPreview fracao={preview} condominios={condominios} pessoas={pessoas} onClose={() => setPreview(null)} />
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Fração' : 'Nova Fração'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <Label>Condomínio *</Label>
              <Select value={form.condominio_id} onValueChange={v => upd('condominio_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar condomínio" /></SelectTrigger>
                <SelectContent>{condominios.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {[['codigo', 'Código *'], ['descricao', 'Descrição'], ['piso', 'Piso']].map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input className="mt-1" value={form[k] || ''} onChange={e => upd(k, e.target.value)} /></div>
            ))}
            {[['permilagem', 'Permilagem (‰)'], ['area_m2', 'Área (m²)']].map(([k, l]) => (
              <div key={k}><Label>{l}</Label><Input className="mt-1" type="number" value={form[k] || ''} onChange={e => upd(k, parseFloat(e.target.value) || 0)} /></div>
            ))}
            <div>
              <Label>Quota Mensal (€)</Label>
              <Input className="mt-1 bg-muted cursor-not-allowed" type="number" value={form.quota_mensal || 0} readOnly disabled title="Defina a quota no ecrã de Quotas" />
              <p className="text-xs text-muted-foreground mt-1">Gerida no ecrã de Quotas</p>
            </div>

            {/* Titulares */}
            <div className="sm:col-span-2 border-t pt-3">
              <p className="font-medium text-sm mb-3">Titulares</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pessoaSelect('proprietario_id', 'Proprietário 1')}
                {pessoaSelect('proprietario2_id', 'Proprietário 2')}
                {pessoaSelect('inquilino_id', 'Inquilino 1')}
                {pessoaSelect('inquilino2_id', 'Inquilino 2')}
              </div>
            </div>

            {/* Incluir no recibo */}
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Incluir no recibo</Label>
              <div className="flex flex-wrap gap-2">
                {[['proprietario', 'Proprietário 1'], ['proprietario2', 'Proprietário 2'], ['inquilino', 'Inquilino 1'], ['inquilino2', 'Inquilino 2']].map(([val, lbl]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleRecibo(val)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${(form.recibo_incluir || []).includes(val) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Responsável pelo Pagamento</Label>
              <Select value={form.responsavel_pagamento} onValueChange={v => upd('responsavel_pagamento', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="proprietario">Proprietário</SelectItem>
                  <SelectItem value="inquilino">Inquilino</SelectItem>
                </SelectContent>
              </Select>
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