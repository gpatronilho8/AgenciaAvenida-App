import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { supabase } from '@/api/supabase.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Search, FileText, Download, Trash2, Upload, Printer, Pencil, X, ExternalLink, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';
import { cn } from '@/lib/utils';

const empty = { condominio_id: '', titulo: '', tipo: 'comunicado', data: format(new Date(), 'yyyy-MM-dd'), descricao: '', ficheiro_url: '', publico: true };

const tipoLabels = { 
  ata: 'Ata', 
  convocatoria: 'Convocatória', 
  comunicado: 'Comunicado', 
  regulamento: 'Regulamento', 
  orcamento: 'Orçamento', 
  outro: 'Outro' 
};

const tipoColors = { 
  ata: 'bg-blue-100 text-blue-700 border-blue-200', 
  convocatoria: 'bg-red-100 text-red-700 border-red-200', 
  comunicado: 'bg-green-100 text-green-700 border-green-200', 
  regulamento: 'bg-purple-100 text-purple-700 border-purple-200', 
  orcamento: 'bg-orange-100 text-orange-700 border-orange-200', 
  outro: 'bg-muted text-muted-foreground border-border' 
};

function DocumentoPreview({ doc, condNome, onClose, onEdit }) {
  const isPdf = doc.ficheiro_url?.toLowerCase().endsWith('.pdf');
  const fileNameRaw = doc.ficheiro_url?.split('/').pop() || '';
  const displayFileName = decodeURIComponent(fileNameRaw.substring(fileNameRaw.indexOf('-') + 1)) || 'Documento Anexo';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl no-scrollbar rounded-xl">
        <div className="flex items-start justify-between mb-4 print:hidden pr-8">
          <div>
            <h2 className="text-xl font-bold">{doc.titulo}</h2>
            <p className="text-sm text-muted-foreground">{condNome} · {doc.data}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />Imprimir
            </Button>
            <Button size="sm" onClick={() => { onClose(); onEdit(doc); }} className="gap-1">
              <Pencil className="w-3.5 h-3.5" />Editar
            </Button>
          </div>
        </div>

        <div className="bg-muted/40 border border-border rounded-lg p-5 mb-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl"><FileText className="w-6 h-6 text-primary" /></div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${tipoColors[doc.tipo] || 'bg-gray-100 text-gray-700'}`}>
                  {tipoLabels[doc.tipo] || doc.tipo}
                </span>
                {doc.publico && <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Visível Portal Condóminos</span>}
              </div>
              <h3 className="text-lg font-bold text-foreground leading-tight">{doc.titulo}</h3>
            </div>
          </div>
        </div>

        {doc.descricao && (
          <div className="mb-6 bg-background border border-border rounded-lg p-4 shadow-sm">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Descrição / Resumo</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{doc.descricao}</p>
          </div>
        )}

        {doc.ficheiro_url && (
          <div>
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Ficheiro Anexo</p>
            <a 
              href={doc.ficheiro_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {isPdf ? <FileText className="w-8 h-8 text-red-500 shrink-0" /> : <FileText className="w-8 h-8 text-primary shrink-0" />}
                <span className="text-sm font-medium text-primary group-hover:underline truncate" title={displayFileName}>
                  {displayFileName}
                </span>
              </div>
              <Button size="sm" variant="secondary" className="shrink-0 gap-1.5 ml-2 pointer-events-none">
                <Download className="w-3.5 h-3.5" /> Descarregar
              </Button>
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Documentos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const { selectedCondominioId, selectedAno } = useCondominio();
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [comboCondominioOpen, setComboCondominioOpen] = useState(false);

  const { data: documentos = [], isLoading } = useQuery({ queryKey: ['documentos'], queryFn: () => agenciaAvenida.entities.Documento.list('-data') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });

  const condominiosAtivos = condominios.filter(c => c && c.ativo !== false && c.ativo !== 'false').sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const save = useMutation({
    mutationFn: (data) => editing ? agenciaAvenida.entities.Documento.update(editing, data) : agenciaAvenida.entities.Documento.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documentos'] }); setOpen(false); toast.success('DOCUMENTO GUARDADO COM SUCESSO'); },
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Documento.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documentos'] }); toast.success('DOCUMENTO ELIMINADO COM SUCESSO'); },
  });

  const openNew = () => { 
    setForm({ ...empty, condominio_id: selectedCondominioId === 'all' ? '' : selectedCondominioId }); 
    setEditing(null); 
    setOpen(true); 
  };
  
  const openEdit = (d) => { setForm(d); setEditing(d.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const safeName = file.name.replace(`.${fileExt}`, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const fileName = `${Date.now()}-${safeName}.${fileExt}`;
      const filePath = `geral/${fileName}`;

      const { error } = await supabase.storage.from('documentos').upload(filePath, file);
      if (error) throw error;

      const { data: publicUrlData } = supabase.storage.from('documentos').getPublicUrl(filePath);
      upd('ficheiro_url', publicUrlData.publicUrl);
      toast.success('FICHEIRO CARREGADO COM SUCESSO');
      
    } catch (error) {
      console.error("Erro no upload:", error);
      toast.error('FALHA AO CARREGAR O FICHEIRO.');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const removeFicheiro = () => upd('ficheiro_url', '');

  const filtered = documentos.filter(d => {
    const matchSearch = !search || d.titulo?.toLowerCase().includes(search.toLowerCase());
    const matchCond = selectedCondominioId === 'all' || d.condominio_id === selectedCondominioId;
    const matchAno = !selectedAno || selectedAno === 'all' || String(d.data || '').includes(String(selectedAno));
    return matchSearch && matchCond && matchAno;
  });

  return (
    <div>
      <PageHeader title="Documentos" subtitle="Atas, comunicados, regulamentos, orçamentos e outros documentos" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Documento</Button>
      } />

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-background w-full" placeholder="Pesquisar documento pelo título..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(d => (
          <div key={d.id} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between" onClick={() => setPreview(d)}>
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 bg-primary/10 rounded-xl">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-muted rounded transition-colors" title="Editar">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => del.mutate(d.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-foreground mb-1 leading-tight">{d.titulo}</h3>
              <p className="text-xs font-medium text-muted-foreground mb-4">{getCondName(d.condominio_id)} · {d.data}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap border-t border-border pt-4">
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border ${tipoColors[d.tipo] || 'bg-gray-100 text-gray-700'}`}>
                {tipoLabels[d.tipo] || d.tipo}
              </span>
              {d.publico && <span className="text-[11px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Público</span>}
              {d.ficheiro_url && <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Download className="w-3 h-3" />Anexo</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground bg-card border border-dashed rounded-xl">Nenhum Documento Encontrado</div>
        )}
      </div>

      {preview && <DocumentoPreview doc={preview} condNome={getCondName(preview.condominio_id)} onClose={() => setPreview(null)} onEdit={(d) => { setPreview(null); openEdit(d); }} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />{editing ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            
            <div className="sm:col-span-1">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioOpen} onOpenChange={setComboCondominioOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioOpen} className="w-full justify-between font-normal bg-background mt-1">
                    <span className="truncate">
                      {form.condominio_id ? condominiosAtivos.find(c => c.id === form.condominio_id)?.nome : "Selecione ou pesquise..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { upd('condominio_id', c.id); setComboCondominioOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:col-span-1">
              <Label>Tipo de Documento</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[210]">
                  {Object.entries(tipoLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label>Título / Assunto *</Label>
              <Input className="mt-1 bg-background" value={form.titulo || ''} onChange={e => upd('titulo', e.target.value)} placeholder="Ex: Orçamento Obras Telhado 2026..." />
            </div>

            <div>
              <Label>Data do Documento</Label>
              <Input className="mt-1 bg-background" type="date" value={form.data || ''} onChange={e => upd('data', e.target.value)} />
            </div>

            <div className="flex items-center gap-2 mt-8">
              <input type="checkbox" id="publico" checked={form.publico} onChange={e => upd('publico', e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4" />
              <Label htmlFor="publico" className="cursor-pointer">Visível em Portal Condóminos</Label>
            </div>

            <div className="sm:col-span-2">
              <Label>Descrição / Resumo</Label>
              <textarea 
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" 
                value={form.descricao || ''} 
                onChange={e => upd('descricao', e.target.value)} 
                placeholder="Detalhes adicionais sobre o documento..."
              />
            </div>

            <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-3">Ficheiro (PDF ou Imagem)</Label>
              
              {!form.ficheiro_url ? (
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer p-6 bg-muted/20 border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{uploading ? 'A enviar ficheiro...' : 'Clique para carregar o documento'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                </label>
              ) : (
                <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background shadow-sm hover:border-primary/50 transition-colors">
                  <a href={form.ficheiro_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 overflow-hidden flex-1 group">
                    {form.ficheiro_url.toLowerCase().endsWith('.pdf') ? <FileText className="w-8 h-8 text-red-500 shrink-0" /> : <FileText className="w-8 h-8 text-primary shrink-0" />}
                    <span className="text-sm font-medium text-foreground group-hover:text-primary group-hover:underline truncate">
                      {decodeURIComponent(form.ficheiro_url.split('/').pop().substring(form.ficheiro_url.split('/').pop().indexOf('-') + 1))}
                    </span>
                  </a>
                  <button type="button" onClick={removeFicheiro} className="p-2 ml-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors shrink-0" title="Remover Ficheiro">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={() => save.mutate(form)} disabled={save.isPending || uploading || !form.condominio_id || !form.titulo}>
              {save.isPending ? 'A guardar...' : 'Guardar Documento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}