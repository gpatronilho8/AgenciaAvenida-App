import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const estadoColors = {
  agendada: 'bg-blue-500 hover:bg-blue-600',
  realizada: 'bg-green-500 hover:bg-green-600',
  cancelada: 'bg-red-400 hover:bg-red-500',
};

export default function CalendarioAssembleias({ assembleias, condominios, onClickAssembleia, onNew, triggerToday }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 1. O "ouvido" que deteta quando clicas no botão "Hoje" no ecrã principal
  useEffect(() => {
    if (triggerToday > 0) {
      setCurrentMonth(new Date());
    }
  }, [triggerToday]);

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  // Preencher dias da semana antes do início
  const startDow = start.getDay();
  const prefixDays = Array.from({ length: startDow }, (_, i) => null);

  const assembleiasDoDia = (day) => assembleias.filter(a => {
    try { return isSameDay(parseISO(a.data), day); } catch { return false; }
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/10">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-background border border-transparent hover:border-border rounded-lg transition-all shadow-sm">
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <h2 className="font-bold text-lg text-foreground capitalize tracking-wide">
          {format(currentMonth, 'MMMM yyyy', { locale: pt })}
        </h2>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-background border border-transparent hover:border-border rounded-lg transition-all shadow-sm">
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Dias semana */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/20">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs font-bold uppercase tracking-wider text-muted-foreground py-3">
            {d}
          </div>
        ))}
      </div>

      {/* Grelha dias */}
      <div className="grid grid-cols-7">
        {prefixDays.map((_, i) => (
          <div key={`pre-${i}`} className="min-h-[110px] border-r border-b border-border/50 bg-muted/10" />
        ))}
        {days.map(day => {
          const eventos = assembleiasDoDia(day);
          const isToday = isSameDay(day, new Date());
          
          return (
            <div key={day.toISOString()} className="group min-h-[110px] border-r border-b border-border/50 p-1.5 relative hover:bg-muted/5 transition-colors">
              <div className="flex items-start justify-between mb-1.5">
                <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
                {/* Botão Nova Assembleia no Dia Específico */}
                <button
                  onClick={(e) => { e.stopPropagation(); onNew(day); }}
                  className="opacity-0 group-hover:opacity-100 p-1 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded transition-all"
                  title="Nova assembleia"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-1">
                {eventos.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onClickAssembleia(a)}
                    className={`w-full flex items-center gap-1 text-left text-[11px] px-2 py-1 rounded text-white shadow-sm transition-colors ${estadoColors[a.estado] || 'bg-gray-500 hover:bg-gray-600'}`}
                    title={a.titulo}
                  >
                    {a.hora && <span className="font-bold shrink-0">{a.hora.substring(0, 5)}</span>}
                    <span className="truncate">{a.titulo}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}