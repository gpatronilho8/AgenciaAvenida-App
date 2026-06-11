import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import PageHeader from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Clock, ChevronLeft, ChevronRight, RefreshCw, Check, ChevronsUpDown, Filter } from 'lucide-react';
import RendaDetalhe from '@/components/rendas/RendaDetalhe';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

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

// Nova Função para calcular o Valor Total (Renda + Encargos Locatário)
const calcularTotalRenda = (renda) => {
  const encargos = parseJsonArray(renda.encargos_associados);
  const totalEncargos = encargos.reduce((s, e) => s + (e.valor || 0), 0);
  return (renda.valor_renda || 0) + totalEncargos;
};

function estadoBadge(estado) {
  if (estado === 'recebida') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (estado === 'atrasada') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-yellow-100 text-yellow-700 border-yellow-200';
}

function estadoLabel(estado) {
  if (estado === 'recebida') return 'Paga';
  if (estado === 'atrasada') return 'Atrasada';
  return 'Pendente';
}

function FilterCombobox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between bg-background font-normal text-muted-foreground border-dashed hover:border-primary/50">
          <span className="truncate text-foreground">{value ? options.find(o => o.value === value)?.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 z-[100]" align="start">
        <Command>
          <CommandInput placeholder={`Pesquisar...`} />
          <CommandEmpty>Sem resultados.</CommandEmpty>
          <CommandGroup className="max-h-48 overflow-y-auto no-scrollbar">
            <CommandItem onSelect={() => { onChange(''); setOpen(false); }}>
              <Check className={cn("mr-2 h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
              Todos
            </CommandItem>
            {options.map(o => (
              <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false); }}>
                <Check className={cn("mr-2 h-4 w-4", value === o.value ? "opacity-100" : "opacity-0")} />
                {o.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Rendas() {
  const qc = useQueryClient();
  const hoje = new Date();

  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [detalheId, setDetalheId] = useState(null);

  // Filtros Globais
  const [verTodas, setVerTodas] = useState(false);
  const [verFechosPendentes, setVerFechosPendentes] = useState(false);

  // Filtros Locais
  const [filtroMorada, setFiltroMorada] = useState('');
  const [filtroProprietario, setFiltroProprietario] = useState('');
  const [filtroInquilino, setFiltroInquilino] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('all');

  const { data: propriedades = [] } = useQuery({ queryKey: ['propriedades'], queryFn: () => agenciaAvenida.entities.Propriedade.list() });
  const { data: rendas = [] } = useQuery({ queryKey: ['rendas'], queryFn: () => agenciaAvenida.entities.RendaMensal.list() });
  const { data: pessoas = [] } = useQuery({ queryKey: ['pessoas'], queryFn: () => agenciaAvenida.entities.Pessoa.list() });

  const pessoaNome = (id) => pessoas.find(p => p.id === id)?.nome || 'Desconhecido';
  const propInfo = (id) => propriedades.find(p => p.id === id);

  const moradaOptions = propriedades.filter(p => p.ativa !== false && p.ativa !== 'false').map(p => ({ value: p.id, label: p.morada }));

  const propsSet = new Set();
  const inqSet = new Set();
  propriedades.forEach(p => {
    parseJsonArray(p.proprietario_id).forEach(id => propsSet.add(id));
    parseJsonArray(p.inquilino_id).forEach(id => inqSet.add(id));
  });
  const propOptions = Array.from(propsSet).map(id => ({ value: id, label: pessoaNome(id) }));
  const inqOptions = Array.from(inqSet).map(id => ({ value: id, label: pessoaNome(id) }));

  // Lógica de Filtragem e Ordenação
  const isGlobalFilterActive = verTodas || verFechosPendentes;

  let rendasBase = rendas;
  if (verFechosPendentes) {
    rendasBase = rendas.filter(r => r.estado === 'recebida' && !r.fechada);
  } else if (!verTodas) {
    rendasBase = rendas.filter(r => r.mes === mes && r.ano === ano);
  }

  const rendasFiltradas = rendasBase.filter(r => {
    const prop = propInfo(r.propriedade_id);
    if (!prop) return false;
    if (filtroMorada && r.propriedade_id !== filtroMorada) return false;
    if (filtroEstado !== 'all' && r.estado !== filtroEstado) return false;
    if (filtroProprietario) {
      const propsArray = parseJsonArray(prop.proprietario_id);
      if (!propsArray.includes(filtroProprietario)) return false;
    }
    if (filtroInquilino) {
      const inqArray = parseJsonArray(prop.inquilino_id);
      if (!inqArray.includes(filtroInquilino)) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.ano !== b.ano) return b.ano - a.ano;
    return b.mes - a.mes;
  });

  const gerarRendasMes = useMutation({
    mutationFn: async () => {
      const existentesNoMes = new Set(rendas.filter(r => r.mes === mes && r.ano === ano).map(r => r.propriedade_id));
      const toCreate = propriedades
        .filter(p => p.ativa !== false && p.ativa !== 'false' && !existentesNoMes.has(p.id))
        .map(p => ({
          propriedade_id: p.id,
          ano,
          mes,
          valor_renda: parseFloat(p.renda_mensal) || 0,
          estado: 'pendente',
        }));
      if (toCreate.length > 0) await Promise.all(toCreate.map(r => agenciaAvenida.entities.RendaMensal.create(r)));
      return toCreate.length;
    },
    onSuccess: (qtdGerada) => {
      qc.invalidateQueries({ queryKey: ['rendas'] });
      if (qtdGerada > 0) toast.success(`${qtdGerada} ${qtdGerada === 1 ? 'renda foi gerada' : 'rendas foram geradas'}.`);
      else toast.info(`Todas as propriedades ativas já têm rendas lançadas.`);
    },
  });

  useEffect(() => {
    const diaHoje = hoje.getDate();
    if (diaHoje === 1 && mes === (hoje.getMonth() + 1) && ano === hoje.getFullYear() && propriedades.length > 0) {
      if (!rendas.some(r => r.mes === mes && r.ano === ano) && !gerarRendasMes.isPending) {
        gerarRendasMes.mutate();
      }
    }
  }, [rendas.length, propriedades.length]);

  const detalheRenda = rendas.find(r => r.id === detalheId);

  return (
    <div>
      <PageHeader title="Rendas" subtitle="Controlo mensal de pagamentos e repasses aos proprietários."
        action={
          <Button onClick={() => gerarRendasMes.mutate()} disabled={gerarRendasMes.isPending || isGlobalFilterActive} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <RefreshCw className={`w-4 h-4 ${gerarRendasMes.isPending ? 'animate-spin' : ''}`} />
            {gerarRendasMes.isPending ? 'A gerar...' : 'Gerar Rendas do Mês'}
          </Button>
        }
      />

      <div className="flex flex-col lg:flex-row gap-6 mb-6 items-stretch">

        {/* BLOCO ESQUERDO: Seletor Mês + Botão Mês Atual */}
        <div className="flex flex-col gap-2 shrink-0 w-full lg:w-auto">
          {/* Caixa do Mês com flex-1 para esticar e igualar a altura */}
          <div className="flex items-center justify-between gap-2 bg-card border border-border rounded-xl p-4 shadow-sm w-full lg:w-auto flex-1 min-h-[104px]">
            <Button variant="ghost" size="icon" disabled={isGlobalFilterActive} onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }} className="hover:bg-muted rounded-md h-10 w-10">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex flex-col items-center justify-center min-w-[130px]">
              {isGlobalFilterActive ? (
                <span className="font-black text-xl text-muted-foreground uppercase tracking-widest">TODOS</span>
              ) : (
                <>
                  <span className="font-black text-lg text-foreground uppercase tracking-wider leading-none">{MESES[mes - 1]}</span>
                  <span className="text-sm font-bold text-muted-foreground leading-none mt-1.5">{ano}</span>
                </>
              )}
            </div>
            <Button variant="ghost" size="icon" disabled={isGlobalFilterActive} onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }} className="hover:bg-muted rounded-md h-10 w-10">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* BLOCO DIREITO: Resumo Financeiro */}
        <div className="flex gap-4 flex-1 w-full overflow-x-auto no-scrollbar">
          {[
            { label: 'Recebidas', count: rendasFiltradas.filter(r => r.estado === 'recebida').length, total: rendasFiltradas.filter(r => r.estado === 'recebida').reduce((s, r) => s + calcularTotalRenda(r), 0), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Pendentes', count: rendasFiltradas.filter(r => r.estado === 'pendente').length, total: rendasFiltradas.filter(r => r.estado === 'pendente').reduce((s, r) => s + calcularTotalRenda(r), 0), color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-100' },
            { label: 'Atrasadas', count: rendasFiltradas.filter(r => r.estado === 'atrasada').length, total: rendasFiltradas.filter(r => r.estado === 'atrasada').reduce((s, r) => s + calcularTotalRenda(r), 0), color: 'text-red-700', bg: 'bg-red-50 border-red-100' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-xl px-6 py-4 border shadow-sm flex flex-col justify-center min-w-[160px] flex-1 h-full`}>
              <p className="text-s font-bold tracking-wider text-muted-foreground/80">{s.label}</p>
              <p className={`text-4xl font-black ${s.color} leading-none mt-2`}>{s.count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controlos Superiores */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={verTodas ? "default" : "outline"}
          className={cn("transition-all border-dashed font-bold", verTodas && "bg-primary border-solid shadow-sm")}
          onClick={() => { setVerTodas(!verTodas); setVerFechosPendentes(false); }}
        >
          {verTodas ? <><Filter className="w-4 h-4 mr-2" /> A Ver Todas (Desde Sempre)</> : 'Ver Todas (Desde Sempre)'}
        </Button>

        <Button
          variant={verFechosPendentes ? "default" : "outline"}
          className={cn("transition-all border-dashed font-bold text-emerald-700 hover:text-emerald-800", verFechosPendentes && "bg-emerald-600 text-white border-solid hover:bg-emerald-700 shadow-sm")}
          onClick={() => { setVerFechosPendentes(!verFechosPendentes); setVerTodas(false); }}
        >
          {verFechosPendentes ? <><Check className="w-4 h-4 mr-2" /> A Ver Fechos Pendentes</> : 'Ver Fechos Pendentes (Rendas Pagas)'}
        </Button>

        {/* Botão Ir para Mês Atual AQUI */}
        <Button
          variant="outline"
          className="border-dashed font-bold text-muted-foreground hover:text-foreground"
          disabled={isGlobalFilterActive || (mes === hoje.getMonth() + 1 && ano === hoje.getFullYear())}
          onClick={() => { setMes(hoje.getMonth() + 1); setAno(hoje.getFullYear()); }}
        >
          <Clock className="w-4 h-4 mr-2" /> Ir Mês Atual
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FilterCombobox value={filtroMorada} onChange={setFiltroMorada} options={moradaOptions} placeholder="Filtrar por Morada..." />
        <FilterCombobox value={filtroProprietario} onChange={setFiltroProprietario} options={propOptions} placeholder="Filtrar Proprietário..." />
        <FilterCombobox value={filtroInquilino} onChange={setFiltroInquilino} options={inqOptions} placeholder="Filtrar Inquilino..." />
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full bg-background border-dashed text-muted-foreground hover:border-primary/50">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectItem value="all">Todos os Estados</SelectItem>
            <SelectItem value="recebida">Paga / Recebida</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasada">Atrasada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de rendas */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-border">
          {rendasFiltradas.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium text-foreground">Não Existem Rendas Listadas (Filtros Atuais)</p>
            </div>
          )}
          {rendasFiltradas.map(r => {
            const prop = propInfo(r.propriedade_id);
            const inqArray = parseJsonArray(prop?.inquilino_id);
            const nomesInquilinos = inqArray.length > 0 ? inqArray.map(id => pessoaNome(id)).join(', ') : 'Sem Inquilino Registado';

            const totalComEncargos = calcularTotalRenda(r);

            return (
              <div
                key={r.id}
                className="px-5 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/40 cursor-pointer transition-colors"
                onClick={() => setDetalheId(r.id)}
              >
                <div className="flex-1">
                  <p className="font-black text-foreground mb-0.5 tracking-wide text-xl">{prop?.morada || 'Propriedade Desconhecida'}</p>
                  <p className="text-sm text-muted-foreground font-medium">Inquilinos: {nomesInquilinos}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {isGlobalFilterActive && (
                      <span className="text-[10px] uppercase font-black text-primary tracking-wider bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                        {MESES[r.mes - 1]} {r.ano}
                      </span>
                    )}
                    {r.fechada && <span className="text-[10px] uppercase font-bold bg-green-100 border border-green-200 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><Check className="w-3 h-3" /> Mês Fechado</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto mt-2 sm:mt-0 pt-3 border-t sm:border-0 border-dashed border-border">
                  <span className="font-black text-2xl text-primary">€{totalComEncargos.toFixed(2)}</span>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border ${estadoBadge(r.estado)}`}>{estadoLabel(r.estado)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {detalheRenda && (
        <RendaDetalhe
          renda={detalheRenda}
          prop={propInfo(detalheRenda.propriedade_id)}
          pessoas={pessoas}
          onClose={() => setDetalheId(null)}
          onFecho={() => setDetalheId(null)}
        />
      )}
    </div>
  );
}