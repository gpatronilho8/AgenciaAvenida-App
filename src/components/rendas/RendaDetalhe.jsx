import { useState, useRef } from 'react';
import { X, CheckCircle, Plus, Trash2, FileDown, FileText, Mail, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CATEGORIAS = { reparacao: 'Reparação', manutencao: 'Manutenção', condominio: 'Condomínio', seguros: 'Seguros', impostos: 'Impostos', comissao_agencia: 'Comissão Agência', outro: 'Outro' };

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

const emptyDespesa = { id: '', descricao: '', categoria: 'outro', valor: 0, data: format(new Date(), 'yyyy-MM-dd'), desconta_proprietario: true };

export default function RendaDetalhe({ renda, prop, pessoas, onClose, onFecho }) {
  const qc = useQueryClient();
  const fechoRef = useRef(null);

  const [showDespForm, setShowDespForm] = useState(false);
  const [despForm, setDespForm] = useState(emptyDespesa);

  const [showEncargosForm, setShowEncargosForm] = useState(false);
  const [encargoForm, setEncargoForm] = useState({ descricao: '', valor: 0 });

  const [showPagamentoForm, setShowPagamentoForm] = useState(false);
  const [pagamentoForm, setPagamentoForm] = useState({ data: format(new Date(), 'yyyy-MM-dd'), valor: 0 });

  const [showFecho, setShowFecho] = useState(false);

  // Modals Overlay States (Evitar Fecho TV)
  const [showPessoa, setShowPessoa] = useState(null);
  const [showPessoaModal, setShowPessoaModal] = useState(false);
  const [showReciboOptions, setShowReciboOptions] = useState(false);

  const [fechoConfig, setFechoConfig] = useState({
    comissao_percentagem: prop?.comissao_percentagem ?? false,
    comissao_agencia: prop?.comissao_agencia ?? 0,
    custo_recibo: 3.5,
    custo_sepa: 1.5,
  });

  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [metodoPagamento, setMetodoPagamento] = useState('transferencia');

  // JSONB Arrays
  const despesasMes = parseJsonArray(renda.despesas_associadas);
  const encargosMes = parseJsonArray(renda.encargos_associados);
  const pagamentosMes = parseJsonArray(renda.pagamentos);

  // Totais
  const totalDespesas = despesasMes.filter(d => d.desconta_proprietario !== false).reduce((s, d) => s + (d.valor || 0), 0);
  const totalEncargos = encargosMes.reduce((s, e) => s + (e.valor || 0), 0);
  const totalPagamentos = pagamentosMes.reduce((s, p) => s + (p.valor || 0), 0);

  const totalArrendatario = (renda.valor_renda || 0) + totalEncargos;
  const faltaPagar = totalArrendatario - totalPagamentos;
  const estaPaga = faltaPagar <= 0.005 && totalPagamentos > 0;

  const comissaoValor = fechoConfig.comissao_percentagem
    ? (totalArrendatario * fechoConfig.comissao_agencia / 100)
    : fechoConfig.comissao_agencia;

  const valorTransferencia = totalArrendatario - comissaoValor - fechoConfig.custo_recibo - fechoConfig.custo_sepa - totalDespesas;

  // Helpers de Mutação Genérica
  const updateRenda = useMutation({
    mutationFn: (payload) => agenciaAvenida.entities.RendaMensal.update(renda.id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rendas'] })
  });

  // Arrays Actions
  const handleAddEncargo = () => {
    const arr = [...encargosMes, { id: Math.random().toString(36).substr(2, 9), ...encargoForm }];
    const novoFaltaPagar = ((renda.valor_renda || 0) + arr.reduce((s, e) => s + e.valor, 0)) - totalPagamentos;
    updateRenda.mutate({ encargos_associados: arr, estado: novoFaltaPagar <= 0.005 ? 'recebida' : 'pendente' });
    setShowEncargosForm(false);
    setEncargoForm({ descricao: '', valor: 0 });
  };

  const handleAddDespesa = () => {
    const arr = [...despesasMes, { id: Math.random().toString(36).substr(2, 9), ...despForm }];
    updateRenda.mutate({ despesas_associadas: arr });
    setShowDespForm(false);
    setDespForm(emptyDespesa);
  };

  const handleAddPagamento = () => {
    const val = parseFloat(pagamentoForm.valor);
    if (val > faltaPagar + 0.005) { toast.error("O pagamento excede o valor em dívida."); return; }

    const arr = [...pagamentosMes, { id: Math.random().toString(36).substr(2, 9), ...pagamentoForm }];
    const novoFaltaPagar = totalArrendatario - arr.reduce((s, p) => s + p.valor, 0);
    updateRenda.mutate({ pagamentos: arr, estado: novoFaltaPagar <= 0.005 ? 'recebida' : 'pendente' });
    setShowPagamentoForm(false);
    setPagamentoForm({ data: format(new Date(), 'yyyy-MM-dd'), valor: 0 });
  };

  const handleRemove = (tipo, idToRemove) => {
    if (tipo === 'encargo') {
      const arr = encargosMes.filter(x => x.id !== idToRemove);
      const novoFaltaPagar = ((renda.valor_renda || 0) + arr.reduce((s, e) => s + e.valor, 0)) - totalPagamentos;
      updateRenda.mutate({ encargos_associados: arr, estado: novoFaltaPagar <= 0.005 ? 'recebida' : 'pendente' });
    }
    if (tipo === 'despesa') updateRenda.mutate({ despesas_associadas: despesasMes.filter(x => x.id !== idToRemove) });
    if (tipo === 'pagamento') {
      const arr = pagamentosMes.filter(x => x.id !== idToRemove);
      const novoFaltaPagar = totalArrendatario - arr.reduce((s, p) => s + p.valor, 0);
      updateRenda.mutate({ pagamentos: arr, estado: novoFaltaPagar <= 0.005 ? 'recebida' : 'pendente' });
    }
  };

  // Fecho Centralizado
  const efetuarFecho = useMutation({
    mutationFn: () => agenciaAvenida.entities.RendaMensal.update(renda.id, {
      fechada: true,
      data_fecho: format(new Date(), 'yyyy-MM-dd'),
      valor_transferencia_proprietario: valorTransferencia,
      estado: 'recebida',
      data_recebimento: dataPagamento,
      metodo_pagamento: metodoPagamento
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rendas'] }); setShowFecho(false); onFecho?.(); toast.success('FECHO DO MÊS CONCLUÍDO'); },
  });

  const inquilinoIds = parseJsonArray(prop?.inquilino_id);
  const proprietarioIds = parseJsonArray(prop?.proprietario_id);
  const mesLabel = MESES[(renda.mes || 1) - 1];

  const pessoaParaMostrar = pessoas.find(p => p.id === showPessoa);

  const getPrimeiroEmailInquilino = () => {
    if (inquilinoIds.length > 0) {
      const inq = pessoas.find(p => p.id === inquilinoIds[0]);
      if (inq?.email) return inq.email;
    }
    return '';
  };

  return (
    // Correção: fechar apenas ao clicar estritamente no background escuro
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar relative flex flex-col" onClick={e => e.stopPropagation()}>

        {/* HEADER */}
        <div className="sticky top-0 bg-card z-10 flex items-center justify-between px-6 py-5 border-b border-border shadow-sm">
          <h2 className="font-black text-xl text-foreground tracking-wider">{prop?.morada} — {mesLabel} {renda.ano}</h2>
          <div className="flex gap-2 items-center">
            {estaPaga && !renda.fechada && (
              <Button size="sm" variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-2" onClick={() => setShowReciboOptions(true)}>
                <FileText className="w-4 h-4" /> Comprovativo Pagamento
              </Button>
            )}
            {renda.fechada && (
              <Button size="sm" variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 gap-2" onClick={() => gerarPDFMock(`Guia_Fecho_${mesLabel}_${renda.ano}`)}>
                <FileText className="w-4 h-4" /> Guia de Fecho
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted shrink-0 rounded-full"><X className="w-5 h-5" /></Button>
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1">

          {/* SECCÃO: ENTIDADES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-border rounded-xl p-4 bg-muted/10">
              <p className="text-[13px] font-black text-muted-foreground tracking-widest mb-3">Proprietários (Locadores)</p>
              <div className="flex flex-col gap-2">
                {proprietarioIds.length === 0 ? <span className="text-sm italic text-muted-foreground">Nenhum</span> :
                  proprietarioIds.map(id => (
                    <span key={id} className="text-sm font-semibold text-primary hover:underline cursor-pointer w-fit" onClick={() => { setShowPessoa(id); setShowPessoaModal(true); }}>
                      {pessoas.find(p => p.id === id)?.nome || '—'}
                    </span>
                  ))
                }
              </div>
            </div>
            <div className="border border-border rounded-xl p-4 bg-muted/10">
              <p className="text-[13px] font-black text-muted-foreground tracking-widest mb-3">Inquilinos (Arrendatários)</p>
              <div className="flex flex-col gap-2">
                {inquilinoIds.length === 0 ? <span className="text-sm italic text-muted-foreground">Nenhum</span> :
                  inquilinoIds.map(id => (
                    <span key={id} className="text-sm font-semibold text-primary hover:underline cursor-pointer w-fit" onClick={() => { setShowPessoa(id); setShowPessoaModal(true); }}>
                      {pessoas.find(p => p.id === id)?.nome || '—'}
                    </span>
                  ))
                }
              </div>
            </div>
          </div>

          <hr className="border-dashed border-border" />

          {/* SECCÃO: A COBRAR VS PAGAMENTOS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

            {/* LADO ESQUERDO: COBRANÇA */}
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-5 flex flex-col h-full">
              <h3 className="font-black text-base uppercase tracking-wider text-amber-700 mb-4">Valores a Cobrar</h3>

              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b border-amber-200 border-dashed mb-3">
                  <span className="text-sm font-bold text-amber-900">Renda Base</span>
                  <span className="font-black text-lg text-amber-700">€{(renda.valor_renda || 0).toFixed(2)}</span>
                </div>

                <div className="space-y-3">
                  {encargosMes.map(e => (
                    <div key={e.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-amber-800 flex items-center gap-2">
                        {e.descricao}
                        {(!renda.fechada && !estaPaga) && (
                          <button onClick={() => handleRemove('encargo', e.id)} className="text-muted-foreground/40 hover:text-red-500 transition-colors" title="Remover Encargo">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                      <span className="font-bold text-amber-700">+€{(e.valor).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {(!renda.fechada && !estaPaga) && (
                  <div className="mt-4 mb-4">
                    {!showEncargosForm ? (
                      <Button variant="ghost" size="sm" className="w-full text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-100 border border-dashed border-amber-200" onClick={() => setShowEncargosForm(true)}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Encargo / Coima
                      </Button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-amber-200 border-dashed">
                        <Input placeholder="Motivo (ex: Taxa Atraso)..." className="h-8 text-xs bg-white w-full" value={encargoForm.descricao} onChange={e => setEncargoForm(f => ({ ...f, descricao: e.target.value }))} />
                        <div className="flex gap-1 shrink-0">
                          <Input type="number" placeholder="€" className="h-8 text-xs bg-white w-24" value={encargoForm.valor || ''} onChange={e => setEncargoForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
                          <Button size="icon" className="h-8 w-8 bg-amber-600 hover:bg-amber-700 shrink-0" onClick={handleAddEncargo} disabled={!encargoForm.descricao || encargoForm.valor <= 0}><CheckCircle className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0" onClick={() => setShowEncargosForm(false)}><X className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LInha Total a Pagar fixada na base */}
              <div className="flex justify-between items-center pt-4 mt-auto border-t border-amber-200">
                <span className="font-black text-sm uppercase tracking-wider text-amber-900">Total a Pagar</span>
                <span className="font-black text-2xl text-amber-700">€{totalArrendatario.toFixed(2)}</span>
              </div>
            </div>

            {/* LADO DIREITO: PAGAMENTOS */}
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 flex flex-col h-full">
              <h3 className="font-black text-base uppercase tracking-wider text-emerald-700 mb-4">Pagamentos Efetuados</h3>

              <div className="flex-1 flex flex-col">
                {pagamentosMes.length === 0 && <p className="text-xs text-center font-bold text-emerald-800/50 py-2 tracking-wider">Sem Pagamentos Registados</p>}

                <div className="space-y-3">
                  {pagamentosMes.map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm pb-2 border-b border-emerald-100 border-dashed last:border-0 last:pb-0">
                      <span className="font-medium text-emerald-800 flex items-center gap-2">
                        {format(new Date(p.data), 'dd/MM/yyyy')}
                        {!renda.fechada && (
                          <button onClick={() => handleRemove('pagamento', p.id)} className="text-muted-foreground/40 hover:text-red-500 transition-colors" title="Remover Pagamento">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                      <span className="font-black text-emerald-700">€{(p.valor).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {!renda.fechada && faltaPagar > 0.005 && (
                  <div className="mt-4 mb-4">
                    {!showPagamentoForm ? (
                      <Button size="sm" className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" onClick={() => { setPagamentoForm(f => ({ ...f, valor: faltaPagar })); setShowPagamentoForm(true); }}>
                        <Plus className="w-3.5 h-3.5 mr-1" /> Registar Pagamento
                      </Button>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-emerald-200 border-dashed">
                        <Input type="date" className="h-8 text-xs bg-white w-full" value={pagamentoForm.data} onChange={e => setPagamentoForm(f => ({ ...f, data: e.target.value }))} />
                        <div className="flex gap-1 shrink-0">
                          <Input type="number" step="0.01" max={faltaPagar} className="h-8 text-xs bg-white font-bold text-emerald-700 w-24" value={pagamentoForm.valor || ''} onChange={e => setPagamentoForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} />
                          <Button size="icon" className="h-8 w-8 bg-emerald-600 hover:bg-emerald-700 shrink-0" onClick={handleAddPagamento} disabled={pagamentoForm.valor <= 0 || pagamentoForm.valor > faltaPagar + 0.005}><CheckCircle className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground shrink-0" onClick={() => setShowPagamentoForm(false)}><X className="w-4 h-4" /></Button>
                        </div>
                        {pagamentoForm.valor > faltaPagar + 0.005 && <p className="col-span-full text-[10px] text-red-600 font-bold mt-1">O valor não pode exceder €{faltaPagar.toFixed(2)}</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LInha Total Pagamentos fixada na base */}
              <div className="flex justify-between items-center pt-4 mt-auto border-t border-emerald-200">
                <span className="font-black text-xs uppercase tracking-wider text-emerald-900">{estaPaga ? 'Total Liquidado' : 'Falta Pagar'}</span>
                <span className={cn("font-black text-2xl", estaPaga ? "text-emerald-600" : "text-red-600")}>
                  {estaPaga ? `€${totalArrendatario.toFixed(2)}` : `€${faltaPagar.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>

          <hr className="border-dashed border-border" />

          {/* SECCÃO: DESPESAS DA PROPRIEDADE */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-base uppercase tracking-wider text-blue-800">Despesas a Abater ao Proprietário</h3>
              {!renda.fechada && (
                <Button size="sm" variant="outline" onClick={() => setShowDespForm(v => !v)} className="gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
                  <Plus className="w-4 h-4" />Adicionar Despesa
                </Button>
              )}
            </div>

            {showDespForm && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 mb-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><Label className="text-blue-900">Descrição</Label><Input className="mt-1 bg-white" value={despForm.descricao} onChange={e => setDespForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                  <div><Label className="text-blue-900">Valor (€)</Label><Input className="mt-1 bg-white font-bold text-red-600" type="number" value={despForm.valor || ''} onChange={e => setDespForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="ghost" size="sm" className="text-blue-800" onClick={() => setShowDespForm(false)}>Cancelar</Button>
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleAddDespesa} disabled={updateRenda.isPending || !despForm.descricao || despForm.valor <= 0}>Guardar Despesa</Button>
                </div>
              </div>
            )}

            {despesasMes.length === 0 ? (
              <div className="border border-dashed border-border rounded-xl p-5 text-center text-muted-foreground bg-muted/10">
                <p className="text-s font-bold tracking-wider">Sem Despesas Abater (Mês {mesLabel})</p>
              </div>
            ) : (
              <div className="space-y-2">
                {despesasMes.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-background border border-border rounded-xl px-4 py-3 shadow-sm hover:border-blue-200 transition-colors">
                    <span className="font-bold text-foreground text-sm">{d.descricao}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-red-600 font-black">-€{(d.valor || 0).toFixed(2)}</span>
                      {!renda.fechada && (
                        <button onClick={() => handleRemove('despesa', d.id)} className="text-muted-foreground/50 hover:text-red-500 transition-colors" title="Remover Despesa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mt-3">
                  <span className="text-sm font-black uppercase tracking-wider text-blue-900">Total a Abater</span>
                  <span className="text-lg font-black text-red-600">-€{totalDespesas.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* SECCÃO FINAL: FECHO DE CONTAS */}
          <div className="border-t-2 border-border pt-8 pb-4" ref={fechoRef}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
              <div>
                <h3 className="font-black text-2xl uppercase tracking-wider text-foreground">Fecho do Mês</h3>
                <p className="text-sm text-muted-foreground font-medium mt-1">Cálculo de repasse ao proprietário e encerramento administrativo.</p>
              </div>
              <Button size="lg" className={cn("gap-2 shadow-sm font-bold text-base h-12", renda.fechada ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary")}
                onClick={() => {
                  setShowFecho(v => !v);
                  setTimeout(() => fechoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
                }}
              >
                {renda.fechada ? <><CheckCircle className="w-5 h-5" /> Ver Fecho Concluído</> : <><FileDown className="w-5 h-5" /> Configurar & Fechar</>}
              </Button>
            </div>

            {showFecho && (
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 mt-6 space-y-6">

                {!renda.fechada && !estaPaga && (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm font-bold text-center uppercase tracking-wider">
                    <strong>Aviso:</strong> O inquilino ainda não pagou a totalidade da renda
                  </div>
                )}

                <div className="bg-background rounded-xl p-5 border border-border">
                  <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">Deduções Administrativas</p>
                  <div className="flex items-center gap-2 mb-4 bg-muted/50 p-3 rounded-lg">
                    <input type="checkbox" id="comm_perc" checked={fechoConfig.comissao_percentagem} onChange={e => setFechoConfig(f => ({ ...f, comissao_percentagem: e.target.checked }))} className="w-4 h-4 rounded border-gray-300 text-primary" />
                    <Label htmlFor="comm_perc" className="cursor-pointer font-bold text-sm">Comissão Agência Percentagem (%)</Label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label>Comissão {fechoConfig.comissao_percentagem ? '(%)' : '(€)'}</Label>
                      <Input type="number" step="0.01" className="mt-1 font-bold" value={fechoConfig.comissao_agencia} onChange={e => setFechoConfig(f => ({ ...f, comissao_agencia: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>Emissão de Recibo (€)</Label>
                      <Input type="number" step="0.01" className="mt-1 font-bold" value={fechoConfig.custo_recibo} onChange={e => setFechoConfig(f => ({ ...f, custo_recibo: parseFloat(e.target.value) || 0 }))} />
                    </div>
                    <div>
                      <Label>Transferência SEPA (€)</Label>
                      <Input type="number" step="0.01" className="mt-1 font-bold" value={fechoConfig.custo_sepa} onChange={e => setFechoConfig(f => ({ ...f, custo_sepa: parseFloat(e.target.value) || 0 }))} />
                    </div>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-800 mb-4">Conta-Corrente do Proprietário</p>
                  <div className="space-y-3 text-base font-medium">
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">Valor Cobrado (Renda + Encargos)</span><span className="font-bold text-foreground">€{totalArrendatario.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-red-600"><span>Comissão da Agência</span><span>-€{comissaoValor.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-red-600"><span>Emissão de Recibo</span><span>-€{fechoConfig.custo_recibo.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center text-red-600"><span>Transferência SEPA</span><span>-€{fechoConfig.custo_sepa.toFixed(2)}</span></div>
                    {totalDespesas > 0 && <div className="flex justify-between items-center text-red-600"><span>Despesas Abatidas</span><span>-€{totalDespesas.toFixed(2)}</span></div>}
                    <div className="flex justify-between items-center pt-4 mt-3 border-t-2 border-emerald-200">
                      <span className="font-black text-emerald-900 uppercase tracking-wide">Valor Limpo a Transferir</span>
                      <span className="font-black text-3xl text-emerald-700">€{valorTransferencia.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {!renda.fechada && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Button size="lg" variant="outline" className="w-full sm:flex-1 font-bold h-14" onClick={() => setShowFecho(false)}>Cancelar</Button>
                    <Button size="lg" className="w-full sm:w-[60%] bg-emerald-600 hover:bg-emerald-700 text-white font-black tracking-wider gap-2 h-14" onClick={() => efetuarFecho.mutate()} disabled={efetuarFecho.isPending}>
                      <CheckCircle className="w-5 h-5" /> Efetuar Fecho / Emitir Guia Pagamento
                    </Button>
                  </div>
                )}
              </div>
            )}

            {renda.fechada && !showFecho && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-6">
                <div>
                  <p className="text-emerald-800 font-bold uppercase tracking-wider text-xs">Mês Administrativo Encerrado</p>
                  <p className="text-emerald-600 text-sm mt-0.5">Contas fechadas a {format(new Date(renda.data_fecho), 'dd/MM/yyyy')}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-[10px] text-emerald-800 font-black uppercase tracking-wider">Apuramento p/ Proprietário</p>
                  <p className="text-3xl font-black text-emerald-700 leading-none mt-1">€{(renda.valor_transferencia_proprietario || 0).toFixed(2)}</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* POPUP SELEÇÃO DE DESCARGA / EMAIL (Comprovativo) */}
      <Dialog open={showReciboOptions} onOpenChange={setShowReciboOptions}>
        <DialogContent className="max-w-md rounded-xl z-[200]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Emissão de Comprovativo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">O comprovativo atesta a liquidação total da renda e encargos do mês de {mesLabel}.</p>
            <div className="space-y-3">
              {/* O botão já NÃO fecha o modal porque removemos o setShowReciboOptions(false) no onClick! */}
              <Button variant="outline" className="w-full justify-between h-auto py-3 bg-blue-50/50 border-blue-200 hover:bg-blue-100 hover:text-blue-800" onClick={() => { gerarPDFMock(`Comprovativo_Renda_${mesLabel}_${renda.ano}`); toast.success('DOWNLOAD INICIADO'); }}>
                <span className="font-bold text-sm">Descarregar PDF</span>
                <Download className="w-4 h-4 text-blue-600" />
              </Button>
            </div>
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-border"></div>
              <span className="flex-shrink-0 mx-3 text-muted-foreground text-[9px] uppercase tracking-wider font-bold">Ou Enviar por Correio Eletrónico</span>
              <div className="flex-grow border-t border-border"></div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email do Inquilino</Label>
              <div className="flex gap-2 mt-1">
                <Input defaultValue={getPrimeiroEmailInquilino()} placeholder="Email do destinatário..." />
                {/* O botão de email também já NÃO fecha o modal! */}
                <Button variant="secondary" size="icon" onClick={() => { toast.success('COMPROVATIVO ENVIADO POR E-MAIL'); }}>
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL CENTRAL DE DETALHES DA PESSOA */}
      <Dialog open={showPessoaModal} onOpenChange={setShowPessoaModal}>
        <DialogContent className="max-w-sm z-[250] no-scrollbar">
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
                {pessoaParaMostrar.iban && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">IBAN</p>
                    <p className="text-foreground">{pessoaParaMostrar.iban}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}