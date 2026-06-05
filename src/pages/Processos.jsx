import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { supabase } from '@/api/supabase.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Pencil, Search, Trash2, Printer, X, FileText, CheckCircle2, Circle, Check, ChevronsUpDown, Paperclip, ExternalLink, UploadCloud, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// --- DICIONÁRIOS E CONSTANTES DOS PROCESSOS ---
const tipoProcessoLabel = { renovacao_conducao: 'Renovação Carta Condução', renovacao_cacador: 'Renovação Carta Caçador', irs: 'IRS', legalizacao_automovel: 'Legalização Automóvel', certidao: 'Certidão', contrato_arrendamento: 'Contrato Arrendamento', outro: 'Outro Serviço' };
const estadoLabel = { pendente_inicio: 'Pendente Início', em_curso: 'Em Curso', pendente_cliente: 'Pendente Cliente', aguarda_documentos: 'Aguarda Documentos', pendente_entidade_externa: 'Pendente Entidade Externa', pendente_agencia: 'Pendente Agência Avenida', concluido: 'Concluído', cancelado: 'Cancelado' };
const estadoColor = { pendente_inicio: 'bg-gray-100 text-gray-700 border border-gray-200', pendente_cliente: 'bg-gray-100 text-gray-700 border border-gray-200', aguarda_documentos: 'bg-gray-100 text-gray-700 border border-gray-200', pendente_entidade_externa: 'bg-gray-100 text-gray-700 border border-gray-200', cancelado: 'bg-gray-100 text-gray-700 border border-gray-200', em_curso: 'bg-blue-100 text-blue-700 border border-blue-200', pendente_agencia: 'bg-red-100 text-red-700 border border-red-200', concluido: 'bg-emerald-100 text-emerald-700 border border-emerald-200' };
const prioridadeColor = { normal: 'bg-blue-50 text-blue-600', urgente: 'bg-red-100 text-red-700 border border-red-200 shadow-sm' };
const irsEstadoLabel = { recebida_documentacao: 'Recebida Documentação', submetido_at: 'Submetido AT (Prova Entrega)', comprovativo_irs: 'Comprovativo IRS', submetida_declaracao_substituicao: 'Submetida Declaração Substituição' };

const empty = { tipo: 'renovacao_conducao', pessoa_id: '', descricao: '', estado: 'pendente_inicio', prioridade: 'normal', custo_servico: 0, pago: false, irs_campos: {}, irs_estado: 'recebida_documentacao', documentos: [], notas: '' };
const emptyClient = { nome: '', nif: '', telefone: '', email: '', tipo: ['cliente'] };

const IRS_ANEXOS = [
  { id: 'anexo_a', label: 'Anexo A (Trabalho Dependente)' }, { id: 'anexo_b', label: 'Anexo B (Trabalho Independente)' }, { id: 'anexo_f', label: 'Anexo F (Rendas)' }, { id: 'anexo_g', label: 'Anexo G (Mais-Valias)' }, { id: 'anexo_h', label: 'Anexo H (Benefícios Fiscais)' }, { id: 'incapacidade', label: 'Incapacidade' }, { id: 'solteiro_1', label: 'Solteiro 1 Titular' }, { id: 'solteiro_2', label: 'Solteiro 2 Titulares' }, { id: 'casado', label: 'Casado' }, { id: 'irs_jovem', label: 'IRS Jovem' }, { id: 'declaracao_substituicao', label: 'Declaração Substituição' },
];

const normalizeJsonb = (data, fallback = {}) => {
  if (!data) return fallback;
  if (typeof data === 'object') return data;
  if (typeof data === 'string') { try { return JSON.parse(data); } catch (e) { return fallback; } }
  return fallback;
};

// --- DICIONÁRIOS E ASPIRADOR DA FICHA DE CLIENTE ---
const pessoaTipoLabel = { condomino: 'Condómino', fornecedor: 'Fornecedor', cliente: 'Cliente', advogado: 'Advogado', banco: 'Banco' };
const pessoaTipoColor = { condomino: 'bg-blue-100 text-blue-700', fornecedor: 'bg-purple-100 text-purple-700', cliente: 'bg-orange-100 text-orange-700', advogado: 'bg-indigo-100 text-indigo-700', banco: 'bg-emerald-100 text-emerald-700' };

