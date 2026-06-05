import { useQuery } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { Home, Euro, Clock, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { format, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, to }) {
  const navigate = useNavigate();
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div
      onClick={() => to && navigate(to)}
      className={`bg-card rounded-xl border border-border p-5 shadow-sm transition-all ${to ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {Icon && <div className={`p-3 rounded-xl ${colorMap[color]}`}><Icon className="w-5 h-5" /></div>}
      </div>
      {to && <p className="text-xs text-primary mt-3 font-medium">Ver detalhes →</p>}
    </div>
  );
}

export default function PropriedadesDashboard() {
  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades'], queryFn: () => agenciaAvenida.entities.Propriedade.list() });
  const { data: rendas = [] } = useQuery({ queryKey: ['rendas'], queryFn: () => agenciaAvenida.entities.RendaMensal.list() });
  const { data: despesas = [] } = useQuery({ queryKey: ['despesas_prop'], queryFn: () => agenciaAvenida.entities.DespesaPropriedade.list() });

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const rendasMesAtual = rendas.filter(r => r.mes === mesAtual && r.ano === anoAtual);
  const rendasRecebidas = rendasMesAtual.filter(r => r.estado === 'recebida');
  const rendasPendentes = rendasMesAtual.filter(r => r.estado === 'pendente' || r.estado === 'atrasada');
  const totalRecebidoMes = rendasRecebidas.reduce((s, r) => s + (r.valor_renda || 0), 0);
  const totalPendenteMes = rendasPendentes.reduce((s, r) => s + (r.valor_renda || 0), 0);
  const propriedadesAtivas = propriedades.filter(p => p.ativa !== false);

  const rendasAtrasadas = rendas.filter(r => r.estado === 'atrasada');

  return (
    <div>
      <PageHeader
        title="Dashboard — Propriedades"
        subtitle={`Resumo — ${format(hoje, "MMMM 'de' yyyy", { locale: pt })}`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard title="Propriedades Ativas" value={propriedadesAtivas.length} icon={Home} color="blue" to="/propriedades/lista" />
        <StatCard title="Rendas Recebidas" value={rendasRecebidas.length} icon={CheckCircle} color="green" subtitle={`€${totalRecebidoMes.toFixed(2)} este mês`} to="/propriedades/rendas" />
        <StatCard title="Rendas Pendentes" value={rendasPendentes.length} icon={Clock} color="orange" subtitle={`€${totalPendenteMes.toFixed(2)} em falta`} to="/propriedades/rendas" />
        <StatCard title="Rendas Atrasadas" value={rendasAtrasadas.length} icon={AlertCircle} color="red" to="/propriedades/rendas" />
      </div>

      {/* Recent pending rendas */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-semibold">Rendas Pendentes — {format(hoje, 'MMMM yyyy', { locale: pt })}</h3>
        </div>
        <div className="divide-y divide-border">
          {rendasPendentes.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">Todas as rendas deste mês estão recebidas!</p>
          )}
          {rendasPendentes.map(r => {
            const prop = propriedades.find(p => p.id === r.propriedade_id);
            return (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{prop?.morada || 'Propriedade'}</p>
                  <p className="text-xs text-muted-foreground">{r.mes}/{r.ano}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">€{r.valor_renda?.toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.estado === 'atrasada' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.estado === 'atrasada' ? 'Atrasada' : 'Pendente'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}