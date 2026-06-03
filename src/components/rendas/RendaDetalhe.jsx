import { useState } from 'react';
import { X, Printer, CheckCircle, Plus, Trash2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const CATEGORIAS = { reparacao: 'Reparação', manutencao: 'Manutenção', condominio: 'Condomínio', seguros: 'Seguros', impostos: 'Impostos', comissao_agencia: 'Comissão Agência', outro: 'Outro' };

const emptyDespesa = { descricao: '', categoria: 'outro', valor: 0, data: format(new Date(), 'yyyy-MM-dd'), desconta_proprietario: true };

export default function RendaDetalhe({ renda, prop, pessoas, onClose, onMarcarRecebida, onFecho }) {
  const qc = useQueryClient();
  const [showDespForm, setShowDespForm] = useState(false);
  const [despForm, setDespForm] = useState(emptyDespesa);
  const [showFecho, setShowFecho] = useState(false);
  const [fechoConfig, setFechoConfig] = useState({
    comissao_percentagem: prop?.comissao_percentagem ?? false,
    comissao_agencia: prop?.comissao_agencia ?? 0,
    custo_recibo: 3.5,
    custo_sepa: 1.5,
  });
  const [marcandoPago, setMarcandoPago] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [metodoPagamento, setMetodoPagamento] = useState('transferencia');

  const { data: despesas = [] } = useQuery({
    queryKey: ['despesas_prop', renda?.propriedade_id],
    queryFn: () => base44.entities.DespesaPropriedade.filter({ propriedade_id: renda.propriedade_id }),
    enabled: !!renda?.propriedade_id,
  });

  // Despesas do mês desta renda
  const despesasMes = despesas.filter(d => {
    if (!d.data) return false;
    const dd = new Date(d.data);
    return dd.getFullYear() === renda.ano && (dd.getMonth() + 1) === renda.mes;
  });

  const totalDespesas = despesasMes.filter(d => d.desconta_proprietario !== false).reduce((s, d) => s + (d.valor || 0), 0);

  const comissaoValor = fechoConfig.comissao_percentagem
    ? (renda.valor_renda * fechoConfig.comissao_agencia / 100)
    : fechoConfig.comissao_agencia;

  const valorTransferencia = renda.valor_renda - comissaoValor - fechoConfig.custo_recibo - fechoConfig.custo_sepa - totalDespesas;

  const saveDespesa = useMutation({
    mutationFn: (d) => base44.entities.DespesaPropriedade.create({ ...d, propriedade_id: renda.propriedade_id, renda_mensal_id: renda.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['despesas_prop', renda.propriedade_id] }); setShowDespForm(false); setDespForm(emptyDespesa); },
  });

  const removeDespesa = useMutation({
    mutationFn: (id) => base44.entities.DespesaPropriedade.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['despesas_prop', renda.propriedade_id] }),
  });

  const marcarRecebida = useMutation({
    mutationFn: () => base44.entities.RendaMensal.update(renda.id, {
      estado: 'recebida', data_recebimento: dataPagamento, metodo_pagamento: metodoPagamento
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rendas'] }); setMarcandoPago(false); onMarcarRecebida?.(); },
  });

  const efetuarFecho = useMutation({
    mutationFn: () => base44.entities.RendaMensal.update(renda.id, {
      fechada: true,
      data_fecho: format(new Date(), 'yyyy-MM-dd'),
      valor_transferencia_proprietario: valorTransferencia,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rendas'] }); setShowFecho(false); onFecho?.(); },
  });

  const inquilino = pessoas.find(p => p.id === prop?.inquilino_id);
  const proprietario = pessoas.find(p => p.id === prop?.proprietario_id);
  const mesLabel = MESES[(renda.mes || 1) - 1];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 print:hidden">
          <h2 className="font-bold text-lg">{prop?.morada} — {mesLabel} {renda.ano}</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" />Imprimir</Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Info geral */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Inquilino</p>
              <p className="font-medium">{inquilino?.nome || '—'}</p>
              {inquilino?.email && <p className="text-xs text-gray-400">{inquilino.email}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Proprietário</p>
              <p className="font-medium">{proprietario?.nome || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Valor da Renda</p>
              <p className="text-xl font-bold text-green-700">€{(renda.valor_renda || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Estado</p>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${renda.estado === 'recebida' ? 'bg-green-100 text-green-700' : renda.estado === 'atrasada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {renda.estado === 'recebida' ? 'Recebida' : renda.estado === 'atrasada' ? 'Atrasada' : 'Pendente'}
              </span>
              {renda.data_recebimento && <p className="text-xs text-gray-400 mt-1">Recebido a {renda.data_recebimento} via {renda.metodo_pagamento}</p>}
            </div>
          </div>

          {/* Marcar como recebida */}
          {renda.estado !== 'recebida' && !marcandoPago && (
            <Button size="sm" className="w-full" onClick={() => setMarcandoPago(true)}>
              <CheckCircle className="w-4 h-4 mr-2" />Marcar como Recebida
            </Button>
          )}
          {marcandoPago && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <p className="font-medium text-sm">Confirmar Recebimento</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} /></div>
                <div><Label>Método</Label>
                  <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="mb">MB</SelectItem>
                      <SelectItem value="mbway">MBWay</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setMarcandoPago(false)}>Cancelar</Button>
                <Button size="sm" onClick={() => marcarRecebida.mutate()} disabled={marcarRecebida.isPending}>Confirmar</Button>
              </div>
            </div>
          )}

          {/* Despesas do mês */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Despesas do Mês</p>
              <Button size="sm" variant="outline" onClick={() => setShowDespForm(v => !v)}>
                <Plus className="w-3.5 h-3.5 mr-1" />Adicionar
              </Button>
            </div>

            {showDespForm && (
              <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Descrição</Label><Input value={despForm.descricao} onChange={e => setDespForm(f => ({ ...f, descricao: e.target.value }))} /></div>
                  <div><Label>Categoria</Label>
                    <Select value={despForm.categoria} onValueChange={v => setDespForm(f => ({ ...f, categoria: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(CATEGORIAS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valor (€)</Label><Input type="number" value={despForm.valor} onChange={e => setDespForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} /></div>
                  <div><Label>Data</Label><Input type="date" value={despForm.data} onChange={e => setDespForm(f => ({ ...f, data: e.target.value }))} /></div>
                  <div className="flex items-center gap-2 mt-5">
                    <input type="checkbox" id="desconta" checked={despForm.desconta_proprietario} onChange={e => setDespForm(f => ({ ...f, desconta_proprietario: e.target.checked }))} />
                    <Label htmlFor="desconta" className="cursor-pointer">Desconta ao proprietário</Label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowDespForm(false)}>Cancelar</Button>
                  <Button size="sm" onClick={() => saveDespesa.mutate(despForm)} disabled={saveDespesa.isPending}>Guardar</Button>
                </div>
              </div>
            )}

            {despesasMes.length === 0 ? (
              <p className="text-sm text-gray-400 py-3 text-center">Sem despesas este mês</p>
            ) : (
              <div className="space-y-1.5">
                {despesasMes.map(d => (
                  <div key={d.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="font-medium">{d.descricao}</span>
                      <span className="text-gray-400 ml-2">{CATEGORIAS[d.categoria] || d.categoria}</span>
                      {!d.desconta_proprietario && <span className="ml-2 text-xs text-blue-600">(não desconta)</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-medium">-€{(d.valor || 0).toFixed(2)}</span>
                      <button onClick={() => removeDespesa.mutate(d.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end text-sm font-semibold text-red-600 pt-1 pr-3">
                  Total despesas: -€{totalDespesas.toFixed(2)}
                </div>
              </div>
            )}
          </div>

          {/* Fecho */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-sm">Fecho do Mês</p>
              <Button size="sm" variant="outline" onClick={() => setShowFecho(v => !v)}>
                {renda.fechada ? '✓ Fechada' : 'Configurar Fecho'}
              </Button>
            </div>

            {showFecho && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" id="comm_perc" checked={fechoConfig.comissao_percentagem} onChange={e => setFechoConfig(f => ({ ...f, comissao_percentagem: e.target.checked }))} />
                      <Label htmlFor="comm_perc">Comissão em percentagem (%)</Label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Comissão agência {fechoConfig.comissao_percentagem ? '(%)' : '(€)'}</Label>
                        <Input type="number" step="0.01" value={fechoConfig.comissao_agencia} onChange={e => setFechoConfig(f => ({ ...f, comissao_agencia: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label>Emissão recibo (€)</Label>
                        <Input type="number" step="0.01" value={fechoConfig.custo_recibo} onChange={e => setFechoConfig(f => ({ ...f, custo_recibo: parseFloat(e.target.value) || 0 }))} />
                      </div>
                      <div>
                        <Label>Transf. SEPA (€)</Label>
                        <Input type="number" step="0.01" value={fechoConfig.custo_sepa} onChange={e => setFechoConfig(f => ({ ...f, custo_sepa: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo */}
                <div className="border border-gray-200 rounded-lg p-3 text-sm space-y-1.5">
                  <div className="flex justify-between"><span className="text-gray-500">Renda bruta</span><span className="font-medium">€{(renda.valor_renda || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Comissão agência</span><span>-€{comissaoValor.toFixed(2)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Emissão recibo</span><span>-€{fechoConfig.custo_recibo.toFixed(2)}</span></div>
                  <div className="flex justify-between text-red-600"><span>Transferência SEPA</span><span>-€{fechoConfig.custo_sepa.toFixed(2)}</span></div>
                  {totalDespesas > 0 && <div className="flex justify-between text-red-600"><span>Despesas</span><span>-€{totalDespesas.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-green-700 border-t border-gray-200 pt-1.5 mt-1">
                    <span>A transferir ao proprietário</span>
                    <span>€{valorTransferencia.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowFecho(false)}>Cancelar</Button>
                  <Button size="sm" onClick={() => efetuarFecho.mutate()} disabled={efetuarFecho.isPending || renda.fechada}>
                    <FileDown className="w-3.5 h-3.5 mr-1" />{renda.fechada ? 'Já fechada' : 'Efetuar Fecho'}
                  </Button>
                </div>
              </div>
            )}

            {renda.fechada && (
              <div className="text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex justify-between items-center">
                <span className="text-green-800 font-medium">Mês fechado em {renda.data_fecho}</span>
                <span className="text-green-700 font-bold">Transferência: €{(renda.valor_transferencia_proprietario || 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}