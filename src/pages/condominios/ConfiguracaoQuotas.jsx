import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, Zap, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';
import { useCondominio } from '@/lib/CondominioContext';

export default function ConfiguracaoQuotas({ open, onClose }) {
  const qc = useQueryClient();
  const { selectedCondominioId } = useCondominio();
  const [tab, setTab] = useState('config'); // config | extraordinaria
  const [loading, setLoading] = useState(false);

  const { data: condominios = [] } = useQuery({ queryKey: ['condominios'], queryFn: () => agenciaAvenida.entities.Condominio.list() });
  const { data: fracoes = [] } = useQuery({ queryKey: ['fracoes'], queryFn: () => agenciaAvenida.entities.Fracao.list() });
  const { data: configs = [] } = useQuery({ queryKey: ['config-quotas'], queryFn: () => agenciaAvenida.entities.ConfiguracaoQuota.list() });
  const { data: quotas = [] } = useQuery({ queryKey: ['quotas'], queryFn: () => agenciaAvenida.entities.Quota.list() });

  const condId = selectedCondominioId !== 'all' ? selectedCondominioId : (condominios[0]?.id || '');
  const [formCond, setFormCond] = useState(condId);
  const configAtual = configs.find(c => c.condominio_id === formCond);

  const [config, setConfig] = useState({
    tipo: 'fixo', valor_fixo: 0, valor_total_permilagem: 0,
    dia_vencimento: 8, mes_inicio: 1, ano_inicio: new Date().getFullYear(),
  });

  const [extraForm, setExtraForm] = useState({
    descricao: '', valor: 0, data_inicio: format(new Date(), 'yyyy-MM-dd'), repeticoes: 1, fracao_id: '',
  });

  const saveConfig = useMutation({
    mutationFn: (d) => configAtual
      ? agenciaAvenida.entities.ConfiguracaoQuota.update(configAtual.id, d)
      : agenciaAvenida.entities.ConfiguracaoQuota.create({ ...d, condominio_id: formCond }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config-quotas'] }); toast.success('Configuração guardada'); },
  });

  const gerarQuotasAutomaticas = async () => {
    const cfg = configAtual || config;
    const frac = fracoes.filter(f => f.condominio_id === formCond && f.ativa !== false);
    if (!frac.length) { toast.error('Sem frações ativas neste condomínio'); return; }
    setLoading(true);

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    let criadas = 0;
    for (const f of frac) {
      // Verificar se já existe quota para este mês/fração
      const jaExiste = quotas.find(q =>
        q.fracao_id === f.id && q.ano === anoAtual && q.mes === mesAtual && q.tipo === 'mensal'
      );
      if (jaExiste) continue;

      const valor = cfg.tipo === 'fixo'
        ? (parseFloat(cfg.valor_fixo) || 0)
        : ((parseFloat(f.permilagem) || 0) / 1000) * (parseFloat(cfg.valor_total_permilagem) || 0);

      const dataVenc = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-${String(cfg.dia_vencimento || 8).padStart(2, '0')}`;

      await agenciaAvenida.entities.Quota.create({
        condominio_id: formCond,
        fracao_id: f.id,
        tipo: 'mensal',
        descricao: `Quota ${String(mesAtual).padStart(2, '0')}/${anoAtual}`,
        valor,
        data_emissao: format(hoje, 'yyyy-MM-dd'),
        data_vencimento: dataVenc,
        estado: 'pendente',
        ano: anoAtual,
        mes: mesAtual,
      });
      criadas++;
    }
    setLoading(false);
    qc.invalidateQueries({ queryKey: ['quotas'] });
    toast.success(criadas > 0 ? `${criadas} quota(s) criadas automaticamente` : 'Todas as quotas deste mês já existem');
  };

  const criarExtraordinaria = async () => {
    const frac = extraForm.fracao_id
      ? fracoes.filter(f => f.id === extraForm.fracao_id)
      : fracoes.filter(f => f.condominio_id === formCond);
    if (!frac.length) { toast.error('Sem frações selecionadas'); return; }
    setLoading(true);

    for (let rep = 0; rep < (parseInt(extraForm.repeticoes) || 1); rep++) {
      const data = format(addMonths(new Date(extraForm.data_inicio), rep), 'yyyy-MM-dd');
      for (const f of frac) {
        await agenciaAvenida.entities.Quota.create({
          condominio_id: formCond,
          fracao_id: f.id,
          tipo: 'extraordinaria',
          descricao: extraForm.descricao,
          valor: parseFloat(extraForm.valor) || 0,
          data_emissao: data,
          data_vencimento: data,
          estado: 'pendente',
          ano: new Date(data).getFullYear(),
          mes: new Date(data).getMonth() + 1,
        });
      }
    }
    setLoading(false);
    qc.invalidateQueries({ queryKey: ['quotas'] });
    toast.success('Quota(s) extraordinária(s) criadas');
    onClose();
  };

  const initConfig = () => {
    if (configAtual) setConfig({ ...configAtual });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />Configuração de Quotas</DialogTitle></DialogHeader>

        {/* Condomínio */}
        <div>
          <Label>Condomínio</Label>
          <Select value={formCond} onValueChange={v => { setFormCond(v); initConfig(); }}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar" /></SelectTrigger>
            <SelectContent>{condominios.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {[['config', 'Quota Mensal'], ['extraordinaria', 'Extraordinária']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-all ${tab === id ? 'bg-card shadow text-foreground' : 'text-muted-foreground'}`}
            >{label}</button>
          ))}
        </div>

        {tab === 'config' && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de cálculo</Label>
              <Select value={config.tipo} onValueChange={v => setConfig(c => ({ ...c, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixo">Valor fixo por fração</SelectItem>
                  <SelectItem value="permilagem">Proporcional à permilagem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.tipo === 'fixo' ? (
              <div>
                <Label>Valor fixo por fração (€)</Label>
                <Input type="number" className="mt-1" value={config.valor_fixo} onChange={e => setConfig(c => ({ ...c, valor_fixo: parseFloat(e.target.value) || 0 }))} />
              </div>
            ) : (
              <div>
                <Label>Valor total a distribuir por permilagem (€)</Label>
                <Input type="number" className="mt-1" value={config.valor_total_permilagem} onChange={e => setConfig(c => ({ ...c, valor_total_permilagem: parseFloat(e.target.value) || 0 }))} />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Dia vencimento</Label>
                <Input type="number" min={1} max={28} className="mt-1" value={config.dia_vencimento} onChange={e => setConfig(c => ({ ...c, dia_vencimento: parseInt(e.target.value) || 8 }))} />
              </div>
              <div>
                <Label>Mês início</Label>
                <Input type="number" min={1} max={12} className="mt-1" value={config.mes_inicio} onChange={e => setConfig(c => ({ ...c, mes_inicio: parseInt(e.target.value) || 1 }))} />
              </div>
              <div>
                <Label>Ano início</Label>
                <Input type="number" className="mt-1" value={config.ano_inicio} onChange={e => setConfig(c => ({ ...c, ano_inicio: parseInt(e.target.value) || 2025 }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => saveConfig.mutate(config)} disabled={saveConfig.isPending}>
                {saveConfig.isPending ? 'A guardar...' : 'Guardar configuração'}
              </Button>
              <Button className="flex-1 gap-2" onClick={gerarQuotasAutomaticas} disabled={loading}>
                <Zap className="w-4 h-4" />
                {loading ? 'A gerar...' : 'Gerar quotas do mês'}
              </Button>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>As quotas são geradas para o mês atual. Se já existir uma quota manual para uma fração neste mês, ela não será duplicada.</span>
            </div>
          </div>
        )}

        {tab === 'extraordinaria' && (
          <div className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input className="mt-1" placeholder="Ex: Obras de elevador" value={extraForm.descricao} onChange={e => setExtraForm(f => ({ ...f, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Valor (€)</Label>
                <Input type="number" className="mt-1" value={extraForm.valor} onChange={e => setExtraForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
              <div>
                <Label>Data início</Label>
                <Input type="date" className="mt-1" value={extraForm.data_inicio} onChange={e => setExtraForm(f => ({ ...f, data_inicio: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nº de meses / repetições</Label>
                <Input type="number" min={1} className="mt-1" value={extraForm.repeticoes} onChange={e => setExtraForm(f => ({ ...f, repeticoes: e.target.value }))} />
              </div>
              <div>
                <Label>Fração específica (opcional)</Label>
                <Select value={extraForm.fracao_id || ''} onValueChange={v => setExtraForm(f => ({ ...f, fracao_id: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Todas as frações" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Todas as frações</SelectItem>
                    {fracoes.filter(f => f.condominio_id === formCond).map(f => <SelectItem key={f.id} value={f.id}>{f.codigo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={criarExtraordinaria} disabled={loading || !extraForm.descricao || !extraForm.valor}>
              {loading ? 'A criar...' : `Criar quota extraordinária${parseInt(extraForm.repeticoes) > 1 ? ` (${extraForm.repeticoes} meses)` : ''}`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}