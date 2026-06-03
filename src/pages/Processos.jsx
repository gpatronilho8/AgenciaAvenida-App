import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Search, FileText, Trash2, Edit, Upload } from 'lucide-react';
import ProcessoPreview from '@/components/processos/ProcessoPreview';

const TIPOS = {
  irs: 'IRS', carta_conducao: 'Carta de Condução', passaporte: 'Passaporte',
  nif: 'NIF', niss: 'NISS', reagrupamento_familiar: 'Reagrupamento Familiar',
  visto: 'Visto', licenca: 'Licença', certidao: 'Certidão', procuracao: 'Procuração', outro: 'Outro'
};

const ESTADOS = {
  pendente: { label: 'Pendente', cls: 'bg-yellow-100 text-yellow-700' },
  em_curso: { label: 'Em Curso', cls: 'bg-blue-100 text-blue-700' },
  aguarda_documentos: { label: 'Aguarda Docs', cls: 'bg-orange-100 text-orange-700' },
  submetido: { label: 'Submetido', cls: 'bg-purple-100 text-purple-700' },
  concluido: { label: 'Concluído', cls: 'bg-green-100 text-green-700' },
  cancelado: { label: 'Cancelado', cls: 'bg-gray-100 text-gray-600' },
};

const IRS_ESTADO_OPTS = [
  { value: '', label: '— Selecionar —' },
  { value: 'recebida_documentacao', label: 'Recebida Documentação' },
  { value: 'submetido_at_prova', label: 'Submetido AT — Prova de Entrega' },
  { value: 'comprovativo_enviado_cliente', label: 'Comprovativo Enviado ao Cliente' },
  { value: 'submetida_substituicao_at', label: 'Submetida Substituição AT' },
];
const IRS_CAMPOS_LABELS = [
  ['estado_civil_solteiro', 'Estado civil — Solteiro'],
  ['estado_civil_casado', 'Estado civil — Casado'],
  ['estado_civil_separado', 'Estado civil — Separado'],
  ['rendimentos_prediais', 'Rendimentos Prediais'],
  ['incapacidade', 'Incapacidade'],
  ['irs_jovem', 'IRS Jovem'],
  ['declaracao_substituicao', 'Declaração de Substituição'],
  ['rendimentos_estrangeiro', 'Rendimentos no Estrangeiro'],
];

const empty = {
  tipo: 'outro', tipo_personalizado: '', pessoa_id: '', atribuido_a: '', descricao: '', custo_servico: 0,
  pago: false, data_pagamento: '', metodo_pagamento: '', estado: 'pendente',
  data_inicio: new Date().toISOString().split('T')[0], data_conclusao: '',
  data_prazo: '', notas: '', prioridade: 'normal',
  irs_estado: '', irs_campos: {},
};

