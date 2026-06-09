import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Plus, Search, AlertTriangle, Pencil, Trash2, Upload, X, Printer, Check, ChevronsUpDown, Send, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/api/supabase.js';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const tiposOcorrencia = {
  avaria: 'Avaria',
  manutencao: 'Manutenção',
  limpeza: 'Limpeza',
  seguranca: 'Segurança',
  duvidas_faturacao: 'Dúvidas Faturação'
};

const empty = {
  condominio_id: '', fracao_id: '', titulo: '', descricao: '', tipo: 'avaria',
  prioridade: 'normal', estado: 'aberta', canal_submissao: 'interno',
  data_abertura: format(new Date(), 'yyyy-MM-dd'), observacoes: '',
  resposta_cliente: '', atribuido_a: '', fornecedor_id: '', reportada_por: null, anexos: []
};

// O fluxo de estados agora é apenas Aberta -> Em Progresso -> Resolvida
const estadoFlow = { aberta: 'em_progresso', em_progresso: 'resolvida' };
const estadoNext = { aberta: 'Iniciar', em_progresso: 'Resolver' };

const normalizeTipoPessoa = (tipoData) => {
  if (!tipoData) return [];
  let parsedArray = [];
  if (Array.isArray(tipoData)) parsedArray = tipoData;
  else if (typeof tipoData === 'string') {
    try { const parsed = JSON.parse(tipoData); parsedArray = Array.isArray(parsed) ? parsed : [tipoData]; }
    catch (e) {
      const cleanStr = tipoData.trim().replace(/^\{|\}$/g, '');
      parsedArray = cleanStr.includes(',') ? cleanStr.split(',') : [cleanStr];
    }
  }
  let finalArray = [];
  parsedArray.forEach(item => {
    if (item === null || item === undefined) return;
    if (typeof item === 'string') {
      let clean = item.trim().replace(/^"|"$/g, '');
      if (clean.startsWith('[') && clean.endsWith(']')) { try { const innerParsed = JSON.parse(clean); if (Array.isArray(innerParsed)) { finalArray.push(...innerParsed); return; } } catch (e) { } }
      clean = clean.replace(/"/g, '').trim();
      if (clean.includes(',')) finalArray.push(...clean.split(',').map(s => s.trim()));
      else if (clean) finalArray.push(clean);
    } else finalArray.push(String(item));
  });
  return [...new Set(finalArray)].map(t => String(t).toLowerCase());
};

const formatFracao = (f) => {
  if (!f) return 'Área Comum';
  return `${f.codigo_fracao || f.codigo || ''} ${f.descricao_piso_lado ? `(${f.descricao_piso_lado})` : ''}`.trim() || 'Área Comum';
};

function OcorrenciaPreview({ ocorrencia, condominios, fracoes, pessoas, users, onClose, onEdit }) {
  // Estado para controlar o modal central de contacto
  const [showPessoa, setShowPessoa] = useState(null);

  const pessoaMemory = useRef(null);
  if (showPessoa) pessoaMemory.current = showPessoa;
  const pessoaParaMostrar = showPessoa || pessoaMemory.current;
  const condNome = condominios.find(c => c.id === ocorrencia.condominio_id)?.nome || '-';
  const fracaoCod = formatFracao(fracoes.find(f => f.id === ocorrencia.fracao_id));
  const atribuidoUser = users?.find(u => u.id === ocorrencia.atribuido_a);
  const atribuido = atribuidoUser ? (atribuidoUser.full_name || atribuidoUser.email) : '-';
  const fornecedor = pessoas.find(p => p.id === ocorrencia.fornecedor_id)?.nome || '-';
  const reportadaPorObj = pessoas.find(p => p.id === ocorrencia.reportada_por);

  const qc = useQueryClient();
  const [notas, setNotas] = useState(ocorrencia.observacoes || '');

  const saveNotas = useMutation({
    mutationFn: (novasNotas) => agenciaAvenida.entities.Ocorrencia.update(ocorrencia.id, { observacoes: novasNotas }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ocorrencias'] });
      toast.success('NOTAS INTERNAS ATUALIZADAS');
      onClose();
    }
  });

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-2xl min-h-[55vh] max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl">
          <div className="flex items-start justify-between mb-4 print:hidden pr-8">
            <div>
              <h2 className="text-xl font-bold">{ocorrencia.titulo}</h2>
              <p className="text-sm text-muted-foreground">{condNome} · {fracaoCod}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" />Imprimir
              </Button>
              <Button size="sm" onClick={onEdit} className="gap-1">
                <Pencil className="w-3.5 h-3.5" />Editar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 bg-muted/40 border border-border rounded-lg p-4 mb-6 text-sm">
            <div><span className="font-medium text-muted-foreground">Estado:</span> <StatusBadge status={ocorrencia.estado} /></div>
            <div><span className="font-medium text-muted-foreground">Prioridade:</span> <StatusBadge status={ocorrencia.prioridade} /></div>
            <div><span className="font-medium text-muted-foreground">Tipo:</span> <span className="font-semibold">{tiposOcorrencia[ocorrencia.tipo] || ocorrencia.tipo}</span></div>
            <div><span className="font-medium text-muted-foreground">Canal:</span> <span className="capitalize font-semibold">{ocorrencia.canal_submissao?.replace('_', ' ')}</span></div>
            <div><span className="font-medium text-muted-foreground">Data abertura:</span> <span className="font-semibold">{ocorrencia.data_abertura}</span></div>
            {ocorrencia.data_resolucao && <div><span className="font-medium text-muted-foreground">Data resolução:</span> <span className="font-semibold">{ocorrencia.data_resolucao}</span></div>}

            <div className="flex items-center">
              <span className="font-medium text-muted-foreground mr-2">Reportada por:</span>
              {reportadaPorObj ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPessoa(reportadaPorObj); }}
                  className="text-primary hover:underline text-xs font-semibold whitespace-nowrap bg-primary/5 px-2 py-0.5 rounded"
                >
                  {reportadaPorObj.nome}
                </button>
              ) : (
                <span className="text-muted-foreground text-xs italic">
                  Interno
                </span>
              )}
            </div>

            {ocorrencia.atribuido_a && <div><span className="font-medium text-muted-foreground">Staff Atribuído:</span> <span className="font-semibold">{atribuido}</span></div>}
            {ocorrencia.fornecedor_id && <div><span className="font-medium text-muted-foreground">Fornecedor:</span> <span className="font-semibold">{fornecedor}</span></div>}
          </div>
          {ocorrencia.descricao && (
            <div className="mb-4 bg-background border border-border rounded-lg p-3 shadow-sm">
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-1">Descrição do Problema</p>
              <p className="text-sm text-foreground">{ocorrencia.descricao}</p>
            </div>
          )}

          <div className="mb-4 bg-muted/10 border border-border rounded-lg p-3">
            <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Observações Internas</p>
            <textarea
              className="w-full text-sm text-foreground bg-background p-2 rounded-md border border-dashed border-input min-h-[80px] resize-y focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all mb-2"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Escreva ou edite anotações exclusivas para a equipa..."
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full bg-muted hover:bg-muted-foreground/20 text-muted-foreground font-semibold transition-colors"
              onClick={() => saveNotas.mutate(notas)}
              disabled={saveNotas.isPending || notas === ocorrencia.observacoes}
            >
              {saveNotas.isPending ? 'A gravar...' : 'Guardar Notas'}
            </Button>
          </div>

          {ocorrencia.resposta_cliente && (
            <div className="mb-4 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="font-bold text-xs uppercase tracking-wider text-blue-800 mb-1">Resposta enviada ao Condómino</p>
              <p className="text-sm text-blue-900">{ocorrencia.resposta_cliente}</p>
            </div>
          )}
          {ocorrencia.anexos?.length > 0 && (
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2">Anexos / Provas</p>
              <div className="flex flex-col gap-2">
                {ocorrencia.anexos.map((url, i) => {
                  const fileNameRaw = url.split('/').pop();
                  const displayFileName = decodeURIComponent(fileNameRaw.substring(fileNameRaw.indexOf('-') + 1)) || `Anexo ${i + 1}`;
                  const isPdf = url.toLowerCase().endsWith('.pdf');

                  return (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      {isPdf ? <FileText className="w-8 h-8 text-red-500 shrink-0" /> : <img src={url} alt="" className="w-8 h-8 object-cover rounded shrink-0 border border-border" />}
                      <span className="text-sm font-medium text-primary hover:underline truncate">{displayFileName}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL CENTRAL DE DETALHES DA PESSOA (Sobreposto) */}
      <Dialog open={showPessoa !== null} onOpenChange={(open) => !open && setShowPessoa(null)}>
        <DialogContent
          className="max-w-sm z-[250] no-scrollbar"
          overlayClassName="z-[240] bg-black/60"
        >
          {pessoaParaMostrar && (
            <>
              <DialogHeader>
                <DialogTitle>Dados de Contacto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Nome</p>
                  <p className="font-bold text-foreground text-lg">{pessoaParaMostrar.nome}</p>
                </div>
                {pessoaParaMostrar.telefone && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Telefone</p>
                    <p className="text-foreground">{pessoaParaMostrar.telefone}</p>
                  </div>
                )}
                {pessoaParaMostrar.email && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Email</p>
                    <p className="text-foreground">{pessoaParaMostrar.email}</p>
                  </div>
                )}
                {pessoaParaMostrar.nif && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">NIF</p>
                    <p className="text-foreground">{pessoaParaMostrar.nif}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Ocorrencias() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const { selectedCondominioId, selectedAno } = useCondominio();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterAtribuido, setFilterAtribuido] = useState('all');
  const [uploading, setUploading] = useState(false);

  const [comboCondominioOpen, setComboCondominioOpen] = useState(false);
  const [comboFornecedorOpen, setComboFornecedorOpen] = useState(false);
  const [comboReportadaOpen, setComboReportadaOpen] = useState(false);

  const { data: ocorrencias = [], isLoading } = useQuery({ queryKey: ['ocorrencias'], queryFn: () => agenciaAvenida.entities.Ocorrencia.list('-data_abertura') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => agenciaAvenida.entities.User.list() });

  const condominiosAtivos = condominios.filter(c => c && c.ativo !== false && c.ativo !== 'false').sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const fornecedoresAtivos = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('fornecedor')).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));
  const condominosAtivos = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('condomino')).sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt'));

  const save = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, fracao_id: data.fracao_id === '__area_comum__' ? '' : data.fracao_id };
      return editing ? agenciaAvenida.entities.Ocorrencia.update(editing, payload) : agenciaAvenida.entities.Ocorrencia.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); setOpen(false); toast.success('OCORRÊNCIA GUARDADA COM SUCESSO'); },
  });

  const avancar = useMutation({
    mutationFn: ({ id, estado }) => agenciaAvenida.entities.Ocorrencia.update(id, { estado, ...(estado === 'resolvida' ? { data_resolucao: format(new Date(), 'yyyy-MM-dd') } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); toast.success('ESTADO ATUALIZADO COM SUCESSO'); },
  });

  const del = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Ocorrencia.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); toast.success('OCORRÊNCIA ELIMINADA COM SUCESSO'); },
  });

  const openNew = () => {
    setForm({ ...empty, condominio_id: selectedCondominioId === 'all' ? '' : selectedCondominioId });
    setEditing(null);
    setUploading(false);
    setOpen(true);
  };

  const openEdit = (o) => {
    setForm({ ...o, fracao_id: o.fracao_id || '__area_comum__', anexos: o.anexos || [] });
    setEditing(o.id);
    setUploading(false);
    setOpen(true);
  };

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';
  const getFracaoCode = (id) => formatFracao(fracoes.find(f => f.id === id));
  const getAtribuidoName = (id) => {
    if (!id) return null;
    const user = users.find(u => u.id === id);
    if (user) return user.full_name || user.email;
    return id;
  };

  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    const urls = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        // Preservar o nome original limpo para fácil leitura futura
        const safeName = file.name.replace(`.${fileExt}`, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
        const fileName = `${Date.now()}-${safeName}.${fileExt}`;
        const filePath = `ocorrencias/${fileName}`;

        const { data, error } = await supabase.storage
          .from('documentos')
          .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('documentos')
          .getPublicUrl(filePath);

        urls.push(publicUrlData.publicUrl);
      }

      setForm(p => ({ ...p, anexos: [...(p.anexos || []), ...urls] }));
      toast.success(`${urls.length} ANEXO(S) CARREGADO(S) COM SUCESSO`);

    } catch (error) {
      console.error("Erro de upload no Supabase:", error);
      toast.error("FALHA NO UPLOAD");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const removeAnexo = (idx) => setForm(p => ({ ...p, anexos: p.anexos.filter((_, i) => i !== idx) }));

  const filteredAll = ocorrencias.filter(o => {
    const matchCond = selectedCondominioId === 'all' || o.condominio_id === selectedCondominioId;
    
    // Converte a data para texto genérico (previne erros se a BD devolver um formato inesperado)
    const dataStr = String(o.data_abertura || '');
    
    const matchAno = 
      !selectedAno || 
      selectedAno === 'all' ||
      o.estado === 'aberta' ||
      o.estado === 'em_progresso' ||
      dataStr.includes(String(selectedAno));

    return matchCond && matchAno;
  });

  const filtered = filteredAll.filter(o => {
    const matchSearch = !search || o.titulo?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'all' || o.estado === filterEstado;
    const matchAtribuido = filterAtribuido === 'all' || o.atribuido_a === filterAtribuido;

    return matchSearch && matchEstado && matchAtribuido;
  });

  const stats = {
    aberta: filteredAll.filter(o => o.estado === 'aberta').length,
    em_progresso: filteredAll.filter(o => o.estado === 'em_progresso').length,
    resolvida: filteredAll.filter(o => o.estado === 'resolvida').length,
  };

  return (
    <div className="space-y-6 relative z-10">
      <PageHeader title="Ocorrências & Contactos" subtitle="Tratamento de ocorrências e apoio ao condómino" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Ocorrência</Button>
      } />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Abertas', value: stats.aberta, cls: 'bg-blue-50 border-blue-100 text-blue-700', estado: 'aberta' },
          { label: 'Em Progresso', value: stats.em_progresso, cls: 'bg-orange-50 border-orange-100 text-orange-700', estado: 'em_progresso' },
          { label: 'Resolvidas', value: stats.resolvida, cls: 'bg-green-50 border-green-100 text-green-700', estado: 'resolvida' },
        ].map(s => (
          <div
            key={s.label}
            onClick={() => setFilterEstado(f => f === s.estado ? 'all' : s.estado)}
            className={`rounded-xl p-4 border cursor-pointer transition-all hover:shadow-md ${filterEstado === s.estado ? 'ring-2 ring-primary' : ''} ${s.cls}`}
          >
            <p className="text-xs font-medium uppercase tracking-wider">{s.label}</p>
            <p className="text-3xl font-black mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 bg-background w-full" placeholder="Pesquisar ocorrência..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <Button
            variant={filterAtribuido === user?.id ? "default" : "secondary"}
            onClick={() => setFilterAtribuido(filterAtribuido === user?.id ? 'all' : user?.id)}
            className={filterAtribuido === user?.id ? "bg-primary" : "bg-muted text-muted-foreground border-transparent"}
          >
            Atribuído a Mim
          </Button>

          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[140px] bg-background"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Estados</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_progresso">Em Progresso</SelectItem>
              <SelectItem value="resolvida">Resolvida</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAtribuido} onValueChange={setFilterAtribuido}>
            <SelectTrigger className="w-[160px] bg-background"><SelectValue placeholder="Atribuído a" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Membros</SelectItem>
              {users.map(u => <SelectItem key={`user-${u.id}`} value={u.id}>{u.full_name || u.email}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar ocorrências...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(o => (
          <div
            key={o.id}
            className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
            onClick={() => setPreview(o)}
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-muted rounded-xl">
                    <AlertTriangle className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground leading-tight">{o.titulo}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{getCondName(o.condominio_id)} · {getFracaoCode(o.fracao_id)}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-4 h-4 text-muted-foreground" /></button>
                  <button onClick={() => del.mutate(o.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              {o.descricao && <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{o.descricao}</p>}
              {getAtribuidoName(o.atribuido_a) && (
                <p className="text-xs text-foreground font-medium mb-3 flex items-center gap-1.5">
                  <span className="bg-primary/10 text-primary w-5 h-5 rounded-full flex items-center justify-center text-[10px]">A</span>
                  <span>{getAtribuidoName(o.atribuido_a)}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex gap-2">
                  <StatusBadge status={o.estado} />
                  <StatusBadge status={o.prioridade} />
                </div>
                {estadoFlow[o.estado] && (
                  <Button size="sm" variant="outline" className="text-xs font-bold" onClick={e => { e.stopPropagation(); avancar.mutate({ id: o.id, estado: estadoFlow[o.estado] }); }}>
                    {estadoNext[o.estado]}
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs font-medium text-muted-foreground tracking-wider uppercase">{o.data_abertura}</p>
                {o.anexos?.length > 0 && <span className="text-xs font-bold text-muted-foreground flex items-center gap-1">📎 {o.anexos.length} anexo(s)</span>}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground bg-card border border-dashed rounded-xl">Nenhuma Ocorrência Encontrada</div>
        )}
      </div>

      {preview && (
        <OcorrenciaPreview
          ocorrencia={preview}
          condominios={condominios}
          fracoes={fracoes}
          pessoas={pessoas}
          users={users}
          onClose={() => setPreview(null)}
          onEdit={() => { openEdit(preview); setPreview(null); }}
        />
      )}

      {/* Form Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[94vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-6 z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> {editing ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">

            {/* LINHA 1: CONDOMINIO E FRAÇÃO */}
            <div className="sm:col-span-1">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioOpen} onOpenChange={setComboCondominioOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioOpen} className="w-full justify-between font-normal bg-background mt-1">
                    {form.condominio_id ? condominiosAtivos.find(c => c.id === form.condominio_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { upd('condominio_id', c.id); upd('fracao_id', '__area_comum__'); setComboCondominioOpen(false); }}>
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
              <Label>Fração Envolvida</Label>
              <Select value={form.fracao_id || '__area_comum__'} onValueChange={v => upd('fracao_id', v)} disabled={!form.condominio_id}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Área Comum (Sem Fração)" /></SelectTrigger>
                <SelectContent className="z-[210] max-h-48 no-scrollbar">
                  <SelectItem value="__area_comum__">Área Comum (Geral)</SelectItem>
                  {fracoes.filter(f => f.condominio_id === form.condominio_id).map(f => <SelectItem key={f.id} value={f.id}>{formatFracao(f)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* LINHA 2: TÍTULO E QUEM REPORTOU */}
            <div className="sm:col-span-1">
              <Label>Título / Assunto *</Label>
              <Input className="mt-1 bg-background" value={form.titulo || ''} onChange={e => upd('titulo', e.target.value)} placeholder="Ex: Lâmpada fundida no R/C..." />
            </div>

            <div className="sm:col-span-1">
              <Label>Reportada por (Condómino)</Label>
              <Popover open={comboReportadaOpen} onOpenChange={setComboReportadaOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboReportadaOpen} className="w-full justify-between font-normal bg-background mt-1 text-left">
                    <span className="truncate">
                      {form.reportada_por ? pessoas.find(p => p.id === form.reportada_por)?.nome : "Administração / Equipa Interna"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condómino..." />
                    <CommandEmpty>Condómino não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      <CommandItem value="Administração / Equipa Interna" onSelect={() => { upd('reportada_por', null); setComboReportadaOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", !form.reportada_por ? "opacity-100" : "opacity-0")} />
                        Administração / Equipa Interna
                      </CommandItem>
                      {condominosAtivos.map(p => (
                        <CommandItem key={p.id} value={p.nome} onSelect={() => { upd('reportada_por', p.id); setComboReportadaOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.reportada_por === p.id ? "opacity-100" : "opacity-0")} />
                          {p.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* LINHA 3: TIPO, PRIORIDADE, ESTADO ALINHADOS */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Tipo de Ocorrência</Label>
                <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    {Object.entries(tiposOcorrencia).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => upd('prioridade', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => upd('estado', v)}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_progresso">Em Progresso</SelectItem>
                    <SelectItem value="resolvida">Resolvida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DESCRICAO APENAS PARA PORTAL */}
            {form.canal_submissao === 'portal_condomino' && (
              <div className="sm:col-span-2 mt-2">
                <Label>Descrição Completa do Problema (Pelo Condómino)</Label>
                <textarea
                  className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm min-h-[80px] resize-y bg-muted opacity-80 cursor-not-allowed"
                  value={form.descricao || ''}
                  onChange={e => upd('descricao', e.target.value)}
                  disabled={true}
                  placeholder="Detalhes da anomalia submetida pelo condómino..."
                />
                <span className="text-[10px] text-amber-600 font-bold">Bloqueado. Apenas o condómino pode editar a sua submissão original.</span>
              </div>
            )}

            {/* OBSERVACOES INTERNAS */}
            <div className="sm:col-span-2">
              <Label>Observações Internas</Label>
              <textarea
                className="mt-1 w-full rounded-md border border-dashed border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y"
                value={form.observacoes || ''}
                onChange={e => upd('observacoes', e.target.value)}
                placeholder="Escreva ou edite anotações exclusivas para a equipa..."
              />
            </div>

            {/* SE CANAL PORTAL -> MOSTRA CAIXA RESPOSTA AO CLIENTE */}
            {form.canal_submissao === 'portal_condomino' && (
              <div className="sm:col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 mt-2">
                <Label className="text-blue-800 font-bold flex items-center gap-1.5"><Send className="w-4 h-4" /> Resposta ao Condómino (Visível no Portal)</Label>
                <textarea
                  className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm min-h-[80px] resize-y focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={form.resposta_cliente || ''}
                  onChange={e => upd('resposta_cliente', e.target.value)}
                  placeholder="Escreva a resposta que o condómino irá ler..."
                />
                <Button
                  type="button"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                  onClick={() => {
                    if (!form.titulo || !form.condominio_id) { toast.error("PREENCHA OS CAMPOS OBRIGATÓRIOS PRIMEIRO"); return; }
                    save.mutate({ ...form, estado: 'resolvida', data_resolucao: format(new Date(), 'yyyy-MM-dd') });
                  }}
                >
                  <Check className="w-4 h-4" /> Guardar Resposta & Resolver Processo
                </Button>
              </div>
            )}

            {/* ATRIBUICAO E FORNECEDOR */}
            <div className="mt-2">
              <Label>Membro da Equipa Atribuído</Label>
              <Select value={form.atribuido_a || ''} onValueChange={v => upd('atribuido_a', v === '__none__' ? '' : v)}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="__none__">Não Atribuído</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>👤 {u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-2">
              <Label>Fornecedor (Externo)</Label>
              <Popover open={comboFornecedorOpen} onOpenChange={setComboFornecedorOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboFornecedorOpen} className="w-full justify-between font-normal bg-background mt-1">
                    <span className="truncate">
                      {form.fornecedor_id ? fornecedoresAtivos.find(f => f.id === form.fornecedor_id)?.nome : "Selecione..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar fornecedor..." />
                    <CommandEmpty>Fornecedor não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      <CommandItem value="" onSelect={() => { upd('fornecedor_id', ''); setComboFornecedorOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", !form.fornecedor_id ? "opacity-100" : "opacity-0")} />
                        Nenhum
                      </CommandItem>
                      {fornecedoresAtivos.map(f => (
                        <CommandItem key={f.id} value={f.nome} onSelect={() => { upd('fornecedor_id', f.id); setComboFornecedorOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", form.fornecedor_id === f.id ? "opacity-100" : "opacity-0")} />
                          {f.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* ANEXOS / PROVAS */}
            <div className="sm:col-span-2 border-t border-border pt-4 mt-2">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground block mb-3">Anexos & Evidências</Label>
              <div className="bg-muted/20 border border-dashed border-border rounded-xl p-4">
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer p-4 bg-background border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">{uploading ? 'A enviar ficheiros...' : 'Clique para carregar fotos ou documentos'}</span>
                  <input type="file" multiple accept="image/*,.pdf" onChange={handleFotoUpload} className="hidden" disabled={uploading} />
                </label>

                {form.anexos?.length > 0 && (
                  <div className="flex flex-col gap-2 mt-4">
                    {form.anexos.map((url, i) => {
                      const fileNameRaw = url.split('/').pop();
                      const displayFileName = decodeURIComponent(fileNameRaw.substring(fileNameRaw.indexOf('-') + 1)) || `Anexo ${i + 1}`;
                      const isPdf = url.toLowerCase().endsWith('.pdf');

                      return (
                        <div key={i} className="flex items-center justify-between p-2 border border-border rounded-lg bg-background shadow-sm hover:border-primary/50 transition-colors">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 overflow-hidden flex-1 group">
                            {isPdf ? <FileText className="w-8 h-8 text-red-500 shrink-0" /> : <img src={url} alt="" className="w-8 h-8 object-cover rounded shrink-0 border border-border" />}
                            <span className="text-sm font-medium text-foreground group-hover:text-primary group-hover:underline truncate" title={displayFileName}>
                              {displayFileName}
                            </span>
                          </a>
                          <button type="button" onClick={() => removeAnexo(i)} className="p-2 ml-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-colors shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
          <DialogFooter className="mt-6 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={() => save.mutate(form)} disabled={save.isPending || uploading || !form.condominio_id || !form.titulo}>
              {save.isPending ? 'A guardar...' : 'Guardar Ocorrência'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}