import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import StatusBadge from '@/components/ui/StatusBadge';
import { FileText, CreditCard, AlertTriangle, Download, CheckCircle, Clock, Plus, X, LogOut, RefreshCw, FileSpreadsheet, Calendar, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

const LOGO_URL = "/aa_regular.jpg";
const MESES_LABEL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const parseJsonArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [data];
  } catch {
    return [data];
  }
};

const gerarPDFMock = (titulo) => {
  const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(" + titulo + ") Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000229 00000 n \n0000000317 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n412\n%%EOF";
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = titulo.replace(/ /g, '_') + '.pdf';
  a.click();
  URL.revokeObjectURL(url);
};

export default function PortalCondomino() {
  const qc = useQueryClient();
  const hoje = new Date();

  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('estado');
  const [showOcorrForm, setShowOcorrForm] = useState(false);
  const [ocorrForm, setOcorrForm] = useState({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'normal' });

  const [entidadeSelecionada, setEntidadeSelecionada] = useState('');
  const [perfilSelecionado, setPerfilSelecionado] = useState('');
  const [fracaoSelecionada, setFracaoSelecionada] = useState('all');
  const [propriedadeSelecionada, setPropriedadeSelecionada] = useState('all');

  const [dataInicio, setDataInicio] = useState(format(startOfYear(hoje), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfYear(hoje), 'yyyy-MM-dd'));

  const [recibosModalOpen, setRecibosModalOpen] = useState(false);
  const [recibosList, setRecibosList] = useState([]);

  const [showPessoa, setShowPessoa] = useState(null);
  const [showPessoaModal, setShowPessoaModal] = useState(false);

  useEffect(() => {
    // SIMULAÇÃO DE LOGIN:
    setUser({
      email: 'gpatronilho8@gmail.com',
      full_name: 'Gonçalo Patronilho'
    });
  }, []);

  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades-portal'], queryFn: () => agenciaAvenida.entities.Propriedade.list() });
  const { data: rendas = [] } = useQuery({ queryKey: ['rendas-portal'], queryFn: () => agenciaAvenida.entities.RendaMensal.list() });
  const { data: quotas = [] } = useQuery({ queryKey: ['quotas-portal'], queryFn: () => agenciaAvenida.entities.Quota.list() });
  const { data: documentos = [] } = useQuery({ queryKey: ['documentos-portal'], queryFn: () => agenciaAvenida.entities.Documento.filter({ publico: true }, '-data', 50) });
  const { data: ocorrencias = [] } = useQuery({ queryKey: ['ocorrencias-portal'], queryFn: () => agenciaAvenida.entities.Ocorrencia.list('-data_abertura', 50) });
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios-portal'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes-portal'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas-portal'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const entidadesAssociadas = pessoas.filter(p => user?.email && p.email?.toLowerCase() === user.email.toLowerCase());

  useEffect(() => {
    if (entidadesAssociadas.length > 0 && !entidadeSelecionada) {
      setEntidadeSelecionada(entidadesAssociadas[0].id);
    }
  }, [entidadesAssociadas, entidadeSelecionada]);

  const entidadeAtual = pessoas.find(p => p.id === entidadeSelecionada) || entidadesAssociadas[0];

  const perfisDisponiveis = (() => {
    if (!entidadeAtual) return [];
    const perfis = [];
    let tipos = [];
    try { tipos = Array.isArray(entidadeAtual.tipo) ? entidadeAtual.tipo : JSON.parse(entidadeAtual.tipo || '[]'); }
    catch { tipos = String(entidadeAtual.tipo || '').split(','); }

    const tiposNormalizados = tipos.map(t => String(t).trim().toLowerCase());

    if (tiposNormalizados.includes('condomino')) perfis.push('condomino');

    if (tiposNormalizados.includes('cliente')) {
      const eProprietario = propriedades.some(p => parseJsonArray(p.proprietario_id).map(String).includes(String(entidadeAtual.id)));
      const eInquilino = propriedades.some(p => parseJsonArray(p.inquilino_id).map(String).includes(String(entidadeAtual.id)));
      if (eProprietario) perfis.push('proprietario');
      if (eInquilino) perfis.push('inquilino');
    }
    return perfis;
  })();

  useEffect(() => {
    if (perfisDisponiveis.length > 0) {
      if (!perfilSelecionado || !perfisDisponiveis.includes(perfilSelecionado)) {
        setPerfilSelecionado(perfisDisponiveis[0]);
      }
    } else {
      setPerfilSelecionado('');
    }
  }, [perfisDisponiveis, perfilSelecionado]);

  useEffect(() => {
    if (perfilSelecionado === 'proprietario') setTab('estado');
  }, [perfilSelecionado]);

  const totalPerfisVisiveis = perfisDisponiveis.length;

  // --- CONTEXTO: CONDÓMINO ---
  const extractIds = (data) => {
    const arr = parseJsonArray(data);
    return arr.map(item => {
      if (typeof item === 'object' && item !== null) return String(item.id || item.value || '');
      return String(item);
    });
  };

  const fracoesUser = fracoes.filter(f => {
    if (!entidadeAtual) return false;
    const targetId = String(entidadeAtual.id);
    const titulares = extractIds(f.titulares);
    return titulares.includes(targetId);
  });

  const condominiosUser = condominios.filter(c => fracoesUser.some(f => String(f.condominio_id) === String(c.id)));

  // Auto-selecionar sempre a 1ª Fração (sem opção "todos")
  useEffect(() => {
    if (perfilSelecionado === 'condomino' && fracoesUser.length > 0) {
      if (!fracoesUser.some(f => String(f.id) === String(fracaoSelecionada))) {
        setFracaoSelecionada(fracoesUser[0].id);
      }
    }
  }, [perfilSelecionado, fracoesUser, fracaoSelecionada]);

  // Filtro Direto (sem 'all')
  const quotasPerfil = quotas.filter(q => String(q.fracao_id) === String(fracaoSelecionada));

  const quotasOrdenadas = [...quotasPerfil].map(q => {
    const fracao = fracoes.find(f => String(f.id) === String(q.fracao_id));
    const titulares = fracao ? extractIds(fracao.titulares) : [];
    const divisor = titulares.length > 0 ? titulares.length : 1;

    // 1. O valor individual que este utilizador tem de pagar
    const valorTeoricoIndividual = (q.valor || 0) / divisor;

    // 2. Tenta obter os pagamentos filtrados pelo histórico detalhado
    const pagamentosDestaEntidade = parseJsonArray(q.pagamentos || q.historico_pagamentos)
      .filter(p => String(p.pessoa_id || p.entidade_id) === String(entidadeAtual.id));

    let valorPagoProp = pagamentosDestaEntidade.reduce((sum, p) => sum + (p.valor || 0), 0);

    // 3. FALLBACK: Se não houver histórico detalhado mas existir um "valor_pago" direto na quota
    if (valorPagoProp === 0 && q.valor_pago > 0) {
      // Se for apenas 1 titular, o valor pago é totalmente dele. Se forem mais, divide proporcionalmente.
      valorPagoProp = divisor === 1 ? q.valor_pago : (q.valor_pago / divisor);
    }

    // 4. Determinar os estados de validação
    const pagoTotalmente = (valorTeoricoIndividual - valorPagoProp) <= 0.005 && valorPagoProp > 0;
    const pagamentoParcial = valorPagoProp > 0 && !pagoTotalmente && q.estado !== 'pago';

    return {
      ...q,
      valor_calculado: valorTeoricoIndividual,
      valor_pago_individual: valorPagoProp,
      is_pago_individual: pagoTotalmente,
      is_parcial_individual: pagamentoParcial
    };
  }).sort((a, b) => {
    if (!a.data_vencimento && b.data_vencimento) return -1;
    if (a.data_vencimento && !b.data_vencimento) return 1;
    if (!a.data_vencimento && !b.data_vencimento) return 0;
    return new Date(b.data_emissao || b.created_at) - new Date(a.data_emissao || a.created_at);
  });

  // Lógica de Incumprimento (Apenas "vencida" / "vencido")
  const pendentes = quotasOrdenadas.filter(q => q.estado === 'pendente' || q.estado === 'vencido' || q.estado === 'vencida');
  const emIncumprimentoQuotas = quotasOrdenadas.filter(q => q.estado === 'vencido' || q.estado === 'vencida');
  const totalDividaQuotas = emIncumprimentoQuotas.reduce((s, q) => s + q.valor_calculado, 0);

  const pagasFiltradas = quotasOrdenadas.filter(q => q.estado === 'pago').filter(q => {
    if (!q.data_pagamento) return true;
    try {
      const dataRef = parseISO(q.data_pagamento.split('T')[0]);
      return isWithinInterval(dataRef, { start: parseISO(dataInicio), end: parseISO(dataFim) });
    } catch { return true; }
  });

  const fracaoAtual = fracoes.find(f => String(f.id) === String(fracaoSelecionada));
  const condominioAtual = fracaoAtual
    ? condominios.find(c => String(c.id) === String(fracaoAtual.condominio_id))
    : condominiosUser.length === 1 ? condominiosUser[0] : null;

  const documentosCondominio = documentos.filter(d => !condominioAtual || String(d.condominio_id) === String(condominioAtual.id));


  // --- CONTEXTO: PROPRIETÁRIO ---
  const propriedadesDono = propriedades.filter(p => entidadeAtual && parseJsonArray(p.proprietario_id).map(String).includes(String(entidadeAtual.id)));

  // Auto-selecionar sempre a 1ª Propriedade (sem opção "todos")
  useEffect(() => {
    if (perfilSelecionado === 'proprietario' && propriedadesDono.length > 0) {
      if (!propriedadesDono.some(p => String(p.id) === String(propriedadeSelecionada))) {
        setPropriedadeSelecionada(propriedadesDono[0].id);
      }
    }
  }, [perfilSelecionado, propriedadesDono, propriedadeSelecionada]);

  // Filtro Direto (sem 'all')
  const propriedadesFiltradasDono = propriedadesDono.filter(p => String(p.id) === String(propriedadeSelecionada));

  const rendasDono = rendas.filter(r => propriedadesFiltradasDono.some(p => String(p.id) === String(r.propriedade_id))).filter(r => {
    if (!r.created_at) return true;
    try {
      const dataRef = parseISO(r.created_at.split('T')[0]);
      return isWithinInterval(dataRef, { start: parseISO(dataInicio), end: parseISO(dataFim) });
    } catch { return true; }
  }).sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);


  // --- CONTEXTO: INQUILINO ---
  const propriedadesInquilino = propriedades.filter(p => entidadeAtual && parseJsonArray(p.inquilino_id).map(String).includes(String(entidadeAtual.id)));

  // Auto-selecionar sempre a 1ª Propriedade (sem opção "todos")
  useEffect(() => {
    if (perfilSelecionado === 'inquilino' && propriedadesInquilino.length > 0) {
      if (!propriedadesInquilino.some(p => String(p.id) === String(propriedadeSelecionada))) {
        setPropriedadeSelecionada(propriedadesInquilino[0].id);
      }
    }
  }, [perfilSelecionado, propriedadesInquilino, propriedadeSelecionada]);

  // Filtro Direto (sem 'all')
  const propriedadesFiltradasInq = propriedadesInquilino.filter(p => String(p.id) === String(propriedadeSelecionada));

  const calcularTotalEncargosRenda = (r) => parseJsonArray(r.encargos_associados).reduce((s, e) => s + (e.valor || 0), 0);
  const calcularTotalPagamentosRenda = (r) => parseJsonArray(r.pagamentos).reduce((s, p) => s + (p.valor || 0), 0);

  const rendasInquilinoGlobal = rendas.filter(r => propriedadesFiltradasInq.some(p => String(p.id) === String(r.propriedade_id)));

  const rendasAtrasadasInquilino = rendasInquilinoGlobal.filter(r => r.estado === 'atrasada');
  const totalDividaAtrasadaInquilino = rendasAtrasadasInquilino.reduce((s, r) => s + ((r.valor_renda || 0) + calcularTotalEncargosRenda(r) - calcularTotalPagamentosRenda(r)), 0);

  const rendasInquilinoFiltradas = rendasInquilinoGlobal.filter(r => {
    if (!r.created_at) return true;
    try {
      const dataRef = parseISO(r.created_at.split('T')[0]);
      return isWithinInterval(dataRef, { start: parseISO(dataInicio), end: parseISO(dataFim) });
    } catch { return true; }
  }).sort((a, b) => b.ano !== a.ano ? b.ano - a.ano : b.mes - a.mes);


  // --- FUNÇÕES GERAIS ---
  const handleSubmitOcorrencia = async () => {
    const ocorrencia = await agenciaAvenida.entities.Ocorrencia.create({
      ...ocorrForm,
      estado: 'aberta',
      data_abertura: format(new Date(), 'yyyy-MM-dd'),
      reportada_por: user?.email,
      fracao_id: perfilSelecionado === 'condomino' && fracaoSelecionada !== 'all' ? fracaoSelecionada : undefined,
      propriedade_id: perfilSelecionado !== 'condomino' && propriedadeSelecionada !== 'all' ? propriedadeSelecionada : undefined,
      condominio_id: condominioAtual?.id,
    });
    await agenciaAvenida.entities.Notificacao.create({
      titulo: `Nova ocorrência: ${ocorrForm.titulo}`,
      mensagem: `Reportada via Portal (${perfilSelecionado.toUpperCase()}) por ${user?.email} · ${ocorrForm.tipo}`,
      tipo: 'ocorrencia',
      referencia_id: ocorrencia?.id,
      lida: false,
    });
    setShowOcorrForm(false);
    setOcorrForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'normal' });
    qc.invalidateQueries({ queryKey: ['ocorrencias-portal'] });
    toast.success('OCORRÊNCIA REGISTADA COM SUCESSO');
  };

  const handleOpenRecibos = (quota) => {
    const recibosArr = parseJsonArray(quota.recibo_url);
    if (recibosArr.length === 1) window.open(recibosArr[0], '_blank');
    else if (recibosArr.length > 1) { setRecibosList(recibosArr); setRecibosModalOpen(true); }
    else toast.error("NÃO EXISTEM RECIBOS ASSOCIADOS A ESTA QUOTA");
  };

  const limparFiltrosDatas = () => {
    setDataInicio(format(startOfYear(hoje), 'yyyy-MM-dd'));
    setDataFim(format(endOfYear(hoje), 'yyyy-MM-dd'));
  };

  const obterNomePortal = () => {
    if (perfilSelecionado === 'proprietario') return "Portal do Proprietário";
    if (perfilSelecionado === 'inquilino') return "Portal do Inquilino";
    return "Portal do Condómino";
  };

  const formatarReferenciaData = (item) => {
    if (item.mes && item.ano) return ` (${MESES_LABEL[item.mes - 1]} ${item.ano})`;
    if (item.ano) return ` (${item.ano})`;
    return '';
  };

  const tabs = [
    { id: 'estado', label: perfilSelecionado === 'condomino' ? 'Estado da Conta' : 'Histórico Financeiro', icon: CreditCard },
    ...(perfilSelecionado === 'condomino' ? [{ id: 'documentos', label: 'Documentos', icon: FileText }] : []),
    { id: 'ocorrencias', label: 'Ocorrências', icon: AlertTriangle },
  ];

  const pessoaParaMostrar = pessoas.find(p => p.id === showPessoa);

  useEffect(() => {
    document.title = `${obterNomePortal()} | AGÊNCIA AVENIDA`.toUpperCase();
  }, [perfilSelecionado]);

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* HEADER (Centrado Vertical e Horizontalmente) */}
      <header className="bg-card border-b border-border shadow-sm flex items-center justify-center py-6 min-h-[100px]">
        <div className="max-w-5xl w-full mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Agência Avenida" className="h-12 w-auto object-contain rounded shadow-sm" />
            <div>
              <p className="font-black text-foreground text-xl tracking-wide leading-tight">{obterNomePortal()}</p>
              <p className="text-s font-bold text-muted-foreground/80 mt-0.5">Agência Avenida</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {entidadesAssociadas.length > 1 && (
              <Select value={entidadeSelecionada} onValueChange={setEntidadeSelecionada}>
                <SelectTrigger className="w-48 h-10 text-xs font-semibold bg-background shadow-sm">
                  <SelectValue placeholder="Selecionar Entidade" />
                </SelectTrigger>
                <SelectContent>
                  {entidadesAssociadas.map(p => <SelectItem key={p.id} value={p.id} className="text-xs font-medium">{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            {/* Seletor 2: Alternar Perfis Inteligentes da Entidade (Sempre visível) */}
            <Select value={perfilSelecionado} onValueChange={setPerfilSelecionado} disabled={totalPerfisVisiveis <= 1}>
              <SelectTrigger className="w-40 h-10 text-s font-black tracking-wider bg-primary/5 text-primary border-primary/20 shadow-sm">
                <SelectValue placeholder="Perfil" />
              </SelectTrigger>
              <SelectContent>
                {perfisDisponiveis.includes('condomino') && <SelectItem value="condomino" className="text-sm font-bold">Condómino</SelectItem>}
                {perfisDisponiveis.includes('proprietario') && <SelectItem value="proprietario" className="text-sm font-bold">Proprietário</SelectItem>}
                {perfisDisponiveis.includes('inquilino') && <SelectItem value="inquilino" className="text-sm font-bold">Inquilino</SelectItem>}
              </SelectContent>
            </Select>

            {/* MÓDULO DE UTILIZADOR */}
            <div className="flex items-center gap-3 pl-2">
              {user && (
                <div className="flex items-center gap-3 pl-3 border-l border-border">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-foreground leading-tight">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm border border-border flex-shrink-0">
                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <button
                    onClick={() => agenciaAvenida.auth.logout()}
                    title="Sair"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* SELETORES DE PROPRIEDADE / FRAÇÃO (Full width, alinhado à esquerda) */}
        <div className="mb-8 w-full">
          {perfilSelecionado === 'condomino' && fracoesUser.length > 0 && (
            <Select value={fracaoSelecionada} onValueChange={setFracaoSelecionada} disabled={fracoesUser.length <= 1}>
              <SelectTrigger className="w-full h-12 bg-muted/30 border-dashed text-sm font-semibold justify-start gap-3">
                <SelectValue placeholder="Selecione a Fração" />
              </SelectTrigger>
              <SelectContent>
                {fracoesUser.map(f => {
                  const cond = condominios.find(c => String(c.id) === String(f.condominio_id));
                  return <SelectItem key={f.id} value={f.id}>{cond ? cond.nome : 'Condomínio Desconhecido'} - Fração {f.codigo_fracao} ({f.descricao_piso_lado})</SelectItem>;
                })}
              </SelectContent>
            </Select>
          )}

          {perfilSelecionado === 'proprietario' && propriedadesDono.length > 0 && (
            <Select value={propriedadeSelecionada} onValueChange={setPropriedadeSelecionada} disabled={propriedadesDono.length <= 1}>
              <SelectTrigger className="w-full h-12 bg-muted/30 border-dashed text-sm font-semibold justify-start gap-3">
                <SelectValue placeholder="Selecione a Propriedade" />
              </SelectTrigger>
              <SelectContent>
                {propriedadesDono.map(p => <SelectItem key={p.id} value={p.id}>{p.morada}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {perfilSelecionado === 'inquilino' && propriedadesInquilino.length > 0 && (
            <Select value={propriedadeSelecionada} onValueChange={setPropriedadeSelecionada} disabled={propriedadesInquilino.length <= 1}>
              <SelectTrigger className="w-full h-12 bg-muted/30 border-dashed text-sm font-semibold justify-start gap-3">
                <SelectValue placeholder="Selecione a Propriedade" />
              </SelectTrigger>
              <SelectContent>
                {propriedadesInquilino.map(p => <SelectItem key={p.id} value={p.id}>{p.morada}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* COMPONENTES DE RESUMO DE CONTA */}
        {perfilSelecionado === 'condomino' && (
          <div className={`rounded-xl p-5 mb-8 border shadow-sm ${totalDividaQuotas > 0 ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
            <div className="flex items-center gap-3">
              {totalDividaQuotas > 0 ? (
                <div className="p-2 bg-red-100 rounded-lg"><Clock className="w-5 h-5 text-red-600" /></div>
              ) : (
                <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              )}
              <div>
                <p className={`font-black text-lg ${totalDividaQuotas > 0 ? 'text-red-800' : 'text-green-800'}`}>
                  {totalDividaQuotas > 0 ? `Quotas Vencidas: €${totalDividaQuotas.toFixed(2)}` : 'Situação Regularizada'}
                </p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  {emIncumprimentoQuotas.length > 0 ? `${emIncumprimentoQuotas.length} Quota(s) em Incumprimento` : (pendentes.length > 0 ? `${pendentes.length} Pagamento(s) Dentro do Prazo` : 'Sem Valores Pendentes')}
                </p>
              </div>
            </div>
          </div>
        )}

        {perfilSelecionado === 'inquilino' && (
          <div className={`rounded-xl p-5 mb-8 border shadow-sm ${totalDividaAtrasadaInquilino > 0 ? 'bg-red-50/50 border-red-100' : 'bg-green-50/50 border-green-100'}`}>
            <div className="flex items-center gap-3">
              {totalDividaAtrasadaInquilino > 0 ? (
                <div className="p-2 bg-red-100 rounded-lg"><Clock className="w-5 h-5 text-red-600" /></div>
              ) : (
                <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-5 h-5 text-green-600" /></div>
              )}
              <div>
                <p className={`font-black text-lg ${totalDividaAtrasadaInquilino > 0 ? 'text-red-800' : 'text-green-800'}`}>
                  {totalDividaAtrasadaInquilino > 0 ? `Rendas em Atraso: €${totalDividaAtrasadaInquilino.toFixed(2)}` : 'Situação Regularizada'}
                </p>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
                  {rendasAtrasadasInquilino.length > 0 ? `${rendasAtrasadasInquilino.length} mensalidade(s) em atraso` : 'Sem mensalidades em atraso'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TABS (Escondido para Proprietários) */}
        {perfilSelecionado !== 'proprietario' && (
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-8 shadow-inner">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold uppercase tracking-wider transition-all ${tab === id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        )}

        {/* TAB 1: CONTEÚDO FINANCEIRO */}
        {tab === 'estado' && (
          <div className="space-y-6">

            {/* FILTROS DE DATA (Layout Otimizado para ambas as vistas financeiras) */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b border-border pb-5 mb-5 w-full">
              <div className="flex items-center justify-between w-full lg:flex-1 bg-muted/30 border border-border rounded-xl h-12 px-3 shadow-sm">
                <div className="flex items-center gap-3 w-full pl-2">
                  <Input type="date" className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 w-auto p-0 text-foreground font-medium cursor-pointer" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest shrink-0">até</span>
                  <Input type="date" className="h-8 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 w-auto p-0 text-foreground font-medium cursor-pointer" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
                <div className="pl-3 border-l border-border shrink-0 ml-2">
                  <Button variant="ghost" size="icon" onClick={limparFiltrosDatas} className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors" title="Repor Ano Atual">
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {perfilSelecionado === 'proprietario' && (
                <Button size="sm" onClick={() => gerarPDFMock(`Extrato_Proprietario_${format(hoje, 'yyyyMMdd')}`)} className="bg-primary hover:bg-primary/90 text-primary-foreground font-black gap-2 text-xs uppercase tracking-wider shadow-sm shrink-0 h-12 w-full lg:w-auto px-6 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" /> Exportar Extrato
                </Button>
              )}
            </div>

            {/* VISÃO: CONDÓMINO */}
            {perfilSelecionado === 'condomino' && (
              <>
                {pendentes.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Valores a Pagamento</h3>
                    <div className="space-y-2">
                      {pendentes.map(q => (
                        <div key={q.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm hover:border-primary/20 transition-all">
                          <div>
                            <p className="font-bold text-foreground text-sm uppercase tracking-wide">
                              {q.descricao || q.tipo || 'Quota / Linha Faturação'}{formatarReferenciaData(q)}
                            </p>
                            <p className="text-xs font-medium text-muted-foreground mt-0.5">
                              Data Vencimento: {q.data_vencimento ? format(new Date(q.data_vencimento), 'dd/MM/yyyy') : 'Sem Data Específicada'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end">

                              {/* Linha principal com o Estado e o Valor Total da responsabilidade do utilizador */}
                              <div className="flex items-center gap-3">
                                <StatusBadge status={q.estado} />
                                <span className="font-black text-foreground text-base">€{(q.valor_calculado || 0).toFixed(2)}</span>
                              </div>

                              {/* Linhas de Pagamento Parcial (Só aparece se o utilizador já tiver pago uma parte) */}
                              {q.is_parcial_individual && (
                                <div className="mt-2 leading-none space-y-1 text-right border-t border-dashed border-border pt-2 w-full">
                                  <span className="block text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                    Pago por si: €{q.valor_pago_individual.toFixed(2)}
                                  </span>
                                  <span className="block text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                                    Falta pagar: €{(q.valor_calculado - q.valor_pago_individual).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3">Histórico de Pagamentos (No Período)</h3>
                  <div className="space-y-2">
                    {pagasFiltradas.map(q => (
                      <div key={q.id} className="bg-card rounded-xl border border-border p-4 flex items-center justify-between shadow-sm">
                        <div>
                          <p className="font-bold text-foreground text-sm uppercase tracking-wide">{q.descricao || q.tipo || 'Quota'}{formatarReferenciaData(q)}</p>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">Data Pagamento: {q.data_pagamento ? format(new Date(q.data_pagamento), 'dd/MM/yyyy') : 'Confirmado'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {q.recibo_url && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-md" title="Ver Recibo" onClick={() => handleOpenRecibos(q)}>
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                          <StatusBadge status="pago" />
                          <span className="font-black text-foreground text-base">€{(q.valor_calculado || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                    {pagasFiltradas.length === 0 && <div className="text-center text-muted-foreground py-8 text-s bg-muted/30 border border-dashed rounded-xl tracking-wider">Sem Pagamentos Registados</div>}
                  </div>
                </div>
              </>
            )}

            {/* VISÃO: PROPRIETÁRIO */}
            {perfilSelecionado === 'proprietario' && (
              <div>
                <div className="space-y-2">
                  {rendasDono.map(r => {
                    const pInfo = propriedades.find(p => String(p.id) === String(r.propriedade_id));
                    return (
                      <div key={r.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <p className="font-black text-foreground text-sm uppercase tracking-wide">{pInfo?.morada || 'PROPRIEDADE'} — {MESES_LABEL[r.mes - 1]} {r.ano}</p>
                          <p className="text-xs font-medium text-muted-foreground mt-0.5">Renda Acordada: €{(r.valor_renda || 0).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-dashed pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            {r.fechada ? (
                              <>
                                <p className="inline-block text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">Fecho Concluído</p>
                                <p className="font-black text-emerald-600 text-base mt-1">€{(r.valor_transferencia_proprietario || 0).toFixed(2)}</p>
                              </>
                            ) : (
                              <>
                                <p className="inline-block text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Pendente de Fecho</p>
                                <p className="font-bold text-muted-foreground text-sm mt-1">Disponível Após Fecho...</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {rendasDono.length === 0 && <div className="text-center text-muted-foreground py-8 text-xs font-bold bg-muted/30 border border-dashed rounded-xl uppercase tracking-wider">Nenhum lançamento no período selecionado.</div>}
                </div>
              </div>
            )}

            {/* VISÃO: INQUILINO */}
            {perfilSelecionado === 'inquilino' && (
              <div>
                <div className="space-y-2">
                  {rendasInquilinoFiltradas.map(r => {
                    const pInfo = propriedades.find(p => String(p.id) === String(r.propriedade_id));
                    const totalEncargos = calcularTotalEncargosRenda(r);
                    const totalArrendatario = (r.valor_renda || 0) + totalEncargos;
                    const pagoAteMomento = calcularTotalPagamentosRenda(r);
                    const liquidaCompleta = (totalArrendatario - pagoAteMomento) <= 0.005 && pagoAteMomento > 0;

                    return (
                      <div key={r.id} className="bg-card rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <p className="font-black text-foreground text-sm uppercase tracking-wide">{pInfo?.morada || 'PROPRIEDADE'} — {MESES_LABEL[r.mes - 1]} {r.ano}</p>
                          <div className="flex gap-2 mt-1 items-center flex-wrap">
                            <span className="text-[10px] font-bold text-muted-foreground">Renda: €{(r.valor_renda || 0).toFixed(2)}</span>
                            {totalEncargos > 0 && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Encargos: +€{totalEncargos.toFixed(2)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-dashed pt-2 sm:pt-0">
                          <div className="text-right flex items-center gap-3">
                            {liquidaCompleta && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-md" title="Descarregar Comprovativo de Pagamento" onClick={() => gerarPDFMock(`Comprovativo_Pagamento_Renda_${MESES_LABEL[r.mes - 1]}_${r.ano}`)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                            <div className="flex flex-col items-end">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border uppercase tracking-wider ${liquidaCompleta ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : (pagoAteMomento > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100')}`}>
                                {liquidaCompleta ? 'Paga' : (pagoAteMomento > 0 ? 'Parcial' : 'Pendente')}
                              </span>
                              <p className="font-black text-foreground text-base mt-1 leading-none">€{totalArrendatario.toFixed(2)}</p>

                              {/* Lógica de Pagamento Parcial */}
                              {pagoAteMomento > 0 && !liquidaCompleta && (
                                <div className="mt-1.5 leading-none space-y-0.5 text-right">
                                  <span className="block text-[10px] text-emerald-600 font-bold">
                                    Pago: €{pagoAteMomento.toFixed(2)}
                                  </span>
                                  <span className="block text-[10px] text-amber-600 font-bold">
                                    Falta: €{(totalArrendatario - pagoAteMomento).toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {rendasInquilinoFiltradas.length === 0 && <div className="text-center text-muted-foreground py-8 text-xs font-bold bg-muted/30 border border-dashed rounded-xl uppercase tracking-wider">Nenhum lançamento no período selecionado.</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DOCUMENTOS DO CONDOMÍNIO */}
        {tab === 'documentos' && perfilSelecionado === 'condomino' && (
          <div>
            <h2 className="font-normal text-xl tracking-wide mb-4 text-foreground">Documentos do Condomínio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {documentosCondominio.map(d => (
                <div key={d.id} className="bg-card rounded-xl border border-border p-4 flex items-start justify-between gap-3 shadow-sm hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm leading-snug">{d.titulo}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground/80 mt-1">{d.data}</p>
                    </div>
                  </div>
                  {d.ficheiro_url ? (
                    <a href={d.ficheiro_url} target="_blank" rel="noopener noreferrer" download className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex-shrink-0 mt-0.5 shadow-sm">
                      <Download className="w-3.5 h-3.5" /> Descarregar
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground flex-shrink-0 mt-1 italic">Sem anexo</span>
                  )}
                </div>
              ))}
              {documentosCondominio.length === 0 && <p className="col-span-full text-center text-muted-foreground py-12 text-sm bg-card border border-dashed rounded-xl font-bold uppercase tracking-wider">Nenhum Documento Disponível</p>}
            </div>
          </div>
        )}

        {/* TAB 3: OCORRÊNCIAS */}
        {tab === 'ocorrencias' && perfilSelecionado !== 'proprietario' && (
          <div>
            <div className="flex items-center justify-between mb-4">
            <h2 className="font-normal text-xl tracking-wide text-foreground">Acompanhamento de Pedidos e Ocorrências</h2>
              <Button size="sm" className="gap-2 text-sm tracking-wider" onClick={() => setShowOcorrForm(true)}>
                <Plus className="w-4 h-4" />Criar Pedido / Reportar Assunto
              </Button>
            </div>

            {showOcorrForm && (
              <div className="bg-card rounded-xl border border-border p-5 mb-6 shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black tracking-wide text-lg text-foreground">Novo Pedido à Agência Avenida</h3>
                  <button onClick={() => setShowOcorrForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Label className="text-xs uppercase tracking-wider">Título Resumido *</Label>
                    <Input className="mt-1 bg-background" value={ocorrForm.titulo} onChange={e => setOcorrForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ex: Infiltração / Dúvida no Recibo" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs uppercase tracking-wider">Tipo de Assunto</Label>
                    <Select value={ocorrForm.tipo} onValueChange={v => setOcorrForm(p => ({ ...p, tipo: v }))}>
                      <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[260]">
                        <SelectItem value="avaria">Avaria ou Reparação Técnica</SelectItem>
                        <SelectItem value="manutencao">Manutenção</SelectItem>
                        <SelectItem value="limpeza">Limpeza</SelectItem>
                        <SelectItem value="seguranca">Segurança</SelectItem>
                        <SelectItem value="duvidas_faturacao">Dúvidas de Faturação</SelectItem>
                        <SelectItem value="atualizacao_dados">Atualização de Dados Fiscais/Gerais</SelectItem>
                        <SelectItem value="associar_dados">Associar Dados Portal Condómino</SelectItem>
                        <SelectItem value="outro">Outro Assunto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="text-xs uppercase tracking-wider">Mensagem e Detalhes</Label>
                    <textarea className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[110px] resize-y" value={ocorrForm.descricao} onChange={e => setOcorrForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Descreva a sua questão de forma detalhada..." />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-5 border-t border-border pt-3">
                  <Button variant="outline" size="sm" className="text-sm" onClick={() => { setShowOcorrForm(false); setOcorrForm({ titulo: '', descricao: '', tipo: 'avaria', prioridade: 'normal' }); }}>Cancelar</Button>
                  <Button size="sm" className="text-sm shadow-sm" onClick={handleSubmitOcorrencia} disabled={!ocorrForm.titulo || !ocorrForm.descricao}>Submeter Ocorrência/Pedido</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {ocorrencias.filter(o => o.reportada_por === user?.email).map(o => (
                <div key={o.id} className="bg-card rounded-xl border border-border p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2 border-b border-border border-dashed pb-2">
                    <div>
                      <p className="font-bold text-foreground text-sm uppercase tracking-wide">{o.titulo}</p>
                      <span className="text-[10px] uppercase font-black text-muted-foreground/80 bg-muted px-2 py-0.5 rounded-md inline-block mt-1">{o.tipo}</span>
                    </div>
                    <StatusBadge status={o.estado} />
                  </div>
                  {o.descricao && <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 p-3 rounded-lg border">{o.descricao}</p>}

                  {o.resposta_cliente && (
                    <div className="bg-primary/5 border border-primary/10 rounded-lg p-3.5 space-y-1">
                      <p className="text-xs font-black text-primary uppercase tracking-wider">Resposta da Administração:</p>
                      <p className="text-sm text-foreground font-medium leading-relaxed">{o.resposta_cliente}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider pt-1">
                    <span>Abertura: {o.data_abertura ? format(new Date(o.data_abertura), 'dd/MM/yyyy') : '—'}</span>
                  </div>
                </div>
              ))}
              {ocorrencias.filter(o => o.reportada_por === user?.email).length === 0 && (
                <div className="text-center text-muted-foreground py-12 text-m bg-card border border-dashed rounded-xl tracking-wider">Nenhuma Ocorrência/Pedido Registados</div>
              )}
            </div>
          </div>
        )}

      </div>

      <Dialog open={recibosModalOpen} onOpenChange={setRecibosModalOpen}>
        <DialogContent className="max-w-md rounded-xl no-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 uppercase tracking-wide font-black text-base">Ficheiros de Recibo Disponíveis</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2 leading-relaxed">Foram emitidos múltiplos comprovativos. Selecione qual deseja consultar:</p>
            {recibosList.map((url, idx) => (
              <Button key={idx} variant="outline" className="w-full justify-between font-bold h-11" onClick={() => window.open(url, '_blank')}>
                <span>Documento de Recibo #{idx + 1}</span>
                <Download className="w-4 h-4 text-primary" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPessoaModal} onOpenChange={setShowPessoaModal}>
        <DialogContent className="max-w-sm no-scrollbar rounded-xl">
          {pessoaParaMostrar && (
            <>
              <DialogHeader>
                <DialogTitle className="font-black text-base uppercase tracking-wider text-foreground">Dados de Contacto</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-3 border-t border-border pt-3">
                <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Nome Completo</p><p className="font-bold text-foreground text-base leading-tight">{pessoaParaMostrar.nome}</p></div>
                {pessoaParaMostrar.telefone && <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Contacto Telefónico</p><p className="text-sm font-semibold text-foreground">{pessoaParaMostrar.telefone}</p></div>}
                {pessoaParaMostrar.email && <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Endereço Eletrónico</p><p className="text-sm font-semibold text-foreground">{pessoaParaMostrar.email}</p></div>}
                {pessoaParaMostrar.nif && <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">NIF / Número Fiscal</p><p className="text-sm font-semibold text-foreground">{pessoaParaMostrar.nif}</p></div>}
                {pessoaParaMostrar.iban && <div><p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">IBAN Registado</p><p className="text-xs font-mono font-bold text-foreground bg-muted p-2 rounded border truncate">{pessoaParaMostrar.iban}</p></div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}