import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, AlertTriangle, Pencil, Trash2, Upload, X, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';

const empty = {
  condominio_id: '', fracao_id: '', titulo: '', descricao: '', tipo: 'avaria',
  prioridade: 'media', estado: 'aberta', area: 'outro',
  data_abertura: format(new Date(), 'yyyy-MM-dd'), observacoes: '',
  atribuido_a: '', fornecedor_id: '', fotos_urls: []
};

const estadoFlow = { aberta: 'em_progresso', em_progresso: 'resolvida', resolvida: 'fechada' };
const estadoNext = { aberta: 'Iniciar', em_progresso: 'Resolver', resolvida: 'Fechar' };

const prioridadeBadge = {
  baixa: 'text-green-700', media: 'text-yellow-700',
  alta: 'text-orange-700', urgente: 'text-red-700'
};

function OcorrenciaPreview({ ocorrencia, condominios, fracoes, pessoas, users, onClose, onEdit }) {
  const condNome = condominios.find(c => c.id === ocorrencia.condominio_id)?.nome || '-';
  const fracaoCod = fracoes.find(f => f.id === ocorrencia.fracao_id)?.codigo || 'Área Comum';
  const atribuidoPessoa = pessoas.find(p => p.id === ocorrencia.atribuido_a);
  const atribuidoUser = users?.find(u => u.id === ocorrencia.atribuido_a);
  const atribuido = atribuidoPessoa?.nome || (atribuidoUser ? (atribuidoUser.full_name || atribuidoUser.email) : null) || '-';
  const fornecedor = pessoas.find(p => p.id === ocorrencia.fornecedor_id)?.nome || '-';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4 print:hidden">
          <div>
            <h2 className="text-xl font-bold">{ocorrencia.titulo}</h2>
            <p className="text-sm text-muted-foreground">{condNome} · {fracaoCod}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" />Imprimir
            </Button>
            <Button size="sm" onClick={onEdit} className="gap-1">
              <Pencil className="w-3.5 h-3.5" />Editar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-lg p-4 mb-4 text-sm">
          <div><span className="font-medium">Estado:</span> <StatusBadge status={ocorrencia.estado} /></div>
          <div><span className="font-medium">Prioridade:</span> <StatusBadge status={ocorrencia.prioridade} /></div>
          <div><span className="font-medium">Tipo:</span> <span className="capitalize">{ocorrencia.tipo}</span></div>
          <div><span className="font-medium">Área:</span> <span className="capitalize">{ocorrencia.area}</span></div>
          <div><span className="font-medium">Data abertura:</span> {ocorrencia.data_abertura}</div>
          {ocorrencia.data_resolucao && <div><span className="font-medium">Data resolução:</span> {ocorrencia.data_resolucao}</div>}
          {ocorrencia.atribuido_a && <div><span className="font-medium">Atribuído a:</span> {atribuido}</div>}
          {ocorrencia.fornecedor_id && <div><span className="font-medium">Fornecedor:</span> {fornecedor}</div>}
          {ocorrencia.custo_estimado && <div><span className="font-medium">Custo estimado:</span> €{ocorrencia.custo_estimado}</div>}
          {ocorrencia.custo_real && <div><span className="font-medium">Custo real:</span> €{ocorrencia.custo_real}</div>}
        </div>
        {ocorrencia.descricao && (
          <div className="mb-4">
            <p className="font-medium text-sm mb-1">Descrição</p>
            <p className="text-sm text-muted-foreground">{ocorrencia.descricao}</p>
          </div>
        )}
        {ocorrencia.observacoes && (
          <div className="mb-4">
            <p className="font-medium text-sm mb-1">Observações</p>
            <p className="text-sm text-muted-foreground">{ocorrencia.observacoes}</p>
          </div>
        )}
        {ocorrencia.fotos_urls?.length > 0 && (
          <div>
            <p className="font-medium text-sm mb-2">Anexos</p>
            <div className="grid grid-cols-3 gap-2">
              {ocorrencia.fotos_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt={`Anexo ${i + 1}`} className="rounded-lg object-cover w-full h-24 border border-border" />
                </a>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Ocorrencias() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState(null);
  const { selectedCondominioId } = useCondominio();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterAtribuido, setFilterAtribuido] = useState('all');
  const [uploading, setUploading] = useState(false);

  const { data: ocorrencias = [], isLoading } = useQuery({ queryKey: ['ocorrencias'], queryFn: () => base44.entities.Ocorrencia.list('-data_abertura') });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => base44.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => base44.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => base44.entities.Pessoa.list() });

  const save = useMutation({
    mutationFn: (data) => editing ? base44.entities.Ocorrencia.update(editing, data) : base44.entities.Ocorrencia.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); setOpen(false); toast.success('Ocorrência guardada'); },
  });

  const avancar = useMutation({
    mutationFn: ({ id, estado }) => base44.entities.Ocorrencia.update(id, { estado, ...(estado === 'resolvida' ? { data_resolucao: format(new Date(), 'yyyy-MM-dd') } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); toast.success('Estado atualizado'); },
  });

  const del = useMutation({
    mutationFn: (id) => base44.entities.Ocorrencia.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ocorrencias'] }); toast.success('Ocorrência eliminada'); },
  });

  const openNew = () => { setForm(empty); setEditing(null); setOpen(true); };
  const openEdit = (o) => { setForm({ ...o, fotos_urls: o.fotos_urls || [] }); setEditing(o.id); setOpen(true); };
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';
  const getFracaoCode = (id) => fracoes.find(f => f.id === id)?.codigo || 'Área Comum';
  const getAtribuidoName = (id) => {
    if (!id) return null;
    const pessoa = pessoas.find(p => p.id === id);
    if (pessoa) return pessoa.nome;
    const user = users.find(u => u.id === id);
    if (user) return user.full_name || user.email;
    return id;
  };

  const handleFotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm(p => ({ ...p, fotos_urls: [...(p.fotos_urls || []), ...urls] }));
    setUploading(false);
    toast.success(`${urls.length} anexo(s) carregado(s)`);
  };

  const removeAnexo = (idx) => setForm(p => ({ ...p, fotos_urls: p.fotos_urls.filter((_, i) => i !== idx) }));

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });

  const filtered = ocorrencias.filter(o => {
    const matchSearch = !search || o.titulo?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'all' || o.estado === filterEstado;
    const matchCond = selectedCondominioId === 'all' || o.condominio_id === selectedCondominioId;
    const matchAtribuido = filterAtribuido === 'all' || o.atribuido_a === filterAtribuido;
    return matchSearch && matchEstado && matchCond && matchAtribuido;
  });

  const filteredAll = selectedCondominioId === 'all' ? ocorrencias : ocorrencias.filter(o => o.condominio_id === selectedCondominioId);
  const stats = {
    aberta: filteredAll.filter(o => o.estado === 'aberta').length,
    em_progresso: filteredAll.filter(o => o.estado === 'em_progresso').length,
    resolvida: filteredAll.filter(o => o.estado === 'resolvida').length,
  };

  return (
    <div>
      <PageHeader title="Ocorrências" subtitle="Gestão de avarias e manutenções" action={
        <Button onClick={openNew} className="gap-2"><Plus className="w-4 h-4" />Nova Ocorrência</Button>
      } />

      <div className="grid grid-cols-3 gap-4 mb-6">
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
            <p className="text-xs font-medium">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar ocorrência..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_progresso">Em Progresso</SelectItem>
            <SelectItem value="resolvida">Resolvida</SelectItem>
            <SelectItem value="fechada">Fechada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAtribuido} onValueChange={setFilterAtribuido}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Atribuído a" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            {users.map(u => <SelectItem key={`user-${u.id}`} value={u.id}>{u.full_name || u.email} (staff)</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <div className="text-center py-16 text-muted-foreground">A carregar...</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(o => (
          <div
            key={o.id}
            className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer"
            onClick={() => setPreview(o)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-muted rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{o.titulo}</p>
                  <p className="text-xs text-muted-foreground">{getCondName(o.condominio_id)} · {getFracaoCode(o.fracao_id)}</p>
                </div>
              </div>
              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => openEdit(o)} className="p-1.5 hover:bg-muted rounded transition-colors"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                <button onClick={() => del.mutate(o.id)} className="p-1.5 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
            {o.descricao && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{o.descricao}</p>}
            {getAtribuidoName(o.atribuido_a) && (
              <p className="text-xs text-foreground font-medium mb-2 flex items-center gap-1">👤 <span>{getAtribuidoName(o.atribuido_a)}</span></p>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <StatusBadge status={o.estado} />
                <StatusBadge status={o.prioridade} />
              </div>
              {estadoFlow[o.estado] && (
                <Button size="sm" variant="outline" className="text-xs" onClick={e => { e.stopPropagation(); avancar.mutate({ id: o.id, estado: estadoFlow[o.estado] }); }}>
                  {estadoNext[o.estado]}
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">{o.data_abertura}</p>
              {o.fotos_urls?.length > 0 && <span className="text-xs text-muted-foreground">📎 {o.fotos_urls.length} anexo(s)</span>}
            </div>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full text-center py-16 text-muted-foreground">Nenhuma ocorrência encontrada</div>
        )}
      </div>

      {/* Preview */}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Ocorrência' : 'Nova Ocorrência'}</DialogTitle>
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
              <Label>Fração / Área</Label>
              <Select value={form.fracao_id || ''} onValueChange={v => upd('fracao_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                <SelectContent>{fracoes.filter(f => !form.condominio_id || f.condominio_id === form.condominio_id).map(f => <SelectItem key={f.id} value={f.id}>{f.codigo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Título *</Label>
              <Input className="mt-1" value={form.titulo || ''} onChange={e => upd('titulo', e.target.value)} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => upd('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['avaria', 'manutencao', 'limpeza', 'seguranca', 'outro'].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Área</Label>
              <Select value={form.area} onValueChange={v => upd('area', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['fracao', 'hall', 'escadas', 'garagem', 'jardim', 'cobertura', 'elevador', 'outro'].map(a => <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={v => upd('prioridade', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => upd('estado', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_progresso">Em Progresso</SelectItem>
                  <SelectItem value="resolvida">Resolvida</SelectItem>
                  <SelectItem value="fechada">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data de Abertura</Label>
              <Input className="mt-1" type="date" value={form.data_abertura || ''} onChange={e => upd('data_abertura', e.target.value)} />
            </div>
            <div>
              <Label>Atribuído a (entidade/staff)</Label>
              <Select value={form.atribuido_a || ''} onValueChange={v => upd('atribuido_a', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {users.length > 0 && users.map(u => <SelectItem key={u.id} value={u.id}>👤 {u.full_name || u.email} (staff)</SelectItem>)}
                  {pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} ({p.tipo})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select value={form.fornecedor_id || ''} onValueChange={v => upd('fornecedor_id', v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {pessoas.filter(p => p.tipo === 'fornecedor').map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Custo Estimado (€)</Label>
              <Input className="mt-1" type="number" value={form.custo_estimado || ''} onChange={e => upd('custo_estimado', parseFloat(e.target.value) || 0)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Descrição</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px] resize-y" value={form.descricao || ''} onChange={e => upd('descricao', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Observações</Label>
              <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px] resize-y" value={form.observacoes || ''} onChange={e => upd('observacoes', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Anexos (fotos)</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{uploading ? 'A carregar...' : 'Adicionar fotos/anexos'}</span>
                  <input type="file" multiple accept="image/*,.pdf" onChange={handleFotoUpload} className="hidden" />
                </label>
                {form.fotos_urls?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.fotos_urls.map((url, i) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-border" />
                        <button onClick={() => removeAnexo(i)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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