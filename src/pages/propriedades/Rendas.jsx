import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import RendaDetalhe from '@/components/rendas/RendaDetalhe';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function estadoBadge(estado) {
  if (estado === 'recebida') return 'bg-green-100 text-green-700';
  if (estado === 'atrasada') return 'bg-red-100 text-red-700';
  return 'bg-yellow-100 text-yellow-700';
}
function estadoLabel(estado) {
  if (estado === 'recebida') return 'Recebida';
  if (estado === 'atrasada') return 'Atrasada';
  return 'Pendente';
}

export default function Rendas() {
  const qc = useQueryClient();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [detalhe, setDetalhe] = useState(null);
  const [filterStaff, setFilterStaff] = useState('all');

  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades'], queryFn: () => base44.entities.Propriedade.list() });
  const { data: rendas = [] } = useQuery({ queryKey: ['rendas'], queryFn: () => base44.entities.RendaMensal.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => base44.entities.Pessoa.list() });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => base44.entities.User.list() });

  const getStaffName = (id) => {
    if (!id) return null;
    const u = users.find(u => u.id === id);
    return u ? (u.full_name || u.email) : null;
  };

  const rendasMesAll = rendas.filter(r => r.mes === mes && r.ano === ano);
  const rendasMes = filterStaff === 'all'
    ? rendasMesAll
    : rendasMesAll.filter(r => {
        const prop = propriedades.find(p => p.id === r.propriedade_id);
        return prop?.atribuido_a === filterStaff;
      });

  // Gerar rendas automaticamente (ignora as que já existem para a propriedade nesse mês)
  const gerarRendasMes = useMutation({
    mutationFn: async () => {
      const existentes = new Set(rendasMes.map(r => r.propriedade_id));
      const toCreate = propriedades
        .filter(p => p.ativa !== false && !existentes.has(p.id))
        .map(p => ({
          propriedade_id: p.id,
          ano,
          mes,
          valor_renda: p.renda_mensal || 0,
          estado: 'pendente',
        }));
      if (toCreate.length > 0) await base44.entities.RendaMensal.bulkCreate(toCreate);
      return toCreate.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rendas'] }),
  });

  // Auto-gerar no dia 1 do mês atual se ainda não existirem rendas
  useEffect(() => {
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth() + 1;
    const anoHoje = hoje.getFullYear();
    if (diaHoje === 1 && mes === mesHoje && ano === anoHoje && rendas.length > 0) {
      const temRendasMesAtual = rendas.some(r => r.mes === mesHoje && r.ano === anoHoje);
      if (!temRendasMesAtual) gerarRendasMes.mutate();
    }
  }, [rendas.length]);

  const propInfo = (id) => propriedades.find(p => p.id === id);

  return (
    <div>
      <PageHeader title="Rendas" subtitle="Controlo mensal de recebimentos"
        action={
          <Button variant="outline" onClick={() => gerarRendasMes.mutate()} disabled={gerarRendasMes.isPending}>
            <RefreshCw className={`w-4 h-4 mr-2 ${gerarRendasMes.isPending ? 'animate-spin' : ''}`} />
            Gerar Rendas do Mês
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Filtrar por staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os colaboradores</SelectItem>
            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.full_name || u.email}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Navegação de mês */}
      <div className="flex items-center gap-3 mb-6 bg-card border border-border rounded-xl p-4 w-fit">
        <button onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }} className="p-1 hover:bg-muted rounded">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-lg min-w-[160px] text-center">{MESES[mes - 1]} {ano}</span>
        <button onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }} className="p-1 hover:bg-muted rounded">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Recebidas', count: rendasMes.filter(r => r.estado === 'recebida').length, total: rendasMes.filter(r => r.estado === 'recebida').reduce((s, r) => s + (r.valor_renda || 0), 0), color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Pendentes', count: rendasMes.filter(r => r.estado === 'pendente').length, total: rendasMes.filter(r => r.estado === 'pendente').reduce((s, r) => s + (r.valor_renda || 0), 0), color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Atrasadas', count: rendasMes.filter(r => r.estado === 'atrasada').length, total: rendasMes.filter(r => r.estado === 'atrasada').reduce((s, r) => s + (r.valor_renda || 0), 0), color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-border`}>
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-sm font-medium text-foreground">€{s.total.toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Lista de rendas */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {rendasMes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sem rendas para {MESES[mes - 1]} {ano}</p>
              <p className="text-xs mt-1">Clique em "Gerar Rendas do Mês" para criar automaticamente</p>
            </div>
          )}
          {rendasMes.map(r => {
            const prop = propInfo(r.propriedade_id);
            return (
              <div
                key={r.id}
                className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-muted/30 cursor-pointer transition-colors"
                onClick={() => setDetalhe(r)}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{prop?.morada || 'Propriedade'}</p>
                  <p className="text-xs text-muted-foreground">
                    {prop?.localidade} · {pessoas.find(p => p.id === prop?.inquilino_id)?.nome || 'Sem inquilino'}
                  </p>
                  {prop?.atribuido_a && getStaffName(prop.atribuido_a) && (
                    <p className="text-xs text-primary">👤 {getStaffName(prop.atribuido_a)}</p>
                  )}
                  {r.data_recebimento && <p className="text-xs text-muted-foreground">Recebido a {r.data_recebimento} via {r.metodo_pagamento}</p>}
                  {r.fechada && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Fechada</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-base">€{(r.valor_renda || 0).toFixed(2)}</span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estadoBadge(r.estado)}`}>{estadoLabel(r.estado)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detalhe / Preview */}
      {detalhe && (
        <RendaDetalhe
          renda={detalhe}
          prop={propInfo(detalhe.propriedade_id)}
          pessoas={pessoas}
          onClose={() => setDetalhe(null)}
          onMarcarRecebida={() => setDetalhe(null)}
          onFecho={() => setDetalhe(null)}
        />
      )}
    </div>
  );
}