export default function Processos() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const { data: processos = [] } = useQuery({ queryKey: ['processos'], queryFn: () => agenciaAvenida.entities.Processo.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => agenciaAvenida.entities.User.list() });

  const save = useMutation({
    mutationFn: async (d) => {
      if (editing) {
        const updated = await agenciaAvenida.entities.Processo.update(editing, d);
        const pessoa = pessoas.find(p => p.id === d.pessoa_id);
        await agenciaAvenida.entities.Notificacao.create({
          titulo: `Processo atualizado: ${d.tipo === 'outro' && d.tipo_personalizado ? d.tipo_personalizado : (TIPOS[d.tipo] || d.tipo)}`,
          mensagem: `Estado: ${ESTADOS[d.estado]?.label || d.estado} · ${pessoa?.nome || ''}`,
          tipo: 'processo_atualizado',
          referencia_id: editing,
          lida: false,
        });
        return updated;
      } else {
        const created = await agenciaAvenida.entities.Processo.create(d);
        const pessoa = pessoas.find(p => p.id === d.pessoa_id);
        await agenciaAvenida.entities.Notificacao.create({
          titulo: `Novo processo: ${d.tipo === 'outro' && d.tipo_personalizado ? d.tipo_personalizado : (TIPOS[d.tipo] || d.tipo)}`,
          mensagem: `Atribuído a ${pessoa?.nome || '—'} · ${d.prioridade === 'urgente' ? 'URGENTE' : 'Normal'}`,
          tipo: 'processo_novo',
          referencia_id: created?.id,
          lida: false,
        });
        return created;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['processos'] }); setOpen(false); },
  });

  const remove = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Processo.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['processos'] }),
  });

  const pessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || '—';
  const staffNome = (id) => { if (!id) return null; const u = users.find(u => u.id === id); return u ? (u.full_name || u.email) : null; };

  const filtered = processos.filter(p => {
    const matchSearch = !search || pessoaNome(p.pessoa_id).toLowerCase().includes(search.toLowerCase()) || p.descricao?.toLowerCase().includes(search.toLowerCase()) || TIPOS[p.tipo]?.toLowerCase().includes(search.toLowerCase());
    let matchEstado = true;
    if (filterEstado === 'all') matchEstado = true;
    else if (filterEstado === '__em_aberto__') matchEstado = ['pendente', 'em_curso', 'aguarda_documentos'].includes(p.estado);
    else if (filterEstado === '__urgente__') matchEstado = p.prioridade === 'urgente' && p.estado !== 'concluido';
    else if (filterEstado === '__nao_pago__') matchEstado = !p.pago && p.custo_servico > 0;
    else matchEstado = p.estado === filterEstado;
    const matchTipo = filterTipo === 'all' || p.tipo === filterTipo;
    return matchSearch && matchEstado && matchTipo;
  }).sort((a, b) => {
    if (a.prioridade === 'urgente' && b.prioridade !== 'urgente') return -1;
    if (b.prioridade === 'urgente' && a.prioridade !== 'urgente') return 1;
    return new Date(b.created_date || 0) - new Date(a.created_date || 0);
  });

  const stats = {
    total: processos.length,
    pendente: processos.filter(p => p.estado === 'pendente' || p.estado === 'em_curso' || p.estado === 'aguarda_documentos').length,
    concluido: processos.filter(p => p.estado === 'concluido').length,
    urgente: processos.filter(p => p.prioridade === 'urgente' && p.estado !== 'concluido').length,
    nao_pago: processos.filter(p => !p.pago && p.custo_servico > 0).length,
  };

  const openEdit = (p) => { setPreview(null); setForm({ ...empty, ...p, documentos: p.documentos || [] }); setEditing(p.id); setOpen(true); };
  const openNew = () => { setForm({ ...empty, documentos: [] }); setEditing(null); setOpen(true); };

  const handleUploadDoc = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await agenciaAvenida.integrations.Core.UploadFile({ file });
    const doc = { nome: file.name, url: file_url };
    setForm(f => ({ ...f, documentos: [...(f.documentos || []), doc] }));
    setUploading(false);
  };

  const removeDoc = (idx) => setForm(f => ({ ...f, documentos: f.documentos.filter((_, i) => i !== idx) }));

  const tipoLabel = (p) => p.tipo === 'outro' && p.tipo_personalizado ? p.tipo_personalizado : (TIPOS[p.tipo] || p.tipo);

  return (
    <div>
      <PageHeader title="Processos" subtitle="Gestão de serviços e documentação"
        action={<Button onClick={openNew}><Plus className="w-4 h-4 mr-1" />Novo Processo</Button>}
      />

      {/* Stats — clicáveis para filtrar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total', value: stats.total, color: 'text-foreground', filterKey: null },
          { label: 'Em Aberto', value: stats.pendente, color: 'text-blue-600', filterKey: 'em_aberto' },
          { label: 'Concluídos', value: stats.concluido, color: 'text-green-600', filterKey: 'concluido' },
          { label: 'Urgentes', value: stats.urgente, color: 'text-red-600', filterKey: 'urgente' },
          { label: 'Por Cobrar', value: stats.nao_pago, color: 'text-orange-600', filterKey: 'nao_pago' },
        ].map(s => (
          <div
            key={s.label}
            onClick={() => {
              if (!s.filterKey) { setFilterEstado('all'); return; }
              if (s.filterKey === 'urgente') setFilterEstado(v => v === '__urgente__' ? 'all' : '__urgente__');
              else if (s.filterKey === 'em_aberto') setFilterEstado(v => v === '__em_aberto__' ? 'all' : '__em_aberto__');
              else if (s.filterKey === 'nao_pago') setFilterEstado(v => v === '__nao_pago__' ? 'all' : '__nao_pago__');
              else setFilterEstado(v => v === s.filterKey ? 'all' : s.filterKey);
            }}
            className={`bg-card border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${
              (s.filterKey === 'em_aberto' && filterEstado === '__em_aberto__') ||
              (s.filterKey === 'urgente' && filterEstado === '__urgente__') ||
              (s.filterKey === 'nao_pago' && filterEstado === '__nao_pago__') ||
              (s.filterKey === filterEstado)
                ? 'border-primary ring-1 ring-primary' : 'border-border'
            }`}
          >
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar processo ou pessoa..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {Object.entries(ESTADOS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhum processo encontrado</p>
          </div>
        )}
        {filtered.map(p => {
          const estado = ESTADOS[p.estado] || { label: p.estado, cls: 'bg-gray-100 text-gray-700' };
          return (
            <div key={p.id} className={`bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${p.prioridade === 'urgente' ? 'border-red-200' : 'border-border'}`}
              onClick={() => setPreview(p)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-base">{tipoLabel(p)}</span>
                    {p.prioridade === 'urgente' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">URGENTE</span>}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${estado.cls}`}>{estado.label}</span>
                    {p.pago ? (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Pago</span>
                    ) : p.custo_servico > 0 ? (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Por cobrar</span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{pessoaNome(p.pessoa_id)}</span>
                    {p.descricao && <> · {p.descricao}</>}
                    {staffNome(p.atribuido_a) && <span className="ml-1">· 👤 {staffNome(p.atribuido_a)}</span>}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                    {p.data_inicio && <span>Início: {p.data_inicio}</span>}
                    {p.data_prazo && <span className={new Date(p.data_prazo) < new Date() && p.estado !== 'concluido' ? 'text-red-500 font-medium' : ''}>Prazo: {p.data_prazo}</span>}
                    {p.custo_servico > 0 && <span className="font-medium text-foreground">€{p.custo_servico.toFixed(2)}</span>}
                    {p.documentos?.length > 0 && <span>{p.documentos.length} doc(s)</span>}
                  </div>
                  {p.notas && <p className="text-xs text-muted-foreground mt-1 italic">{p.notas}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove.mutate(p.id)} className="hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <ProcessoPreview
          processo={preview}
          pessoaNome={pessoaNome(preview.pessoa_id)}
          staffNome={preview.atribuido_a ? (users.find(u => u.id === preview.atribuido_a)?.full_name || users.find(u => u.id === preview.atribuido_a)?.email) : null}
          onClose={() => setPreview(null)}
          onEdit={() => openEdit(preview)}
        />
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Editar Processo' : 'Novo Processo'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Prioridade</Label>
                <Select value={form.prioridade} onValueChange={v => setForm(f => ({ ...f, prioridade: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="urgente">Urgente</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {form.tipo === 'outro' && (
              <div><Label>Designação personalizada</Label><Input value={form.tipo_personalizado} onChange={e => setForm(f => ({ ...f, tipo_personalizado: e.target.value }))} placeholder="Ex: Registo de marca" /></div>
            )}
            <div><Label>Pessoa *</Label>
              <Select value={form.pessoa_id} onValueChange={v => setForm(f => ({ ...f, pessoa_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar pessoa" /></SelectTrigger>
                <SelectContent>{pessoas.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Descrição / Observação</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><Label>Atribuído a (staff)</Label>
              <Select value={form.atribuido_a || ''} onValueChange={v => setForm(f => ({ ...f, atribuido_a: v }))}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm(f => ({ ...f, estado: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ESTADOS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Data de Início</Label><Input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} /></div>
              <div><Label>Prazo</Label><Input type="date" value={form.data_prazo} onChange={e => setForm(f => ({ ...f, data_prazo: e.target.value }))} /></div>
            </div>
            {form.estado === 'concluido' && (
              <div><Label>Data de Conclusão</Label><Input type="date" value={form.data_conclusao} onChange={e => setForm(f => ({ ...f, data_conclusao: e.target.value }))} /></div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Custo do Serviço (€)</Label><Input type="number" value={form.custo_servico} onChange={e => setForm(f => ({ ...f, custo_servico: parseFloat(e.target.value) || 0 }))} /></div>
              <div className="flex flex-col gap-1.5">
                <Label>Pago?</Label>
                <div className="flex items-center gap-2 h-9">
                  <input type="checkbox" id="pago" checked={form.pago} onChange={e => setForm(f => ({ ...f, pago: e.target.checked }))} />
                  <label htmlFor="pago" className="text-sm">Sim, já foi pago</label>
                </div>
              </div>
            </div>
            {form.pago && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data Pagamento</Label><Input type="date" value={form.data_pagamento} onChange={e => setForm(f => ({ ...f, data_pagamento: e.target.value }))} /></div>
                <div><Label>Método</Label>
                  <Select value={form.metodo_pagamento || ''} onValueChange={v => setForm(f => ({ ...f, metodo_pagamento: v }))}>
                    <SelectTrigger><SelectValue placeholder="Método" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="mb">MB</SelectItem>
                      <SelectItem value="mbway">MBWay</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div><Label>Notas</Label><Input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></div>

            {/* Painel IRS */}
            {form.tipo === 'irs' && (
              <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-blue-700">Dados IRS</p>
                <div>
                  <Label>Estado IRS</Label>
                  <Select value={form.irs_estado || ''} onValueChange={v => setForm(f => ({ ...f, irs_estado: v }))}>
                    <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Selecionar estado" /></SelectTrigger>
                    <SelectContent>
                      {IRS_ESTADO_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Atributos</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {IRS_CAMPOS_LABELS.map(([k, label]) => (
                      <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          className="rounded"
                          checked={!!(form.irs_campos || {})[k]}
                          onChange={e => setForm(f => ({ ...f, irs_campos: { ...(f.irs_campos || {}), [k]: e.target.checked } }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Documents */}
            <div>
              <Label>Documentos</Label>
              <div className="mt-2 space-y-1">
                {(form.documentos || []).map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-muted rounded px-3 py-1.5">
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">{doc.nome}</a>
                    <button onClick={() => removeDoc(idx)} className="text-muted-foreground hover:text-destructive ml-2">✕</button>
                  </div>
                ))}
                <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline mt-1">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'A carregar...' : 'Adicionar documento'}
                  <input type="file" className="hidden" onChange={handleUploadDoc} disabled={uploading} />
                </label>
              </div>
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