import { useState, useMemo } from 'react';
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
import { Plus, Calendar, List, FileText, Mail, Edit, CheckCircle, Check, ChevronsUpDown, Clock, MapPin, Search, Users, Trash2, PenTool, Upload, Loader2, AlertTriangle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';
import { cn } from '@/lib/utils';
import CalendarioAssembleias from '@/components/assembleias/CalendarioAssembleias';

const empty = {
  condominio_id: '',
  tipo: 'ordinaria',
  titulo: '',
  data: format(new Date(), 'yyyy-MM-dd'),
  hora: '19:00',
  local: 'Instalações Agência Avenida',
  segunda_convocatoria_data: format(new Date(), 'yyyy-MM-dd'),
  segunda_convocatoria_hora: '19:30',
  estado: 'agendada',
  portal_visivel: true,
  notas: '',
  email_enviado_convocatoria: false,
  email_enviado_ata: false
};

const estadoColors = {
  agendada: 'bg-blue-100 text-blue-700 border-blue-200',
  realizada: 'bg-green-100 text-green-700 border-green-200',
  cancelada: 'bg-red-100 text-red-700 border-red-200',
};

// ==============================================================================
// COMPONENTE: MODAL DE PRÉ-VISUALIZAÇÃO
// ==============================================================================
function AssembleiaPreview({ assembleia, condNome, onClose, onEdit, onDelete, onPrepararAta }) {
  const qc = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateAssembleia = useMutation({
    mutationFn: (partialData) => agenciaAvenida.entities.Assembleia.update(assembleia.id, partialData),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assembleias'] }); }
  });

  const handleNotificarConvocatoria = () => {
    updateAssembleia.mutate({ email_enviado_convocatoria: true });
    toast.success('CONVOCATÓRIA ENVIADA POR E-MAIL');
  };

  const handleNotificarAta = () => {
    updateAssembleia.mutate({ email_enviado_ata: true });
    toast.success('ATA ENVIADA POR E-MAIL');
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl">
          <div className="flex items-start justify-between mb-4 pr-8">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Detalhes da Assembleia</h2>
              <p className="text-sm text-muted-foreground">{condNome}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={() => { onClose(); onEdit(assembleia); }} className="gap-1">
                <Edit className="w-3.5 h-3.5" />Editar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="gap-1">
                <Trash2 className="w-3.5 h-3.5" />Eliminar
              </Button>
            </div>
          </div>

          <div className="bg-muted/40 border border-border rounded-lg p-5 mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl"><Calendar className="w-6 h-6 text-primary" /></div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${estadoColors[assembleia.estado] || 'bg-gray-100 text-gray-700'}`}>
                    {assembleia.estado === 'agendada' ? 'Agendada' : assembleia.estado === 'realizada' ? 'Realizada' : 'Cancelada'}
                  </span>
                  <span className="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-semibold capitalize">
                    {assembleia.tipo}
                  </span>
                  {assembleia.portal_visivel && <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-semibold">Visível no Portal</span>}
                </div>
                <h3 className="text-lg font-bold text-foreground leading-tight">{assembleia.titulo}</h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-background border border-border rounded-lg p-4 shadow-sm">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4" /> 1ª Convocatória</p>
              <p className="font-semibold text-foreground">{assembleia.data ? format(new Date(assembleia.data), 'dd/MM/yyyy') : '-'}</p>
              <p className="text-xl font-black mt-1 text-primary">{assembleia.hora?.substring(0, 5) || '--:--'}</p>
            </div>
            <div className="bg-muted/30 border border-border rounded-lg p-4 shadow-sm">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><Clock className="w-4 h-4" /> 2ª Convocatória</p>
              <p className="font-semibold text-foreground">{assembleia.segunda_convocatoria_data ? format(new Date(assembleia.segunda_convocatoria_data), 'dd/MM/yyyy') : '-'}</p>
              <p className="text-xl font-black mt-1 text-muted-foreground">{assembleia.segunda_convocatoria_hora?.substring(0, 5) || '--:--'}</p>
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-4 shadow-sm mb-6">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Local da Reunião</p>
            <p className="font-semibold text-foreground">{assembleia.local || 'Não definido'}</p>
          </div>

          {assembleia.notas && (
            <div className="mb-6">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Notas Internas</p>
              <p className="text-sm text-muted-foreground italic bg-muted/30 p-3 rounded-lg border border-dashed">{assembleia.notas}</p>
            </div>
          )}

          {/* SECÇÃO DE DOCUMENTOS ALINHADA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">

            {/* CARTÃO: CONVOCATÓRIA */}
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex flex-col h-full">
              <div className="flex-1">
                <p className="font-bold text-xs uppercase tracking-wider text-blue-800">Convocatória + Tabela Assin.</p>
              </div>

              <div className="mt-4 shrink-0 flex flex-col gap-2">
                {assembleia.convocatoria_pdf_url && (
                  <a href={assembleia.convocatoria_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-9 px-3 bg-white border border-border rounded-md hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors shadow-sm">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-sm font-semibold">Ver Convocatória + Tabela</span>
                  </a>
                )}
                <Button
                  size="sm"
                  disabled={assembleia.email_enviado_convocatoria || !assembleia.convocatoria_pdf_url || updateAssembleia.isPending}
                  onClick={handleNotificarConvocatoria}
                  className={cn("w-full gap-1.5 font-bold transition-all", assembleia.email_enviado_convocatoria ? "bg-green-100 text-green-700 opacity-100" : "bg-blue-600 hover:bg-blue-700 text-white")}
                >
                  {assembleia.email_enviado_convocatoria ? <><CheckCircle className="w-4 h-4" /> Convocatória Enviada</> : <><Mail className="w-4 h-4" /> Enviar Convocatória (E-MAIL)</>}
                </Button>
              </div>
            </div>

            {/* CARTÃO: ATA DA REUNIÃO */}
            <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex flex-col h-full">
              <div className="flex-1">
                <p className="font-bold text-xs uppercase tracking-wider text-amber-800">Ata da Reunião</p>
              </div>

              <div className="mt-4 shrink-0 flex flex-col gap-2">
                {assembleia.ata_pdf_url ? (
                  <a href={assembleia.ata_pdf_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 h-9 px-3 bg-white border border-border rounded-md hover:bg-amber-50 hover:text-amber-600 hover:border-amber-300 transition-colors shadow-sm">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-semibold">Ver Ata Final (PDF)</span>
                  </a>
                ) : (
                  <Button size="sm" variant="outline" className="h-9 border-amber-200 text-amber-700 hover:bg-amber-100 w-full font-semibold text-sm bg-white" onClick={() => onPrepararAta(assembleia)}>
                    <PenTool className="w-4 h-4 mr-1.5 text-amber-500" /> Preparar / Editar Ata
                  </Button>
                )}

                {assembleia.ata_pdf_url ? (
                  <Button
                    size="sm"
                    disabled={assembleia.email_enviado_ata || updateAssembleia.isPending}
                    onClick={handleNotificarAta}
                    className={cn("w-full gap-1.5 font-bold transition-all h-9", assembleia.email_enviado_ata ? "bg-green-100 text-green-700 opacity-100" : "bg-amber-600 hover:bg-amber-700 text-white")}
                  >
                    {assembleia.email_enviado_ata ? <><CheckCircle className="w-4 h-4" /> Ata Enviada</> : <><Mail className="w-4 h-4" /> Enviar Ata (E-MAIL)</>}
                  </Button>
                ) : (
                  <Button size="sm" disabled className="w-full h-9 opacity-50 bg-amber-200 text-amber-800 font-bold"><Mail className="w-4 h-4 mr-1.5" /> Aguarda Emissão Ata</Button>
                )}
              </div>
            </div>

          </div>
        </DialogContent>
      </Dialog>

      {/* POPUP DE CONFIRMAÇÃO DE ELIMINAÇÃO */}
      {showDeleteConfirm && (
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Confirmar Eliminação
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm text-foreground">Tem a certeza que deseja eliminar esta assembleia?</p>
              <p className="text-sm text-muted-foreground mt-2">Esta ação irá apagar a respetiva convocatória, a ata (incluindo rascunhos) e qualquer conteúdo associado. Também irá eliminar a convocatória do Portal do Condómino (se estiver atualmente publicada). <strong>Esta ação é irreversível.</strong></p>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => { setShowDeleteConfirm(false); onClose(); onDelete(assembleia.id); }}>Eliminar Definitivamente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ==============================================================================
// COMPONENTE: MODAL DE REDAÇÃO DA ATA (COM RASCUNHO)
// ==============================================================================
function PrepararAtaModal({ assembleia, onClose }) {
  const qc = useQueryClient();
  const [texto, setTexto] = useState(assembleia.ata_texto || '');

  const hasSavedSignatures = !!assembleia.assinaturas_url;
  const [anexarAssinaturas, setAnexarAssinaturas] = useState(hasSavedSignatures);
  const [assinaturasFile, setAssinaturasFile] = useState(hasSavedSignatures ? { name: 'Ficheiro de assinaturas gravado no sistema' } : null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const saveAta = useMutation({
    mutationFn: async (partialData) => await agenciaAvenida.entities.Assembleia.update(assembleia.id, partialData),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['assembleias'] });
      if (variables.estado === 'realizada') {
        toast.success('ATA FINAL GERADA E ANEXADA COM SUCESSO');
      } else {
        toast.success('RASCUNHO GUARDADO COM SUCESSO');
      }
      onClose(); // Navega de volta para o Preview
    },
    onError: (e) => toast.error('ERRO: ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const processAssinaturasUpload = async () => {
    if (!anexarAssinaturas) return '';
    if (assinaturasFile && assinaturasFile instanceof File) {
      toast.info('A CARREGAR ASSINATURAS...');
      const fileExt = assinaturasFile.name.split('.').pop();
      const fileName = `assinaturas-${assembleia.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('documentos').upload(`atas/${fileName}`, assinaturasFile);
      if (error) throw error;
      const { data } = supabase.storage.from('documentos').getPublicUrl(`atas/${fileName}`);
      return data.publicUrl;
    }
    return assembleia.assinaturas_url || '';
  };

  const handleGravarRascunho = async () => {
    setIsSavingDraft(true);
    try {
      const urlAssinaturas = await processAssinaturasUpload();
      saveAta.mutate({ ata_texto: texto, assinaturas_url: urlAssinaturas });
    } catch (error) {
      console.error(error);
      toast.error('FALHA AO GRAVAR RASCUNHO');
      setIsSavingDraft(false);
    }
  };

  const handleGerarAta = async () => {
    setIsGenerating(true);
    try {
      const urlAssinaturas = await processAssinaturasUpload();

      toast.info('A COMPILAR DOCUMENTO FINAL...');
      await new Promise(r => setTimeout(r, 1000)); // Delay falso para UI
      const dummyAtaPdf = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

      saveAta.mutate({
        ata_texto: texto,
        assinaturas_url: urlAssinaturas,
        ata_pdf_url: dummyAtaPdf,
        estado: 'realizada' // Conclui a assembleia
      });
    } catch (error) {
      console.error(error);
      toast.error('FALHA AO GERAR ATA FINAL');
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl z-[210]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PenTool className="w-5 h-5 text-primary" /> Redigir Ata da Assembleia</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl mb-2">
            <p>Pode <strong>gravar como rascunho</strong> em qualquer altura. Apenas quando clicar em "Compilar e Gerar Ata" o PDF oficial será criado e a assembleia passará ao estado "Realizada".</p>
          </div>

          <div>
            <Label>Texto da Ata</Label>
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-4 py-3 text-sm min-h-[300px] resize-y focus:border-primary focus:ring-1 focus:ring-primary outline-none"
              placeholder="Aos vinte dias do mês de..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
            />
          </div>

          <div className="border border-border rounded-xl p-4 bg-muted/20">
            <div className="flex items-center gap-2 mb-3">
              <input type="checkbox" id="anexar_ass" checked={anexarAssinaturas} onChange={e => setAnexarAssinaturas(e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
              <Label htmlFor="anexar_ass" className="font-bold cursor-pointer">Anexar folha de presenças / assinaturas digitalizada?</Label>
            </div>

            {anexarAssinaturas && (
              <div className="mt-3 pl-6">
                {!assinaturasFile ? (
                  <label className="flex flex-col items-center justify-center gap-2 cursor-pointer p-4 bg-background border-2 border-dashed border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm font-medium text-muted-foreground">Clique para selecionar PDF ou Imagem</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setAssinaturasFile(e.target.files[0])} className="hidden" />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3 border border-primary/50 bg-primary/5 rounded-lg">
                    <span className="text-sm font-semibold text-primary truncate flex items-center gap-2"><FileText className="w-4 h-4" />{assinaturasFile.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => setAssinaturasFile(null)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 px-2"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-border flex sm:justify-between items-center w-full gap-4 flex-col sm:flex-row">
          <div className="w-full sm:w-auto">
            <Button variant="outline" className="w-full" onClick={onClose} disabled={isGenerating || isSavingDraft}>Cancelar</Button>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={handleGravarRascunho} disabled={isGenerating || isSavingDraft} className="gap-2 font-semibold">
              {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              GRAVAR RASCUNHO
            </Button>
            <Button onClick={handleGerarAta} disabled={isGenerating || isSavingDraft || (anexarAssinaturas && !assinaturasFile) || !texto}>
              {isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> A GERAR PDF...</> : 'COMPILAR E GERAR ATA'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==============================================================================
// PÁGINA PRINCIPAL: ASSEMBLEIAS
// ==============================================================================
export default function Assembleias() {
  const qc = useQueryClient();

  const [view, setView] = useState('calendario');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [previewId, setPreviewId] = useState(null);
  const [ataProcId, setAtaProcId] = useState(null);

  const [search, setSearch] = useState('');
  const [triggerToday, setTriggerToday] = useState(0);

  // Combobox
  const [comboCond, setComboCond] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: assembleias = [], isLoading } = useQuery({
    queryKey: ['assembleias'],
    queryFn: () => agenciaAvenida.entities.Assembleia.list('-data')
  });

  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });

  const condominiosAtivos = condominios.filter(c => c && c.ativo !== false).sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));

  const save = useMutation({
    mutationFn: async (d) => {
      let payload = { ...d };
      if (payload.hora) payload.hora = payload.hora.substring(0, 5);
      if (payload.segunda_convocatoria_hora) payload.segunda_convocatoria_hora = payload.segunda_convocatoria_hora.substring(0, 5);

      if (editing) {
        return await agenciaAvenida.entities.Assembleia.update(editing.id, payload);
      } else {
        payload.convocatoria_pdf_url = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
        return await agenciaAvenida.entities.Assembleia.create(payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assembleias'] }); setOpen(false); toast.success('ASSEMBLEIA GUARDADA COM SUCESSO'); },
    onError: (e) => toast.error('ERRO AO GUARDAR: ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Assembleia.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assembleias'] }); toast.success('ASSEMBLEIA ELIMINADA COM SUCESSO'); },
    onError: (e) => toast.error('ERRO AO ELIMINAR: ' + (e?.message || 'ERRO DESCONHECIDO').toUpperCase())
  });

  const filtered = useMemo(() => assembleias.filter(a => {
    const matchSearch = !search || a.titulo?.toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  }), [assembleias, search]);

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const openNew = (dataSelecionada) => {
    // Se vier uma data do calendário, usa-a. Senão, usa a data de hoje.
    const dataInicial = (dataSelecionada && dataSelecionada instanceof Date)
      ? format(dataSelecionada, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');

    setForm({
      ...empty,
      data: dataInicial,
      segunda_convocatoria_data: dataInicial
    });
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (a) => {
    setForm({
      ...a,
      hora: a.hora?.substring(0, 5) || '',
      segunda_convocatoria_hora: a.segunda_convocatoria_hora?.substring(0, 5) || ''
    });
    setEditing(a);
    setOpen(true);
  };

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleDateChange = (newDate) => {
    upd('data', newDate);
    upd('segunda_convocatoria_data', newDate);
  };

  const handleTimeChange = (newHora) => {
    upd('hora', newHora);
    if (newHora && newHora.includes(':')) {
      const [h, m] = newHora.split(':').map(Number);
      const dateObj = new Date();
      dateObj.setHours(h, m + 30);
      const nextH = String(dateObj.getHours()).padStart(2, '0');
      const nextM = String(dateObj.getMinutes()).padStart(2, '0');
      upd('segunda_convocatoria_hora', `${nextH}:${nextM}`);
    }
  };

  const previewData = previewId ? assembleias.find(a => a.id === previewId) : null;
  const ataData = ataProcId ? assembleias.find(a => a.id === ataProcId) : null;

  return (
    <div>
      <PageHeader title="Assembleias" subtitle="Convocatórias, atas e calendário de reuniões." action={
        <div className="flex gap-2">
          {view === 'calendario' && (
            <Button variant="outline" onClick={() => setTriggerToday(prev => prev + 1)}>Hoje</Button>
          )}
          <div className="flex rounded-lg border border-border overflow-hidden bg-card">
            <button onClick={() => setView('calendario')} className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'calendario' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} title="Vista Calendário">
              <Calendar className="w-4 h-4" />
            </button>
            <button onClick={() => setView('lista')} className={`px-3 py-2 text-sm font-medium transition-colors ${view === 'lista' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`} title="Vista Lista">
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="w-4 h-4" />Nova Assembleia
          </Button>
        </div>
      } />

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-background w-full" placeholder="Pesquisar assembleia por título em toda a agência..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {view === 'calendario' ? (
        <CalendarioAssembleias
          assembleias={filtered}
          condominios={condominios}
          onClickAssembleia={(a) => setPreviewId(a.id)}
          onNew={openNew}
          triggerToday={triggerToday}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div
              key={a.id}
              className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer flex flex-col justify-between"
              onClick={() => setPreviewId(a.id)}
            >
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${estadoColors[a.estado] || 'bg-gray-100 text-gray-700'}`}>
                    {a.estado === 'agendada' ? 'Agendada' : a.estado === 'realizada' ? 'Realizada' : 'Cancelada'}
                  </span>
                  <span className="text-[10px] bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    {a.tipo}
                  </span>
                </div>

                <h3 className="font-bold text-foreground leading-tight">{a.titulo}</h3>
                <p className="text-xs font-medium text-muted-foreground mt-0.5 mb-4">{getCondName(a.condominio_id)}</p>
              </div>

              <div className="border-t border-border pt-4 mt-1">
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground mb-3">
                  <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{a.data ? format(new Date(a.data), 'dd/MM/yyyy') : '-'} às {a.hora?.substring(0, 5) || '--:--'}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {a.convocatoria_pdf_url && <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><FileText className="w-3 h-3" />Convocatória</span>}
                  {a.ata_pdf_url && <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" />Ata {a.ata_numero}</span>}
                  {a.portal_visivel && <span className="text-[10px] bg-green-50 text-green-600 border border-green-200 px-2 py-0.5 rounded-full font-bold">Público</span>}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-16 bg-card border border-dashed border-border rounded-xl text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma Assembleia Encontrada</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: PRÉ-VISUALIZAÇÃO */}
      {previewData && (
        <AssembleiaPreview
          assembleia={previewData}
          condNome={getCondName(previewData.condominio_id)}
          onClose={() => setPreviewId(null)}
          onEdit={(a) => { setPreviewId(null); openEdit(a); }}
          onDelete={(id) => { setPreviewId(null); del.mutate(id); }}
          onPrepararAta={(a) => { setPreviewId(null); setAtaProcId(a.id); }}
        />
      )}

      {/* MODAL: PREPARAR ATA */}
      {ataData && (
        <PrepararAtaModal
          assembleia={ataData}
          onClose={() => { setAtaProcId(null); setPreviewId(ataData.id); }}
        />
      )}

      {/* Dialog Criação/Edição */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" />{editing ? 'Editar Assembleia' : 'Nova Assembleia'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Condomínio *</Label>
                <Popover open={comboCond} onOpenChange={setComboCond}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={comboCond} className="w-full justify-between font-normal bg-background mt-1">
                      <span className="truncate">
                        {form.condominio_id ? condominiosAtivos.find(c => c.id === form.condominio_id)?.nome : "Selecione ou pesquise..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                    <Command>
                      <CommandInput placeholder="Pesquisar condomínio..." />
                      <CommandEmpty>Nenhum encontrado.</CommandEmpty>
                      <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                        {condominiosAtivos.map(c => (
                          <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { upd('condominio_id', c.id); setComboCond(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", form.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                            {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>} {c.nome}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Tipo de Assembleia</Label>
                <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="ordinaria">Ordinária</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Título / Assunto *</Label>
              <Input value={form.titulo || ''} onChange={e => upd('titulo', e.target.value)} placeholder="Ex: Assembleia Geral Ordinária 2026" className="mt-1 bg-background" />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-muted/30 p-3 rounded-lg border border-border">
              <div>
                <Label>Data (1ª Convocatória) *</Label>
                <Input type="date" value={form.data || ''} onChange={e => handleDateChange(e.target.value)} className="mt-1 bg-background" />
              </div>
              <div>
                <Label>Hora (1ª Convocatória) *</Label>
                <Input type="time" value={form.hora || ''} onChange={e => handleTimeChange(e.target.value)} className="mt-1 bg-background" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 opacity-70 pointer-events-none">
              <div>
                <Label>Data (2ª Convocatória)</Label>
                <Input type="date" value={form.segunda_convocatoria_data || ''} readOnly className="mt-1 bg-muted" />
              </div>
              <div>
                <Label>Hora (2ª Convocatória)</Label>
                <Input type="time" value={form.segunda_convocatoria_hora || ''} readOnly className="mt-1 bg-muted" />
              </div>
              <p className="col-span-2 text-[10px] text-muted-foreground -mt-2">A 2ª convocatória é preenchida automaticamente (mesmo dia, 30 minutos depois).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Local da Reunião</Label>
                <Select value={form.local} onValueChange={v => upd('local', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="Instalações Agência Avenida">Instalações Agência Avenida</SelectItem>
                    <SelectItem value="Hall do Prédio">Hall do Prédio</SelectItem>
                    <SelectItem value="Outro (Especificar nas Notas)">Outro (Especificar nas Notas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <Label>Estado Atual</Label>
                <Select value={form.estado} onValueChange={v => upd('estado', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="realizada">Realizada / Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-7">
                <input type="checkbox" id="publico" checked={form.portal_visivel} onChange={e => upd('portal_visivel', e.target.checked)} className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer" />
                <Label htmlFor="publico" className="cursor-pointer">Visível no portal dos condóminos</Label>
              </div>
            </div>

            <div>
              <Label>Notas Internas (Privado)</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" placeholder="Anotações para a equipa..." value={form.notas || ''} onChange={e => upd('notas', e.target.value)} />
            </div>

          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!form.condominio_id) { toast.error('SELECIONE O CONDOMÍNIO'); return; }
                if (!form.titulo) { toast.error('O TÍTULO É OBRIGATÓRIO'); return; }
                if (!form.data || !form.hora) { toast.error('A DATA E HORA DA 1ª CONVOCATÓRIA SÃO OBRIGATÓRIAS'); return; }
                save.mutate(form);
              }}
              disabled={save.isPending}
            >{save.isPending ? 'A GUARDAR...' : 'GUARDAR ASSEMBLEIA'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}