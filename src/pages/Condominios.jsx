import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Banknote, Landmark, Printer, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCondominio } from '@/lib/CondominioContext';
import { toast } from 'sonner';

const empty = { nome: '', nif: '', morada: '', codigo_postal: '', localidade: '', telefone: '', email: '', iban: '', banco: '', saldo_banco: 0, saldo_caixa: 0, dados_acesso_bancario: '' };

function CondominioPreview({ cond, onClose, onEdit }) {
  return (
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
        <div className="px-6 py-5 space-y-3 print:py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl"><Building2 className="w-6 h-6 text-primary" /></div>
            <div>
              <h3 className="text-xl font-bold">{cond.nome}</h3>
              {cond.nif && <p className="text-sm text-muted-foreground">NIF: {cond.nif}</p>}
            </div>
          </div>
          {[['Morada', cond.morada], ['Código Postal', cond.codigo_postal], ['Localidade', cond.localidade], ['Telefone', cond.telefone], ['Email', cond.email], ['Banco', cond.banco], ['IBAN', cond.iban]].map(([label, val]) =>
            val ? (
              <div key={label} className="flex gap-3 text-sm">
                <span className="w-32 font-medium text-muted-foreground flex-shrink-0">{label}</span>
                <span className="text-foreground">{val}</span>
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
              <p className="font-medium text-muted-foreground mb-1">Dados Acesso Bancário</p>
              <p className="text-foreground whitespace-pre-wrap">{cond.dados_acesso_bancario}</p>
            </div>
          )}
        </div>
      </div>
    </div>
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

  const { data: condominios = [], isLoading } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? agenciaAvenida.entities.Condominio.update(editing, data) : agenciaAvenida.entities.Condominio.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['condominios'] }); setOpen(false); toast.success('Condomínio guardado'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (c) => { setForm(c); setEditing(c.id); setOpen(true); };

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div>
      <PageHeader title="Condomínios" subtitle="Condomínios geridos pela Agência Avenida" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Condomínio</Button>
      } />

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {condominios.map(c => (
          <div
            key={c.id}
            className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
            onClick={() => setPreview(c)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Building2 className="w-5 h-5 text-primary" />
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
      </div>

      {preview && <CondominioPreview cond={preview} onClose={() => setPreview(null)} onEdit={(c) => { setPreview(null); openEdit(c); }} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Condomínio' : 'Novo Condomínio'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            {[
              ['nome', 'Nome *', 'text'], ['nif', 'NIF', 'text'],
              ['morada', 'Morada', 'text'], ['codigo_postal', 'Código Postal', 'text'],
              ['localidade', 'Localidade', 'text'], ['telefone', 'Telefone', 'text'],
              ['email', 'Email', 'email'], ['banco', 'Banco', 'text'],
              ['iban', 'IBAN', 'text'], ['saldo_banco', 'Saldo Banco (€)', 'number'],
              ['saldo_caixa', 'Saldo Caixa (€)', 'number'],
            ].map(([key, label, type]) => (
              <div key={key} className={key === 'morada' || key === 'iban' ? 'sm:col-span-2' : ''}>
                <Label>{label}</Label>
                <Input className="mt-1" type={type} value={form[key] || ''} onChange={e => f(key, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)} />
              </div>
            ))}
            <div className="sm:col-span-2">
              <Label>Dados Acesso Bancário</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" placeholder="Utilizador, senha, URL do homebanking..." value={form.dados_acesso_bancario || ''} onChange={e => f('dados_acesso_bancario', e.target.value)} />
            </div>
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