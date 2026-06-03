import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/ui/StatusBadge';
import { FileText, CreditCard, AlertTriangle, Download, CheckCircle, Clock, Plus, X, LogOut, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';

const LOGO_URL = "https://media.base44.com/images/public/user_69ea73b562cec41faae7023d/560647939_264be9ba-be8e-4182-ac20-e19ea39feb71.jpeg";

export default function PortalCondomino() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('estado');
  const [showOcorrForm, setShowOcorrForm] = useState(false);
  const [ocorrForm, setOcorrForm] = useState({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' });
  const [fracaoSelecionada, setFracaoSelecionada] = useState('all');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: quotas = [] } = useQuery({ queryKey: ['quotas-portal'], queryFn: () => base44.entities.Quota.list('-data_emissao', 50) });
  const { data: documentos = [] } = useQuery({ queryKey: ['documentos-portal'], queryFn: () => base44.entities.Documento.filter({ publico: true }, '-data', 20) });
  const { data: ocorrencias = [] } = useQuery({ queryKey: ['ocorrencias-portal'], queryFn: () => base44.entities.Ocorrencia.list('-data_abertura', 20) });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => base44.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => base44.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas-portal'], queryFn: () => base44.entities.Pessoa.list() });

  // Descobrir frações e condomínios associados ao utilizador pelo email
  const pessoaUser = pessoas.find(p => p.email === user?.email);
  const fracoesUser = fracoes.filter(f =>
    pessoaUser && (f.proprietario_id === pessoaUser.id || f.inquilino_id === pessoaUser.id ||
      f.proprietario2_id === pessoaUser.id || f.inquilino2_id === pessoaUser.id)
  );
  const condominiosUser = condominios.filter(c => fracoesUser.some(f => f.condominio_id === c.id));

  // Filtrar quotas pela fração selecionada
  const quotasFiltradas = fracaoSelecionada === 'all'
    ? quotas
    : quotas.filter(q => q.fracao_id === fracaoSelecionada);

  const pendentes = quotasFiltradas.filter(q => q.estado === 'pendente' || q.estado === 'vencido');
  const pagas = quotasFiltradas.filter(q => q.estado === 'pago');
  const totalDivida = pendentes.reduce((s, q) => s + (q.valor || 0), 0);

  // Condomínio da fração selecionada (para mostrar no topo)
  const fracaoAtual = fracoes.find(f => f.id === fracaoSelecionada);
  const condominioAtual = fracaoAtual
    ? condominios.find(c => c.id === fracaoAtual.condominio_id)
    : condominiosUser.length === 1 ? condominiosUser[0] : null;

  const handleSubmitOcorrencia = async () => {
    const ocorrencia = await base44.entities.Ocorrencia.create({
      ...ocorrForm,
      estado: 'aberta',
      data_abertura: format(new Date(), 'yyyy-MM-dd'),
      reportada_por: user?.email,
      fracao_id: fracaoSelecionada !== 'all' ? fracaoSelecionada : undefined,
      condominio_id: condominioAtual?.id,
    });
    await base44.entities.Notificacao.create({
      titulo: `Nova ocorrência: ${ocorrForm.titulo}`,
      mensagem: `Reportada por ${user?.email || 'condómino'} · ${ocorrForm.tipo} · ${ocorrForm.prioridade === 'urgente' ? 'URGENTE' : ocorrForm.prioridade}`,
      tipo: 'ocorrencia',
      referencia_id: ocorrencia?.id,
      lida: false,
    });
    setShowOcorrForm(false);
    setOcorrForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'media' });
    toast.success('Ocorrência submetida com sucesso!');
  };

  const tabs = [
    { id: 'estado', label: 'Estado de Conta', icon: CreditCard },
    { id: 'documentos', label: 'Documentos', icon: FileText },
    { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Agência Avenida" className="h-10 w-auto object-contain rounded" />
            <div>
              <p className="font-bold text-foreground">Portal do Condómino</p>
              <p className="text-xs text-muted-foreground">Agência Avenida</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-foreground">{user.full_name || user.email}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <button
                onClick={() => base44.auth.logout()}
                title="Sair"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Condomínio + seletor de fração */}
        {(condominioAtual || fracoesUser.length > 0) && (
          <div className="max-w-4xl mx-auto px-4 pb-3 flex items-center gap-3 flex-wrap">
            {condominioAtual && (
              <div className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm font-medium">
                <span>🏢</span>
                <span>{condominioAtual.nome}</span>
                {condominioAtual.morada && <span className="text-xs opacity-70 hidden sm:inline">· {condominioAtual.morada}</span>}
              </div>
            )}
            {fracoesUser.length > 1 && (
              <Select value={fracaoSelecionada} onValueChange={setFracaoSelecionada}>
                <SelectTrigger className="w-auto h-8 text-sm border-dashed">
                  <SelectValue placeholder="Todas as frações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as frações</SelectItem>
                  {fracoesUser.map(f => {
                    const cond = condominios.find(c => c.id === f.condominio_id);
                    return (
                      <SelectItem key={f.id} value={f.id}>
                        {f.codigo} {cond ? `(${cond.nome})` : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
            {fracoesUser.length === 1 && (
              <span className="text-sm text-muted-foreground">Fração: <strong>{fracoesUser[0].codigo}</strong></span>
            )}
          </div>
        )}
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Estado rápido */}
        <div className={`rounded-xl p-5 mb-8 border ${totalDivida > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          <div className="flex items-center gap-3">
            {totalDivida > 0 ? (
              <div className="p-2 bg-red-100 rounded-lg"><Clock className="w-5 h-5 text-red-600" /></div>
            ) : (
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
            )}
            <div>
              <p className={`font-bold text-lg ${totalDivida > 0 ? 'text-red-800' : 'text-green-800'}`}>
                {totalDivida > 0 ? `Dívida pendente: €${totalDivida.toFixed(2)}` : 'Conta regularizada'}
              </p>
              <p className="text-sm text-muted-foreground">
                {pendentes.length > 0 ? `${pendentes.length} quota(s) por regularizar` : 'Todas as quotas estão pagas'}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'estado' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-foreground">Quotas e Pagamentos</h2>
            {pendentes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Pendentes</h3>
                <div className="space-y-2">
                  {pendentes.map(q => (
                    <div key={q.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">{q.descricao || 'Quota'}</p>
                        <p className="text-xs text-muted-foreground">Vencimento: {q.data_vencimento || '-'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={q.estado} />
                        <span className="font-bold text-foreground">€{(q.valor || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Histórico de Pagamentos</h3>
              <div className="space-y-2">
                {pagas.slice(0, 10).map(q => (
                  <div key={q.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{q.descricao || 'Quota'}</p>
                      <p className="text-xs text-muted-foreground">Pago em: {q.data_pagamento || '-'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status="pago" />
                      <span className="font-bold text-foreground">€{(q.valor || 0).toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {pagas.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Sem histórico de pagamentos</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'documentos' && (
          <div>
            <h2 className="font-semibold text-foreground mb-4">Documentos Disponíveis</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documentos.map(d => (
                <div key={d.id} className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{d.titulo}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{d.data} · {d.tipo}</p>
                    </div>
                  </div>
                  {d.ficheiro_url ? (
                    <a
                      href={d.ficheiro_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="flex items-center gap-1.5 text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0 mt-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descarregar
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-1">Sem ficheiro</span>
                  )}
                </div>
              ))}
              {documentos.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8 text-sm">Sem documentos disponíveis</p>}
            </div>
          </div>
        )}

        {tab === 'ocorrencias' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">As Minhas Ocorrências</h2>
              <Button size="sm" className="gap-2" onClick={() => setShowOcorrForm(true)}>
                <Plus className="w-4 h-4" />Reportar Problema
              </Button>
            </div>

            {showOcorrForm && (
              <div className="bg-card rounded-xl border border-border p-5 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Reportar Problema</h3>
                  <button onClick={() => setShowOcorrForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label>Título</Label>
                    <Input className="mt-1" value={ocorrForm.titulo} onChange={e => setOcorrForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Lâmpada fundida no hall" />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={ocorrForm.tipo} onValueChange={v => setOcorrForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="avaria">Avaria</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="limpeza">Limpeza</SelectItem>
                        <SelectItem value="seguranca">Segurança</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Urgência</Label>
                    <Select value={ocorrForm.prioridade} onValueChange={v => setOcorrForm(p => ({ ...p, prioridade: v }))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Descrição</Label>
                    <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px] resize-y" value={ocorrForm.descricao} onChange={e => setOcorrForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva o problema em detalhe..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => setShowOcorrForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleSubmitOcorrencia} disabled={!ocorrForm.titulo}>Submeter</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {ocorrencias.filter(o => o.reportada_por === user?.email).map(o => (
                <div key={o.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-medium text-foreground">{o.titulo}</p>
                    <StatusBadge status={o.estado} />
                  </div>
                  {o.descricao && <p className="text-sm text-muted-foreground mb-2">{o.descricao}</p>}
                  <div className="flex gap-2">
                    <StatusBadge status={o.prioridade} />
                    <span className="text-xs text-muted-foreground">{o.data_abertura}</span>
                  </div>
                </div>
              ))}
              {ocorrencias.filter(o => o.reportada_por === user?.email).length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma ocorrência submetida</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}