const normalizeTipoPessoa = (tipoData) => {
  if (!tipoData) return [];
  let parsedArray = [];
  if (Array.isArray(tipoData)) { parsedArray = tipoData; } 
  else if (typeof tipoData === 'string') {
    try { const parsed = JSON.parse(tipoData); parsedArray = Array.isArray(parsed) ? parsed : [tipoData]; } 
    catch (e) { parsedArray = tipoData.startsWith('{') && tipoData.endsWith('}') ? tipoData.slice(1, -1).split(',') : (tipoData.includes(',') ? tipoData.split(',') : [tipoData]); }
  }
  let finalArray = [];
  parsedArray.forEach(item => {
    if (typeof item === 'string') {
      let clean = item.trim().replace(/^"|"$/g, '');
      if (clean.startsWith('[') && clean.endsWith(']')) { try { const innerParsed = JSON.parse(clean); if (Array.isArray(innerParsed)) { finalArray.push(...innerParsed); return; } } catch(e) {} }
      clean = clean.replace(/"/g, '').trim();
      if (clean.includes(',')) finalArray.push(...clean.split(',').map(s => s.trim()));
      else if (clean) finalArray.push(clean);
    } else if (item) finalArray.push(item);
  });
  return [...new Set(finalArray)].filter(Boolean);
};

// --- COMPONENTE: MODAL DA FICHA DO CLIENTE ---
function FichaClienteModal({ pessoa, onClose }) {
  const tiposArray = normalizeTipoPessoa(pessoa.tipo);
  const isCliente = tiposArray.includes('cliente');
  const [showSenha, setShowSenha] = useState(false);

  useEffect(() => {
    let timer;
    if (showSenha) timer = setTimeout(() => setShowSenha(false), 10000);
    return () => clearTimeout(timer);
  }, [showSenha]);

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="font-bold text-lg">Ficha de Entidade</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
              {pessoa.nome?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold line-clamp-1">{pessoa.nome}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {tiposArray.length > 0 ? tiposArray.map(t => (
                  <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${pessoaTipoColor[t] || 'bg-gray-100 text-gray-700'}`}>
                    {pessoaTipoLabel[t] || t}
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

// --- COMPONENTE: PRÉ-VISUALIZAÇÃO DO PROCESSO ---
function ProcessoPreview({ processo, pessoa, onClose, onEdit, onQuickAction, onUpdateIrsEstado }) {
  const [showFichaCliente, setShowFichaCliente] = useState(false);
  const irs = normalizeJsonb(processo.irs_campos);
  const docs = normalizeJsonb(processo.documentos, []);
  const isIRS = processo.tipo === 'irs';
  const isOutro = processo.tipo === 'outro';
  const tituloProcesso = isOutro && processo.descricao ? processo.descricao : (tipoProcessoLabel[processo.tipo] || processo.tipo);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b print:hidden">
          <h2 className="font-bold text-lg">Detalhes do Processo</h2>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground border rounded-md px-2 py-1">
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button onClick={() => { onClose(); onEdit(processo); }} className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 border border-primary rounded-md px-2 py-1">
              <Pencil className="w-4 h-4" /> Editar
            </button>
            <button onClick={onClose} className="p-1 hover:bg-muted rounded"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4 print:py-8 max-h-[80vh] overflow-y-auto">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${estadoColor[processo.estado] || 'bg-gray-100 text-gray-700'}`}>
                {estadoLabel[processo.estado] || processo.estado}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${prioridadeColor[processo.prioridade]}`}>
                {processo.prioridade}
              </span>
            </div>
            <h3 className="text-xl font-bold">{tituloProcesso}</h3>
            {!isOutro && processo.descricao && <p className="text-muted-foreground text-sm mt-1">{processo.descricao}</p>}
          </div>

          <div className="bg-muted/30 p-3 rounded-lg border text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Cliente:</span>
              <button 
                onClick={() => setShowFichaCliente(true)} 
                className="font-semibold text-primary hover:underline hover:text-primary/80 transition-colors"
                title="Abrir ficha do cliente"
              >
                {pessoa?.nome || 'Desconhecido'}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-medium">Pagamento:</span>
              {processo.pago ? (
                <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded"><CheckCircle2 className="w-3.5 h-3.5"/> PAGO</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded"><Circle className="w-3.5 h-3.5"/> POR PAGAR</span>
              )}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t border-border/50">
              <span className="text-muted-foreground font-medium">Custo do Serviço:</span>
              <span className="font-semibold text-lg">{Number(processo.custo_servico || 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
            </div>
          </div>

          {isIRS && (
            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-3 bg-blue-50/50 p-2 rounded border border-blue-100">
                <p className="font-semibold text-sm flex items-center gap-2 text-blue-900"><FileText className="w-4 h-4"/> Estado do IRS</p>
                <Select value={processo.irs_estado || 'recebida_documentacao'} onValueChange={(val) => onUpdateIrsEstado(val, processo.id)}>
                  <SelectTrigger className="w-auto h-8 text-xs font-semibold bg-white text-blue-800 border-blue-200 focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(irsEstadoLabel).map(([key, label]) => (
                      <SelectItem key={key} value={key} className="text-xs font-medium">{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {Object.keys(irs).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2">
                  {IRS_ANEXOS.map(anexo => irs[anexo.id] && (
                    <div key={anexo.id} className="text-sm flex items-center gap-2 text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" /> <span className="truncate">{anexo.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic mt-2">Nenhum atributo selecionado.</p>
              )}
            </div>
          )}

          {docs.length > 0 && (
            <div className="border-t pt-3">
              <p className="font-semibold text-sm mb-2 flex items-center gap-2"><Paperclip className="w-4 h-4"/> Documentos Anexos</p>
              <div className="space-y-1.5">
                {docs.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/20 p-2.5 rounded-lg border border-border/50 text-sm hover:bg-muted/40 transition-colors">
                    <span className="font-medium truncate pr-2">{doc.nome}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-500 hover:text-blue-700 font-medium flex-shrink-0 bg-blue-50 px-2 py-1 rounded">
                        <ExternalLink className="w-3.5 h-3.5" /> Abrir Documento
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {processo.notas && (
            <div className="border-t pt-3">
              <p className="font-semibold text-sm mb-1 text-muted-foreground">Notas Internas</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{processo.notas}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t print:hidden">
            {!processo.pago && (
              <Button variant="outline" className="flex-1 min-w-[140px] gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" onClick={() => onQuickAction('pagar', processo)}>
                <CheckCircle2 className="w-4 h-4" /> Marcar como Pago
              </Button>
            )}
            {processo.estado !== 'concluido' && (
              <Button variant="outline" className="flex-1 min-w-[140px] gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200" onClick={() => onQuickAction('concluir', processo)}>
                <CheckCircle2 className="w-4 h-4" /> Concluir Processo
              </Button>
            )}
          </div>
          
        </div>
      </div>
      
      {/* O nosso Modal Secundário empilhado (Z-index superior) */}
      {showFichaCliente && pessoa && (
        <FichaClienteModal pessoa={pessoa} onClose={() => setShowFichaCliente(false)} />
      )}
    </div>
  );
}

export default function Processos() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState(null);
  
  const [openCombo, setOpenCombo] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientForm, setNewClientForm] = useState(emptyClient);

  const [uploadingDoc, setUploadingDoc] = useState(false);

  const { data: processos = [], isLoading: loadProc } = useQuery({ queryKey: ['processos'], queryFn: () => agenciaAvenida.entities.Processo.list() });
  const { data: pessoas = [], isLoading: loadPes } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (data) => {
      const dataToSave = { ...data };
      if (dataToSave.tipo !== 'outro') dataToSave.descricao = '';
      if (dataToSave.tipo !== 'irs') { dataToSave.irs_campos = {}; dataToSave.irs_estado = null; }
      return editing ? agenciaAvenida.entities.Processo.update(editing, dataToSave) : agenciaAvenida.entities.Processo.create(dataToSave);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos'] }); setOpen(false); toast.success('Processo guardado com sucesso!'); },
  });

  const quickUpdate = useMutation({
    mutationFn: ({ id, payload }) => agenciaAvenida.entities.Processo.update(id, payload),
    onSuccess: (updatedData) => { 
      qc.invalidateQueries({ queryKey: ['processos'] }); 
      if (preview && preview.id === updatedData.id) setPreview(updatedData); else setPreview(null); 
      toast.success('Atualizado com sucesso!'); 
    },
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Processo.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos'] }); toast.success('Processo eliminado!'); },
  });

  const saveClient = useMutation({
    mutationFn: (data) => agenciaAvenida.entities.Pessoa.create(data),
    onSuccess: (createdClient) => { 
      qc.invalidateQueries({ queryKey: ['pessoas'] }); 
      setShowNewClient(false); 
      upd('pessoa_id', createdClient.id);
      toast.success('Cliente criado e selecionado!'); 
    },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (p) => { 
    setForm({ ...p, irs_campos: normalizeJsonb(p.irs_campos, {}), documentos: normalizeJsonb(p.documentos, []), irs_estado: p.irs_estado || 'recebida_documentacao' }); 
    setEditing(p.id); 
    setOpen(true); 
  };
  
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const toggleIrsCampo = (campoId) => {
    setForm(prev => {
      const atuais = normalizeJsonb(prev.irs_campos, {});
      return { ...prev, irs_campos: { ...atuais, [campoId]: !atuais[campoId] } };
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`; // Sem espaços, seguro para o Supabase

      const { error } = await supabase.storage.from('documentos').upload(filePath, file);
      if (error) throw error;

      const { data } = supabase.storage.from('documentos').getPublicUrl(filePath);

      const documentToAdd = { nome: file.name, url: data.publicUrl };
      const atuais = normalizeJsonb(form.documentos, []);
      upd('documentos', [...atuais, documentToAdd]);
      
      toast.success('Ficheiro anexado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar ficheiro. Verificou as permissões do Storage no Supabase?');
    } finally {
      setUploadingDoc(false);
      e.target.value = null; 
    }
  };

  // A MÁGICA DE APAGAR DO DISCO RÍGIDO DO SUPABASE
  const removeDocumento = async (indexToRemove) => {
    const atuais = normalizeJsonb(form.documentos, []);
    const docToRemove = atuais[indexToRemove];

    // Se o documento tiver um URL válido, vamos tentar apagá-lo do Storage primeiro
    if (docToRemove && docToRemove.url) {
      try {
        // Ex: https://xxx.supabase.co/storage/v1/object/public/documentos/1715000000_abc.pdf
        const urlParts = docToRemove.url.split('/documentos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1]; // Apanha só o "1715000000_abc.pdf"
          const { error } = await supabase.storage.from('documentos').remove([filePath]);
          if (error) {
            console.error("Erro interno ao apagar do Supabase Storage:", error);
          }
        }
      } catch (err) {
        console.error("Erro no processo de eliminação física:", err);
      }
    }

    // Mesmo que dê erro físico (ex: ficheiro já não existia), apagamos visualmente da lista do processo
    upd('documentos', atuais.filter((_, idx) => idx !== indexToRemove));
    toast.success('Documento eliminado com sucesso!');
  };

  const filtered = processos.filter(p => {
    const pessoa = pessoas.find(pes => pes.id === p.pessoa_id);
    const textSearch = search.toLowerCase();
    const tipoLabel = tipoProcessoLabel[p.tipo]?.toLowerCase() || p.tipo?.toLowerCase();
    return !search || p.descricao?.toLowerCase().includes(textSearch) || tipoLabel.includes(textSearch) || pessoa?.nome?.toLowerCase().includes(textSearch);
  });

  return (
    <div>
      <PageHeader title="Processos & Serviços" subtitle="Gestão de IRS, Renovações de Carta & Outros" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Novo Processo</Button>
      } />

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar por cliente ou processo..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {(loadProc || loadPes) && <div className="text-center py-16 text-muted-foreground">A carregar processos...</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(p => {
          const pessoa = pessoas.find(pes => pes.id === p.pessoa_id);
          const isOutro = p.tipo === 'outro';
          const isUrgente = p.prioridade === 'urgente';
          const tituloProcesso = isOutro && p.descricao ? p.descricao : (tipoProcessoLabel[p.tipo] || p.tipo);

          return (
            <div 
              key={p.id} 
              className={`rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative group flex flex-col h-full ${
                isUrgente ? 'border-red-400 bg-red-50/30' : 'bg-card border-border'
              }`}
              onClick={() => setPreview(p)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex flex-col pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${estadoColor[p.estado] || 'bg-gray-100 text-gray-700'}`}>
                      {estadoLabel[p.estado] || p.estado}
                    </span>
                    <span className={`w-fit text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${prioridadeColor[p.prioridade]}`}>
                      {p.prioridade}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {tituloProcesso}
                  </h3>
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-muted rounded transition-colors bg-white/50" title="Editar"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                  <button onClick={() => del.mutate(p.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors bg-white/50" title="Apagar"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                </div>
              </div>
              
              {!isOutro && p.descricao && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.descricao}</p>}
              
              <div className="mt-auto space-y-1.5 pt-4 border-t border-border/50 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="font-medium truncate max-w-[150px]">{pessoa?.nome || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pagamento:</span>
                  {p.pago ? (
                     <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> Pago</span>
                  ) : (
                     <span className="text-red-500 font-bold flex items-center gap-1"><Circle className="w-3.5 h-3.5"/> Pendente</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && !loadProc && (
          <div className="col-span-full text-center py-16 text-muted-foreground">Nenhum processo encontrado</div>
        )}
      </div>

      {preview && <ProcessoPreview 
        processo={preview} 
        pessoa={pessoas.find(pes => pes.id === preview.pessoa_id)} 
        onClose={() => setPreview(null)} 
        onEdit={(p) => { setPreview(null); openEdit(p); }} 
        onQuickAction={(action, proc) => {
          if (action === 'pagar') { quickUpdate.mutate({ id: proc.id, payload: { pago: true } }); }
          if (action === 'concluir') { quickUpdate.mutate({ id: proc.id, payload: { estado: 'concluido' } }); }
        }}
        onUpdateIrsEstado={(newEstado, id) => {
          quickUpdate.mutate({ id, payload: { irs_estado: newEstado } });
        }}
      />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Processo' : 'Novo Processo'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label>Cliente *</Label>
              <Popover open={openCombo} onOpenChange={setOpenCombo}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={openCombo} className="w-full justify-between font-normal bg-background">
                    {form.pessoa_id ? pessoas.find((p) => p.id === form.pessoa_id)?.nome : "Selecione ou pesquise um cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar por nome ou NIF..." />
                    <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">Cliente não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto">
                      {pessoas.map((pes) => (
                        <CommandItem key={pes.id} value={`${pes.nome} ${pes.nif || ''}`} onSelect={() => { upd('pessoa_id', pes.id); setOpenCombo(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.pessoa_id === pes.id ? "opacity-100" : "opacity-0")} />
                          {pes.nome} {pes.nif && <span className="text-muted-foreground ml-1">(NIF: {pes.nif})</span>}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <div className="p-2 border-t border-border">
                      <Button variant="secondary" className="w-full justify-start text-primary font-medium" onClick={() => { setOpenCombo(false); setNewClientForm(emptyClient); setShowNewClient(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Criar Novo Cliente
                      </Button>
                    </div>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Tipo de Processo *</Label>
              <Select value={form.tipo || ''} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(tipoProcessoLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Estado *</Label>
              <Select value={form.estado || ''} onValueChange={v => upd('estado', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(estadoLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {form.tipo === 'outro' && (
              <div className="sm:col-span-2">
                <Label>Nome / Descrição do Serviço *</Label>
                <Input className="mt-1" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
              </div>
            )}

            {form.tipo === 'irs' && (
              <div className="sm:col-span-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100 mt-2 space-y-4">
                <div>
                  <Label className="text-base font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5"/> Atributos IRS
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {IRS_ANEXOS.map((anexo) => (
                      <div key={anexo.id} className="flex items-center space-x-2">
                        <Checkbox id={`irs-${anexo.id}`} checked={normalizeJsonb(form.irs_campos, {})[anexo.id] === true} onCheckedChange={() => toggleIrsCampo(anexo.id)} />
                        <label htmlFor={`irs-${anexo.id}`} className="text-sm font-medium leading-none cursor-pointer">{anexo.label}</label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-blue-200 pt-3">
                  <Label className="text-blue-900 font-semibold">Estado do IRS</Label>
                  <Select value={form.irs_estado || 'recebida_documentacao'} onValueChange={v => upd('irs_estado', v)}>
                    <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Selecione o estado do IRS" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(irsEstadoLabel).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade || ''} onValueChange={v => upd('prioridade', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Custo do Serviço (€)</Label>
              <Input type="number" min="0" step="0.01" className="mt-1" value={form.custo_servico || 0} onChange={e => upd('custo_servico', parseFloat(e.target.value))} />
            </div>

            <div className="sm:col-span-2 bg-muted/30 p-4 rounded-lg border flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Estado do Pagamento</Label>
                <p className="text-sm text-muted-foreground">Marque se o cliente já efetuou o pagamento do serviço.</p>
              </div>
              <Checkbox checked={form.pago} onCheckedChange={(c) => upd('pago', c)} className="w-6 h-6 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500" />
            </div>

            <div className="sm:col-span-2">
              <Label>Notas Internas</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" value={form.notas || ''} onChange={e => upd('notas', e.target.value)} />
            </div>

            <div className="sm:col-span-2 border-t pt-4 mt-2">
              <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                <Paperclip className="w-4 h-4"/> Documentos Anexos
              </Label>
              
              <div className="space-y-2 mb-4">
                {normalizeJsonb(form.documentos, []).length === 0 ? (
                  <p className="text-sm text-muted-foreground bg-muted/20 p-3 rounded text-center border border-dashed">
                    Nenhum ficheiro anexado a este processo.
                  </p>
                ) : (
                  normalizeJsonb(form.documentos, []).map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                      <div className="min-w-0 pr-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span className="text-sm font-semibold truncate text-emerald-800">{doc.nome}</span>
                      </div>
                      <button type="button" onClick={() => removeDocumento(idx)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-colors flex-shrink-0" title="Apagar Ficheiro">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="bg-card p-3 rounded-lg border shadow-sm border-dashed hover:border-primary/50 transition-colors">
                <div className="w-full relative flex items-center justify-center">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center justify-center w-full cursor-pointer py-3 rounded-md transition-colors hover:text-primary">
                    <UploadCloud className="w-5 h-5 mr-2" />
                    {uploadingDoc ? <span className="animate-pulse text-blue-500 font-bold">A carregar para o sistema...</span> : 'Clique para escolher um ficheiro do PC'}
                    <Input 
                      type="file" 
                      accept=".pdf,image/*"
                      onChange={handleFileUpload}
                      disabled={uploadingDoc}
                      className="hidden"
                    />
                  </Label>
                </div>
              </div>
            </div>
            
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending || !form.pessoa_id}>
              {save.isPending ? 'A guardar...' : 'Guardar Processo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNewClient} onOpenChange={setShowNewClient}>
        <DialogContent className="max-w-sm z-[60]">
          <DialogHeader>
            <DialogTitle>Novo Cliente Rápido</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 mt-2">
            <div>
              <Label>Nome *</Label>
              <Input value={newClientForm.nome} onChange={e => setNewClientForm({...newClientForm, nome: e.target.value})} autoFocus />
            </div>
            <div>
              <Label>NIF</Label>
              <Input value={newClientForm.nif} onChange={e => setNewClientForm({...newClientForm, nif: e.target.value})} />
            </div>
            <div>
              <Label>Telemóvel</Label>
              <Input value={newClientForm.telefone} onChange={e => setNewClientForm({...newClientForm, telefone: e.target.value})} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={newClientForm.email} onChange={e => setNewClientForm({...newClientForm, email: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowNewClient(false)}>Cancelar</Button>
            <Button onClick={() => saveClient.mutate(newClientForm)} disabled={saveClient.isPending || !newClientForm.nome}>
              {saveClient.isPending ? 'A criar...' : 'Criar e Selecionar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}