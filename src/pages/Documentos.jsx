import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, FileText, Download, Trash2, Upload, Printer, Pencil, X, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';

const empty = { condominio_id: '', titulo: '', tipo: 'circular', data: format(new Date(), 'yyyy-MM-dd'), descricao: '', ficheiro_url: '', publico: true };

const tipoLabels = { ata: 'Ata', aviso: 'Aviso', circular: 'Circular', regulamento: 'Regulamento', orcamento: 'Orçamento', outro: 'Outro' };
const tipoColors = { ata: 'bg-blue-100 text-blue-700', aviso: 'bg-yellow-100 text-yellow-700', circular: 'bg-green-100 text-green-700', regulamento: 'bg-purple-100 text-purple-700', orcamento: 'bg-orange-100 text-orange-700', outro: 'bg-gray-100 text-gray-700' };

function DocumentoPreview({ doc, condNome, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <h2 className="font-bold text-lg">Documento</h2>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground border rounded-md px-2 py-1">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            {doc.ficheiro_url && (
              <a href={doc.ficheiro_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 border border-primary rounded-md px-2 py-1">
                <Download className="w-4 h-4" /> Descarregar
              </a>
            )}
            <button onClick={() => { onClose(); onEdit(doc); }} className="flex items-center gap-1 text-sm text-foreground hover:text-foreground border rounded-md px-2 py-1">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-3 print:py-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl"><FileText className="w-6 h-6 text-primary" /></div>
            <div>
              <h3 className="text-xl font-bold">{doc.titulo}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColors[doc.tipo] || 'bg-gray-100 text-gray-700'}`}>{tipoLabels[doc.tipo] || doc.tipo}</span>
                {doc.publico && <span className="text-xs text-green-600 font-medium">Público</span>}
              </div>
            </div>
          </div>
          {[['Condomínio', condNome], ['Data', doc.data]].map(([label, val]) =>
            val ? (
              <div key={label} className="flex gap-3 text-sm">
                <span className="w-28 font-medium text-muted-foreground flex-shrink-0">{label}</span>
                <span className="text-foreground">{val}</span>
              </div>
            ) : null
          )}
          {doc.descricao && (
            <div className="text-sm border-t pt-3 mt-3">
              <p className="font-medium text-muted-foreground mb-1">Descrição</p>
              <p className="text-foreground">{doc.descricao}</p>
            </div>
          )}
          {doc.ficheiro_url && (
            <div className="border-t pt-3 mt-3">
              <a href={doc.ficheiro_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                <ExternalLink className="w-4 h-4" /> Ver / Abrir ficheiro
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Documentos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const { selectedCondominioId } = useCondominio();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: documentos = [], isLoading } = useQuery({ queryKey: ['documentos'], queryFn: () => agenciaAvenida.entities.Documento.list('-data') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? agenciaAvenida.entities.Documento.update(editing, data) : agenciaAvenida.entities.Documento.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documentos'] }); setOpen(false); toast.success('Documento guardado'); },
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Documento.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documentos'] }); toast.success('Documento eliminado'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (d) => { setForm(d); setEditing(d.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await agenciaAvenida.integrations.Core.UploadFile({ file });
    upd('ficheiro_url', file_url);
    setUploading(false);
    toast.success('Ficheiro carregado');
  };

  const filtered = documentos.filter(d => {
    const matchSearch = !search || d.titulo?.toLowerCase().includes(search.toLowerCase());
    const matchCond = selectedCondominioId === 'all' || d.condominio_id === selectedCondominioId;
    return matchSearch && matchCond;
  });

  return (
    <div>
      <PageHeader title="Documentos" subtitle="Atas, comunicados, regulamentos, orçamentos e outros documentos" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Documento</Button>
      } />

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 max-w-md" placeholder="Pesquisar documento..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(d => (
          <div key={d.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setPreview(d)}>
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Editar">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                {d.ficheiro_url && (
                  <a href={d.ficheiro_url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-muted rounded transition-colors" title="Descarregar">
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                )}
                <button onClick={() => del.mutate(d.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-foreground mb-1">{d.titulo}</h3>
            <p className="text-xs text-muted-foreground mb-3">{getCondName(d.condominio_id)} · {d.data}</p>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoColors[d.tipo] || 'bg-gray-100 text-gray-700'}`}>
                {tipoLabels[d.tipo] || d.tipo}
              </span>
              {d.publico && <span className="text-xs text-green-600 font-medium">Público</span>}
              {d.ficheiro_url && <span className="text-xs text-primary font-medium flex items-center gap-0.5"><Download className="w-3 h-3" />Ficheiro</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground">Nenhum documento encontrado</div>
        )}
      </div>

      {preview && <DocumentoPreview doc={preview} condNome={getCondName(preview.condominio_id)} onClose={() => setPreview(null)} onEdit={(d) => { setPreview(null); openEdit(d); }} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
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
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(tipoLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Título *</Label>
              <Input className="mt-1" value={form.titulo || ''} onChange={e => upd('titulo', e.target.value)} />
            </div>
            <div>
              <Label>Data</Label>
              <Input className="mt-1" type="date" value={form.data || ''} onChange={e => upd('data', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="publico" checked={form.publico} onChange={e => upd('publico', e.target.checked)} className="rounded" />
              <Label htmlFor="publico">Visível no portal</Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Ficheiro</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-lg p-4 text-center">
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <input type="file" onChange={handleFileUpload} className="hidden" id="doc-upload" />
                <label htmlFor="doc-upload" className="text-sm text-primary cursor-pointer hover:underline">
                  {uploading ? 'A carregar...' : form.ficheiro_url ? 'Ficheiro carregado ✓ (clique para substituir)' : 'Clique para selecionar ficheiro'}
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || uploading}>{save.isPending ? 'A guardar...' : 'Guardar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}