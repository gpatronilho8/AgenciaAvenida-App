import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { useCondominio } from '@/lib/CondominioContext';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings, Plus, Search, Check, ChevronsUpDown, Mail, Download, Trash2, Banknote, FileText, Zap, AlertCircle, BarChart2, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import MapaQuotas from '@/components/quotas/MapaQuotas';

// Helpers
const mesesExtenso = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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

const getOwners = (f) => {
  if (!f) return [];
  if (Array.isArray(f.titulares)) return f.titulares;
  if (typeof f.titulares === 'string') {
    try { return JSON.parse(f.titulares); } catch (e) { return [f.titulares]; }
  }
  if (f.pessoa_id) return [f.pessoa_id];
  if (f.proprietario_id) return [f.proprietario_id];
  return [];
};

const formatFracao = (f) => f ? `${f.codigo_fracao} (${f.descricao_piso_lado || ''})` : '-';

const emptyConfig = { condominio_id: '', tipo: 'mensal', valor_mensal: 0, valor_total: 0, repeticoes: 1, modo_divisao: 'fixo', descricao: '', mes_inicio: new Date().getMonth() + 1, ano_inicio: new Date().getFullYear() };
const emptyQuota = { condominio_id: '', fracao_id: '', tipo: 'mensal', descricao: '', valor: 0, mes: new Date().getMonth() + 1, ano: new Date().getFullYear() };

const gerarReciboTeste = () => {
  const pdfContent = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(PDF RECIBO TEST OK) Tj\nET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000229 00000 n \n0000000317 00000 n \ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n412\n%%EOF";
  const blob = new Blob([pdfContent], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Recibo_Pagamento_TESTE.pdf';
  a.click();
  URL.revokeObjectURL(url);
};

export default function Quotas() {
  const qc = useQueryClient();
  const { selectedCondominioId, selectedAno } = useCondominio();

  // Estados de UI
  const [search, setSearch] = useState('');
  const [filtroMes, setFiltroMes] = useState(String(new Date().getMonth() + 1));
  const [filtroFracao, setFiltroFracao] = useState('all');

  const [openConfig, setOpenConfig] = useState(false);
  const [openNova, setOpenNova] = useState(false);
  const [openPagamento, setOpenPagamento] = useState(false);
  const [openDivida, setOpenDivida] = useState(false);
  const [openRecibo, setOpenRecibo] = useState(null);
  const [openDelete, setOpenDelete] = useState(null);

  // Estados de Formulários
  const [configForm, setConfigForm] = useState(emptyConfig);
  const [quotaForm, setQuotaForm] = useState(emptyQuota);
  const [dividaForm, setDividaForm] = useState({ id: null, fracao_id: '', valor: '', descricao: 'Dívida Externa Transitada' });

  const [comboCondominioOpen, setComboCondominioOpen] = useState(false);
  const [comboCondominioNovaOpen, setComboCondominioNovaOpen] = useState(false);
  const [comboCondominoOpen, setComboCondominoOpen] = useState(false);

  // Estados Pagamentos
  const [pagamentoFiltro, setPagamentoFiltro] = useState('fracao');
  const [pagamentoAlvoId, setPagamentoAlvoId] = useState('');
  const [tipoLiquidacao, setTipoLiquidacao] = useState('total');
  const [quotasSelecionadas, setQuotasSelecionadas] = useState([]);
  const [valorPagoManual, setValorPagoManual] = useState("0.00");

  // Queries
  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });
  const { data: quotas = [], isLoading } = useQuery({ queryKey: ['quotas'], queryFn: () => agenciaAvenida.entities.Quota.list() });
  const { data: configuracoesAtuais = [] } = useQuery({ queryKey: ['configuracoes_quotas'], queryFn: () => agenciaAvenida.entities.ConfiguracaoQuota.list() });

  // Derivados
  const condominiosAtivos = condominios.filter(c => c && c.ativo !== false && c.ativo !== 'false').sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || ''), undefined, { numeric: true, sensitivity: 'base' }));
  const fracoesCondominio = fracoes.filter(f => f.condominio_id === quotaForm.condominio_id);
  const fracoesDoCondominioAtual = fracoes.filter(f => selectedCondominioId === 'all' || f.condominio_id === selectedCondominioId);
  const condominosAtivos = pessoas.filter(p => normalizeTipoPessoa(p.tipo).includes('condomino'));

  // Filtros da Tabela Principal
  const quotasFiltradas = quotas.filter(q => {
    if (selectedAno !== 'all' && q.ano !== null && q.ano !== selectedAno) return false;
    if (selectedCondominioId !== 'all' && q.condominio_id !== selectedCondominioId) return false;
    if (filtroMes !== 'all' && q.mes !== null && String(q.mes) !== filtroMes) return false;
    if (filtroFracao !== 'all' && q.fracao_id !== filtroFracao) return false;

    const fracao = fracoes.find(f => f.id === q.fracao_id);
    const termo = search.toLowerCase();
    const matchFracao = fracao?.codigo_fracao?.toLowerCase().includes(termo) || fracao?.descricao_piso_lado?.toLowerCase().includes(termo);
    const matchDesc = q.descricao?.toLowerCase().includes(termo);
    return !search || matchFracao || matchDesc;
  });

  const isConfigValid = configForm.condominio_id && (
    (configForm.tipo === 'mensal' && configForm.valor_mensal > 0) ||
    (configForm.tipo === 'permilagem' && configForm.valor_total > 0) ||
    (configForm.tipo === 'extraordinaria' && configForm.valor_total > 0 && configForm.descricao?.trim().length > 0 && configForm.repeticoes > 0)
  );

  // MUTAÇÕES
  const deleteQuota = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Quota.delete(id),
    onSuccess: () => { qc.invalidateQueries(['quotas']); setOpenDelete(null); toast.success('Registo eliminado.'); }
  });

  const deleteConfig = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.ConfiguracaoQuota.delete(id),
    onSuccess: () => { qc.invalidateQueries(['configuracoes_quotas']); toast.success('Configuração eliminada.'); }
  });

  const saveConfig = useMutation({
    mutationFn: async (dados) => {
      const payload = { ...dados };
      if (payload.tipo === 'mensal') { payload.valor_total = 0; payload.repeticoes = 1; payload.descricao = ''; }
      else if (payload.tipo === 'permilagem') { payload.valor_mensal = 0; payload.repeticoes = 1; payload.descricao = ''; }
      else if (payload.tipo === 'extraordinaria') { payload.valor_mensal = 0; }
      return await agenciaAvenida.entities.ConfiguracaoQuota.create(payload);
    },
    onSuccess: () => {
      setOpenConfig(false);
      qc.invalidateQueries(['configuracoes_quotas']);
      toast.success('Configuração guardada com sucesso!');
    },
    onError: (e) => toast.error('Erro: ' + e.message)
  });

  const lancarLinha = useMutation({
    mutationFn: async (dados) => {
      const dataUltimoDia = new Date(dados.ano, dados.mes, 0);
      const dataHoje = new Date().toISOString().split('T')[0];
      const payload = {
        condominio_id: dados.condominio_id,
        fracao_id: dados.fracao_id,
        tipo: dados.tipo,
        descricao: dados.tipo === 'linha_faturacao' ? dados.descricao : 'Quota + FCR',
        valor: parseFloat(dados.valor),
        mes: dados.mes,
        ano: dados.ano,
        data_emissao: dataHoje,
        data_vencimento: `${dataUltimoDia.getFullYear()}-${String(dataUltimoDia.getMonth() + 1).padStart(2, '0')}-${String(dataUltimoDia.getDate()).padStart(2, '0')}`,
        estado: 'pendente'
      };
      return await agenciaAvenida.entities.Quota.create(payload);
    },
    onSuccess: () => { setOpenNova(false); qc.invalidateQueries({ queryKey: ['quotas'] }); toast.success('Linha lançada!'); },
    onError: (e) => toast.error('Erro: ' + e.message)
  });

  const registarDivida = useMutation({
    mutationFn: async (dados) => {
      const dataHoje = new Date().toISOString().split('T')[0];
      const payload = {
        condominio_id: selectedCondominioId,
        fracao_id: dados.fracao_id,
        tipo: 'linha_faturacao_divida',
        descricao: dados.descricao || 'Dívida Externa Transitada',
        valor: parseFloat(dados.valor),
        mes: null,
        ano: null,
        data_emissao: dataHoje,
        data_vencimento: null,
        estado: 'vencida'
      };

      if (dados.id) {
        return await agenciaAvenida.entities.Quota.update(dados.id, { valor: payload.valor, descricao: payload.descricao, estado: 'vencida', data_vencimento: null, mes: null, ano: null });
      } else {
        return await agenciaAvenida.entities.Quota.create(payload);
      }
    },
    onSuccess: () => {
      setOpenDivida(false);
      setDividaForm({ id: null, fracao_id: '', valor: '', descricao: 'Dívida Externa Transitada' });
      qc.invalidateQueries({ queryKey: ['quotas'] });
      toast.success('Dívida registada com sucesso!');
    },
    onError: (e) => toast.error('Erro: ' + e.message)
  });

  const registarPagamento = useMutation({
    mutationFn: async () => {
      const primeiraQuota = pendentesReais.find(q => quotasSelecionadas.includes(q.id)) || pendentesReais[0];
      const idCondominio = primeiraQuota?.condominio_id || selectedCondominioId;
      const idFracao = primeiraQuota?.fracao_id || (pagamentoFiltro === 'fracao' ? pagamentoAlvoId : null);
      
      const dataHoje = new Date().toISOString().split('T')[0];
      const valorManual = parseFloat(valorPagoManual) || 0;

      const selecionadas = pendentesReais.filter(q => quotasSelecionadas.includes(q.id));
      const creditosSelecionados = selecionadas.filter(q => q.valor < 0);
      const debitosSelecionados = selecionadas.filter(q => q.valor > 0);

      let valorDisponivel = valorManual + Math.abs(creditosSelecionados.reduce((acc, q) => acc + q.valor, 0));
      const promises = [];

      for (const c of creditosSelecionados) {
        promises.push(agenciaAvenida.entities.Quota.update(c.id, { estado: 'pago' }));
      }

      for (const d of debitosSelecionados) {
        const valorEmFalta = d.valor - (d.valor_pago || 0);
        if (valorDisponivel >= valorEmFalta) {
            promises.push(agenciaAvenida.entities.Quota.update(d.id, { estado: 'pago', valor_pago: d.valor }));
            valorDisponivel -= valorEmFalta;
        } else if (valorDisponivel > 0) {
            promises.push(agenciaAvenida.entities.Quota.update(d.id, { valor_pago: (d.valor_pago || 0) + valorDisponivel }));
            valorDisponivel = 0;
        }
      }

      if (valorDisponivel > 0.005 && idFracao) {
         const existingCredit = quotas.find(q => q.fracao_id === idFracao && q.tipo === 'linha_faturacao_credito' && q.estado === 'pendente' && !quotasSelecionadas.includes(q.id));
         if (existingCredit) {
            promises.push(agenciaAvenida.entities.Quota.update(existingCredit.id, { valor: existingCredit.valor - valorDisponivel }));
         } else {
            promises.push(agenciaAvenida.entities.Quota.create({
                condominio_id: idCondominio,
                fracao_id: idFracao,
                tipo: 'linha_faturacao_credito',
                descricao: 'Crédito (Pagamento Não Alocado)',
                valor: -valorDisponivel,
                mes: null, ano: null, data_emissao: dataHoje, data_vencimento: null, estado: 'pendente'
            }));
         }
      }

      if (valorManual > 0) {
        const novoMovimento = {
            condominio_id: idCondominio,
            tipo: 'receita',
            categoria: 'quota',
            descricao: `Liquidação de Quotas - ${pagamentoFiltro === 'fracao' ? 'Fração' : 'Condómino'}`,
            valor: valorManual,
            data: dataHoje,
            estado: 'efetivado',
            conta: 'banco'
        };
        await agenciaAvenida.entities.Movimento.create(novoMovimento);
      }
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotas'] });
      qc.invalidateQueries({ queryKey: ['movimentos'] });

      toast.success('Processamento concluído com sucesso!');
      if ((parseFloat(valorPagoManual) || 0) > 0) toast.info('Email enviado ao condómino.', { icon: <Mail className="w-4 h-4" /> });
      gerarReciboTeste();

      handleClosePagamento();
    },
    onError: (error) => toast.error('Erro no processamento: ' + error.message)
  });

  const updConfig = (k, v) => setConfigForm(p => ({ ...p, [k]: v }));
  const updQuota = (k, v) => setQuotaForm(p => ({ ...p, [k]: v }));

  const handleOpenConfig = () => { setConfigForm({ ...emptyConfig, condominio_id: selectedCondominioId !== 'all' ? selectedCondominioId : '' }); setOpenConfig(true); };
  const handleOpenNova = () => { setQuotaForm({ ...emptyQuota, condominio_id: selectedCondominioId !== 'all' ? selectedCondominioId : '' }); setOpenNova(true); };
  const handleClosePagamento = () => { setOpenPagamento(false); setPagamentoFiltro('fracao'); setPagamentoAlvoId(''); setQuotasSelecionadas([]); setTipoLiquidacao('total'); setValorPagoManual("0.00"); };

  const handleSelectFracaoDivida = (fracaoId) => {
    const dividaExistente = quotas.find(q =>
      q.fracao_id === fracaoId &&
      q.tipo === 'linha_faturacao_divida' &&
      (q.estado === 'pendente' || q.estado === 'vencida') &&
      q.ano === null
    );

    if (dividaExistente) {
      setDividaForm({ id: dividaExistente.id, fracao_id: fracaoId, valor: dividaExistente.valor, descricao: dividaExistente.descricao });
    } else {
      setDividaForm({ id: null, fracao_id: fracaoId, valor: '', descricao: 'Dívida Externa Transitada' });
    }
  };

  let pendentesReais = [];
  let numTitulares = 1;

  if (pagamentoAlvoId) {
    if (pagamentoFiltro === 'fracao') {
      pendentesReais = quotas.filter(q => (q.estado === 'pendente' || q.estado === 'vencida') && q.fracao_id === pagamentoAlvoId);
      const fracaoSel = fracoes.find(f => f.id === pagamentoAlvoId);
      const owners = getOwners(fracaoSel);
      numTitulares = owners.length > 0 ? owners.length : 1;
    } else {
      const fracoesDaPessoa = fracoes.filter(f => getOwners(f).includes(pagamentoAlvoId)).map(f => f.id);
      pendentesReais = quotas.filter(q => (q.estado === 'pendente' || q.estado === 'vencida') && fracoesDaPessoa.includes(q.fracao_id));
      numTitulares = 1;
    }
  }

  const toggleSelectQuota = (id) => setQuotasSelecionadas(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const divisor = (tipoLiquidacao === 'parcial' && numTitulares > 1) ? numTitulares : 1;
  
  const totalSelecionado = pendentesReais
    .filter(q => quotasSelecionadas.includes(q.id))
    .reduce((acc, curr) => acc + ((curr.valor - (curr.valor_pago || 0)) / divisor), 0);

  useEffect(() => {
    setValorPagoManual(totalSelecionado.toFixed(2));
  }, [totalSelecionado]);

  return (
    <div className="space-y-6 relative z-10">
      <PageHeader
        title="Quotas e Faturação"
        subtitle="Gestão de quotas mensais, extraordinárias e processamento de pagamentos."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleOpenNova}><Plus className="w-4 h-4" /> Nova Quota</Button>
            <Button variant="secondary" className="gap-2 bg-muted text-muted-foreground" onClick={handleOpenConfig}><Settings className="w-4 h-4" /> Configurar Quotas</Button>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-center w-full">
        <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2" onClick={() => setOpenPagamento(true)}>
          <Banknote className="w-5 h-5" /> Efetuar Pagamento / Emitir Recibo
        </Button>
        {selectedCondominioId !== 'all' && (
          <Button size="lg" variant="destructive" className="shadow-md gap-2" onClick={() => { setDividaForm({ id: null, fracao_id: '', valor: '', descricao: 'Dívida Externa Transitada' }); setOpenDivida(true); }}>
            <TrendingDown className="w-5 h-5" /> Gerir Dívida Externa
          </Button>
        )}
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2" onClick={() => toast.success('Download do Extrato CC iniciado.')}>
          <FileText className="w-5 h-5" /> Emitir Extrato CC
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 bg-muted/20">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 w-full bg-background" placeholder="Pesquisar por fração ou descrição..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={filtroMes} onValueChange={setFiltroMes}>
              <SelectTrigger className="w-full sm:w-[160px] bg-background">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Meses</SelectItem>
                {mesesExtenso.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filtroFracao} onValueChange={setFiltroFracao} disabled={selectedCondominioId === 'all'}>
              <SelectTrigger className="w-full sm:w-[180px] bg-background">
                <SelectValue placeholder="Fração" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="all">Todas as Frações</SelectItem>
                {fracoesDoCondominioAtual.map(f => <SelectItem key={f.id} value={f.id}>{formatFracao(f)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold">
              <tr>
                <th className="px-4 py-3">Fração</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Valor Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">A carregar quotas...</td></tr>
              ) : quotasFiltradas.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-muted-foreground">Nenhuma Quota Encontrada com os Filtros Atuais</td></tr>
              ) : (
                quotasFiltradas.map(q => {
                  const fracao = fracoes.find(f => f.id === q.fracao_id);
                  const descBase = q.tipo === 'mensal' ? 'Quota + FCR' : (q.descricao || 'Quota');
                  const descFinal = (q.tipo === 'mensal' && q.mes) ? `${descBase} (${mesesExtenso[q.mes-1]} ${q.ano})` : descBase;
                  const displayVencimento = q.data_vencimento || (q.mes ? `${String(q.mes).padStart(2, '0')}/${q.ano}` : 'Sem Limite');

                  return (
                    <tr key={q.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-primary">{formatFracao(fracao)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{descFinal}</td>
                      <td className="px-4 py-3 text-muted-foreground">{displayVencimento}</td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-foreground">€{(q.valor || 0).toFixed(2)}</span>
                        {(q.valor_pago > 0 && q.estado !== 'pago') && (
                          <div className="mt-1 leading-none space-y-0.5">
                            <span className="block text-[10px] text-emerald-600 font-bold">
                              Pagamento Parcial: €{q.valor_pago.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-amber-600 mt-0.5 font-bold">
                              Valor Restante: €{(q.valor - q.valor_pago).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border",
                          q.estado === 'pago' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            q.estado === 'vencida' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                        )}>
                          {q.estado === 'pago' ? 'Pago' : q.estado === 'vencida' ? 'Vencida' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 cursor-pointer relative z-20" onClick={() => setOpenRecibo(q)} title="Consultar Recibo">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 cursor-pointer relative z-20" onClick={() => setOpenDelete(q)} title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCondominioId === 'all' ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground">Mapa Anual Indisponível</h3>
          <p className="text-sm text-muted-foreground mt-1">Selecione um condomínio específico na barra superior para visualizar o mapa anual de quotas e dívidas.</p>
        </div>
      ) : fracoesDoCondominioAtual.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-sm">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-foreground">Sem Frações</h3>
          <p className="text-sm text-muted-foreground mt-1">Este condomínio não tem frações. Adicione frações para visualizar o mapa.</p>
        </div>
      ) : (
        <MapaQuotas
          condominioId={selectedCondominioId}
          fracoes={fracoesDoCondominioAtual}
          quotas={quotas}
          pessoas={pessoas}
          ano={selectedAno}
        />
      )}

      {/* DIALOG: GERIR DÍVIDA EXTERNA */}
      <Dialog open={openDivida} onOpenChange={setOpenDivida}>
        <DialogContent className="w-[92vw] sm:max-w-md rounded-xl p-5 z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600"><TrendingDown className="w-5 h-5" /> Registar Dívida Externa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Fração / Titular *</Label>
              <Select value={dividaForm.fracao_id} onValueChange={handleSelectFracaoDivida}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione a fração em dívida..." /></SelectTrigger>
                <SelectContent className="max-h-48 z-[210]">
                  {fracoesDoCondominioAtual.map(f => {
                    const ownerIds = getOwners(f);
                    const ownerName = ownerIds.length > 0 ? pessoas.find(p => p.id === ownerIds[0])?.nome || 'Sem Titular' : 'Sem Titular';
                    return <SelectItem key={f.id} value={f.id}>{formatFracao(f)} - {ownerName}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montante em Dívida (€) *</Label>
              <Input type="number" className="mt-1" placeholder="0.00" value={dividaForm.valor} onChange={e => setDividaForm(p => ({ ...p, valor: e.target.value }))} />
              {dividaForm.id && <p className="text-[10px] text-amber-600 mt-1 font-bold">Esta fração já tem uma dívida pendente. Este valor irá substitui-la.</p>}
            </div>
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1" value={dividaForm.descricao} onChange={e => setDividaForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
          </div>
          <DialogFooter className="mt-5 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setOpenDivida(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={!dividaForm.fracao_id || parseFloat(dividaForm.valor) <= 0 || !dividaForm.valor || registarDivida.isPending}
              onClick={() => registarDivida.mutate(dividaForm)}
            >
              {registarDivida.isPending ? 'A Guardar...' : (dividaForm.id ? 'Atualizar Dívida' : 'Registar Dívida')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIGURAÇÃO DE QUOTAS */}
      <Dialog open={openConfig} onOpenChange={setOpenConfig}>
        <DialogContent className="w-[92vw] sm:max-w-xl max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5 z-[200]">
          <DialogHeader>
            <DialogTitle>Configuração de Quotas</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">

            <div className="flex flex-col gap-1.5">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioOpen} onOpenChange={setComboCondominioOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioOpen} className="w-full justify-between font-normal bg-background mt-1">
                    {configForm.condominio_id ? condominiosAtivos.find(c => c.id === configForm.condominio_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio não encontrado.</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { updConfig('condominio_id', c.id); setComboCondominioOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", configForm.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Tipo de Configuração</Label>
              <Select value={configForm.tipo} onValueChange={v => updConfig('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="mensal">Mensal (Valor Fixo)</SelectItem>
                  <SelectItem value="permilagem">Mensal (Permilagem)</SelectItem>
                  <SelectItem value="extraordinaria">Extraordinária</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {configForm.tipo === 'extraordinaria' && (
              <div className="space-y-4 border-t pt-3 mt-1">
                <div>
                  <Label>Descrição da Quota Extraordinária *</Label>
                  <Input className="mt-1" value={configForm.descricao || ''} onChange={e => updConfig('descricao', e.target.value)} placeholder="Ex: Obras Telhado 2026..." />
                </div>
                <div>
                  <Label>Valor Total Global (€) *</Label>
                  <Input className="mt-1" type="number" value={configForm.valor_total || ''} onChange={e => updConfig('valor_total', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Modo de Divisão</Label>
                    <Select value={configForm.modo_divisao || 'fixo'} onValueChange={v => updConfig('modo_divisao', v)}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210]">
                        <SelectItem value="fixo">Divisão Fixo Igual</SelectItem>
                        <SelectItem value="permilagem">Por Permilagem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duração (Meses)</Label>
                    <Input className="mt-1" type="number" min={1} value={configForm.repeticoes || ''} onChange={e => updConfig('repeticoes', parseInt(e.target.value) || '')} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês de Início</Label>
                    <Select value={String(configForm.mes_inicio)} onValueChange={v => updConfig('mes_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210] no-scrollbar max-h-36">
                        {mesesExtenso.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano de Início</Label>
                    <Select value={String(configForm.ano_inicio)} onValueChange={v => updConfig('ano_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210]">
                        {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {configForm.tipo === 'mensal' && (
              <div className="space-y-4 border-t pt-3 mt-1">
                <div>
                  <Label>Valor da Quota Mensal (Quota + FCR) (€)</Label>
                  <Input className="mt-1" type="number" value={configForm.valor_mensal || ''} onChange={e => updConfig('valor_mensal', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês de Início</Label>
                    <Select value={String(configForm.mes_inicio)} onValueChange={v => updConfig('mes_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210] no-scrollbar max-h-36">
                        {mesesExtenso.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano de Início</Label>
                    <Select value={String(configForm.ano_inicio)} onValueChange={v => updConfig('ano_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210]">
                        {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {configForm.tipo === 'permilagem' && (
              <div className="space-y-4 border-t pt-3 mt-1">
                <div>
                  <Label>Valor Total do Orçamento Anual (€)</Label>
                  <Input className="mt-1" type="number" value={configForm.valor_total || ''} onChange={e => updConfig('valor_total', parseFloat(e.target.value) || 0)} placeholder="0.00" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês de Início</Label>
                    <Select value={String(configForm.mes_inicio)} onValueChange={v => updConfig('mes_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210] no-scrollbar max-h-36">
                        {mesesExtenso.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano de Início</Label>
                    <Select value={String(configForm.ano_inicio)} onValueChange={v => updConfig('ano_inicio', parseInt(v))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[210]">
                        {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {configForm.condominio_id && (
              <div className="mt-8 border-t pt-4">
                <Label className="text-muted-foreground uppercase tracking-wider text-xs mb-3 block">Configurações Atuais no Sistema</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                  {configuracoesAtuais.filter(c => c.condominio_id === configForm.condominio_id).length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">Nenhuma configuração registada.</p>
                  ) : (
                    configuracoesAtuais.filter(c => c.condominio_id === configForm.condominio_id).map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-muted/50 p-2.5 rounded-lg border border-border">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-foreground">
                            {c.tipo === 'mensal' ? 'Mensal Fixo' : c.tipo === 'permilagem' ? 'Mensal (Permilagem)' : c.descricao} &bull; €{(c.tipo === 'mensal' ? (c.valor_mensal || 0) : (c.valor_total || 0)).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Início: {String(c.mes_inicio).padStart(2, '0')}/{c.ano_inicio}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-100 rounded-md" onClick={() => deleteConfig.mutate(c.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>
          <DialogFooter className="mt-4 pt-4 border-t border-border gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setOpenConfig(false)} disabled={saveConfig.isPending}>Cancelar</Button>
            <Button onClick={() => saveConfig.mutate(configForm)} disabled={saveConfig.isPending || !isConfigValid}>
              {saveConfig.isPending ? 'A guardar...' : 'Guardar Configuração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA QUOTA / LINHA MANUAL */}
      <Dialog open={openNova} onOpenChange={setOpenNova}>
        <DialogContent className="w-[92vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5 z-[200]">
          <DialogHeader>
            <DialogTitle>Lançar Linha Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Condomínio *</Label>
              <Popover open={comboCondominioNovaOpen} onOpenChange={setComboCondominioNovaOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={comboCondominioNovaOpen} className="w-full justify-between font-normal bg-background mt-1">
                    {quotaForm.condominio_id ? condominiosAtivos.find(c => c.id === quotaForm.condominio_id)?.nome : "Selecione ou pesquise..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0 w-[--radix-popover-trigger-width] z-[210]" align="start">
                  <Command>
                    <CommandInput placeholder="Pesquisar condomínio..." />
                    <CommandEmpty>Condomínio Não Encontrado</CommandEmpty>
                    <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                      {condominiosAtivos.map(c => (
                        <CommandItem key={c.id} value={`${c.nome} ${c.codigo || ''}`} onSelect={() => { updQuota('condominio_id', c.id); updQuota('fracao_id', ''); setComboCondominioNovaOpen(false); }}>
                          <Check className={cn("mr-2 h-4 w-4", quotaForm.condominio_id === c.id ? "opacity-100" : "opacity-0")} />
                          {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                          {c.nome}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Fração *</Label>
              <Select disabled={!quotaForm.condominio_id || fracoesCondominio.length === 0} value={quotaForm.fracao_id} onValueChange={v => updQuota('fracao_id', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={!quotaForm.condominio_id ? "Selecione o condomínio" : (fracoesCondominio.length === 0 ? "Não Existem Frações" : "Selecione a fração")} />
                </SelectTrigger>
                <SelectContent className="z-[210] no-scrollbar max-h-40">
                  {fracoesCondominio.map(f => (
                    <SelectItem key={f.id} value={f.id}>{formatFracao(f)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo</Label>
              <Select value={quotaForm.tipo} onValueChange={v => updQuota('tipo', v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent className="z-[210]">
                  <SelectItem value="mensal">Mensal Pontual</SelectItem>
                  <SelectItem value="linha_faturacao">Linha de Faturação (Taxas / Outros Itens)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {quotaForm.tipo === 'linha_faturacao' ? (
              <div>
                <Label>Descrição da Linha</Label>
                <Input className="mt-1" value={quotaForm.descricao} onChange={e => updQuota('descricao', e.target.value)} placeholder="Ex: Taxa de Atraso..." />
              </div>
            ) : (
              <div>
                <Label>Descrição da Quota</Label>
                <Input className="mt-1 bg-muted text-muted-foreground font-medium" disabled value="Quota + FCR" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Valor da Linha (€) *</Label>
                <Input className="mt-1" type="number" value={quotaForm.valor || ''} onChange={e => updQuota('valor', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Mês Referência</Label>
                <Select value={String(quotaForm.mes)} onValueChange={v => updQuota('mes', parseInt(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210] no-scrollbar max-h-36">
                    {mesesExtenso.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ano Referência</Label>
                <Select value={String(quotaForm.ano)} onValueChange={v => updQuota('ano', parseInt(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    {[2025, 2026, 2027, 2028].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-5 pt-4 border-t border-border gap-2 sm:gap-0">
             <Button variant="outline" onClick={() => setOpenNova(false)} disabled={lancarLinha.isPending}>Cancelar</Button>
             <Button 
                disabled={!quotaForm.condominio_id || !quotaForm.fracao_id || parseFloat(quotaForm.valor || 0) <= 0 || lancarLinha.isPending} 
                onClick={() => lancarLinha.mutate(quotaForm)}
             >
               {lancarLinha.isPending ? 'A Lançar...' : 'Lançar Linha'}
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL EFETUAR PAGAMENTO */}
      <Dialog open={openPagamento} onOpenChange={(val) => { if (!val) handleClosePagamento(); else setOpenPagamento(true); }}>
        <DialogContent className="w-[94vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-6 z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-emerald-600" /> Registar Pagamento & Emissão de Recibo</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-muted/40 p-4 rounded-xl border border-border/60">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtrar Alvo por</Label>
                <Select value={pagamentoFiltro} onValueChange={v => { setPagamentoFiltro(v); setPagamentoAlvoId(''); setQuotasSelecionadas([]); setTipoLiquidacao('total'); }}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="z-[210]">
                    <SelectItem value="fracao">Fração</SelectItem>
                    <SelectItem value="condomino">Titular da Fração</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selecionar Item Correspondente</Label>
                {pagamentoFiltro === 'fracao' ? (
                  <Select disabled={selectedCondominioId === 'all'} value={pagamentoAlvoId} onValueChange={setPagamentoAlvoId}>
                    <SelectTrigger className="mt-1 bg-background">
                      <SelectValue placeholder={selectedCondominioId === 'all' ? "Deve especificar um condomínio" : (fracoesDoCondominioAtual.length === 0 ? "Sem frações disponíveis" : "Escolha a fração...")} />
                    </SelectTrigger>
                    <SelectContent className="z-[210] no-scrollbar max-h-40">
                      {fracoesDoCondominioAtual.map(f => (
                        <SelectItem key={f.id} value={f.id}>{formatFracao(f)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Popover open={comboCondominoOpen} onOpenChange={setComboCondominoOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between mt-1 bg-background">
                        {pagamentoAlvoId ? pessoas.find(p => p.id === pagamentoAlvoId)?.nome : "Pesquisar titular..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 z-[210]">
                      <Command>
                        <CommandInput placeholder="Pesquisar pelo nome..." />
                        <CommandEmpty>Nenhum condómino encontrado.</CommandEmpty>
                        <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
                          {condominosAtivos.map(p => (
                            <CommandItem key={p.id} value={p.nome} onSelect={() => { setPagamentoAlvoId(p.id); setComboCondominoOpen(false); setQuotasSelecionadas([]); setTipoLiquidacao('total'); }}>
                              <Check className={cn("mr-2 h-4 w-4", pagamentoAlvoId === p.id ? "opacity-100" : "opacity-0")} />
                              {p.nome}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {pagamentoAlvoId ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> Quotas Pendentes
                  </h4>
                </div>

                <div className="border border-border rounded-lg overflow-hidden bg-background">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 text-xs font-semibold text-muted-foreground">
                      <tr>
                        <th className="p-3 w-10 text-center">Sel.</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Data Ref.</th>
                        <th className="p-3 text-right">Valor em Falta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendentesReais.map(q => {
                        const fracaoDoMapa = fracoes.find(f => f.id === q.fracao_id);
                        const condominioDoMapa = condominios.find(c => c.id === fracaoDoMapa?.condominio_id);
                        const valorEmFalta = q.valor - (q.valor_pago || 0);

                        return (
                          <tr key={q.id} className={cn("hover:bg-muted/10 transition-colors cursor-pointer", quotasSelecionadas.includes(q.id) && "bg-primary/5")} onClick={() => toggleSelectQuota(q.id)}>
                            <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                              <Checkbox checked={quotasSelecionadas.includes(q.id)} onCheckedChange={() => toggleSelectQuota(q.id)} />
                            </td>
                            <td className="p-3 font-medium">
                              {pagamentoFiltro === 'condomino' && (
                                <div className="text-[10px] text-muted-foreground font-bold uppercase mb-0.5 opacity-80">
                                  {formatFracao(fracaoDoMapa)} - {condominioDoMapa?.nome || ''}
                                </div>
                              )}
                              {q.descricao || (q.tipo === 'mensal' ? 'Quota Mensal' : 'Dívida')}
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">{q.mes ? `${mesesExtenso[q.mes-1]} ${q.ano}` : 'Transitada'}</td>
                            <td className="p-3 text-right font-bold">€{valorEmFalta.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      {pendentesReais.length === 0 && (
                        <tr><td colSpan="4" className="text-center py-6 text-muted-foreground">Não Existem Quotas Pendentes</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="py-12 border border-dashed rounded-xl text-center text-sm text-muted-foreground bg-muted/10">
                Selecione uma fração ou condómino acima para carregar a conta-corrente.
              </div>
            )}

            <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <span className="text-xs text-muted-foreground font-medium block mb-1">A Pagar (Valor Final)</span>
                <div className="flex items-center justify-center sm:justify-start gap-1 text-2xl font-black text-emerald-600">
                  <span>€</span>
                  <input 
                    type="number" 
                    step="0.01"
                    disabled={!pagamentoAlvoId}
                    value={valorPagoManual}
                    onChange={e => setValorPagoManual(e.target.value)}
                    className={cn(
                      "bg-transparent border-b border-dashed border-emerald-300 hover:border-emerald-600 focus:border-emerald-600 focus:outline-none w-28 p-0",
                      !pagamentoAlvoId && "opacity-50 cursor-not-allowed border-transparent"
                    )}
                  />
                </div>
                {(parseFloat(valorPagoManual) || 0) > totalSelecionado + 0.005 && (
                  <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                    DOS QUAIS, €{((parseFloat(valorPagoManual) || 0) - totalSelecionado).toFixed(2)} FICAM EM CRÉDITO
                  </span>
                )}
              </div>
              <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                <Button variant="outline" className="flex-1 sm:flex-none" onClick={handleClosePagamento} disabled={registarPagamento.isPending}>Cancelar</Button>
                <Button 
                  disabled={!pagamentoAlvoId || registarPagamento.isPending || (quotasSelecionadas.length === 0 && (parseFloat(valorPagoManual) || 0) <= 0)} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-none gap-2" 
                  onClick={() => registarPagamento.mutate()}
                >
                  {registarPagamento.isPending ? 'A Processar...' : <><Check className="w-4 h-4" /> Confirmar & Emitir</>}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* POPUP RECIBO E ELIMINAR */}
      <Dialog open={!!openRecibo} onOpenChange={(open) => !open && setOpenRecibo(null)}>
        <DialogContent className="w-[92vw] sm:max-w-sm max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5 z-[200]">
          <DialogHeader>
            <DialogTitle>Consultar Recibo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">Como pretende disponibilizar o recibo unificado referente a esta quota?</p>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enviar por Correio Eletrónico</Label>
              <div className="flex gap-2 mt-1">
                <Input defaultValue="condomino@email.com" placeholder="Email do condómino..." />
                <Button variant="secondary" size="icon" onClick={() => { setOpenRecibo(null); toast.success('Recibo enviado por e-mail com sucesso!'); }}><Mail className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-3 text-muted-foreground text-[10px] uppercase tracking-wider font-bold">OU</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
            <Button variant="outline" className="w-full gap-2 text-foreground" onClick={() => { setOpenRecibo(null); gerarReciboTeste(); toast.success('Download do PDF iniciado.'); }}><Download className="w-4 h-4" /> Descarregar Documento PDF</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!openDelete} onOpenChange={(open) => !open && setOpenDelete(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-xl z-[200]">
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Linha de Faturação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que pretende eliminar esta linha de faturação? Esta ação é completamente irreversível e apenas elimina a linha da quota. Não afeta movimentos associados nem configurações de quotas. Esta opção é recomendada apenas para eliminar linhas lançadas por engano ou em duplicado. Se pretende corrigir o valor ou descrição, considere editar a linha em vez de eliminar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600 border-red-500" onClick={() => deleteQuota.mutate(openDelete.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}