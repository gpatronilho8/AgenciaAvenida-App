import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const estadoColors = {
  agendada: 'bg-blue-500',
  realizada: 'bg-green-500',
  cancelada: 'bg-red-400',
};

export default function CalendarioAssembleias({ assembleias, condominios, onClickAssembleia, onNew }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });

  // Preencher dias da semana antes do início
  const startDow = start.getDay();
  const prefixDays = Array.from({ length: startDow }, (_, i) => null);

  const getCondName = (id) => condominios.find(c => c.id === id)?.nome || '-';

  const assembleiasDoDia = (day) => assembleias.filter(a => {
    try { return isSameDay(parseISO(a.data), day); } catch { return false; }
  });

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: pt })}
        </h2>
        <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-muted rounded-lg transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dias semana */}
      <div className="grid grid-cols-7 border-b border-border">
        {DIAS_SEMANA.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
        ))}
      </div>

      {/* Grelha dias */}
      <div className="grid grid-cols-7">
        {prefixDays.map((_, i) => (
          <div key={`pre-${i}`} className="min-h-[90px] border-r border-b border-border bg-muted/20" />
        ))}
        {days.map(day => {
          const eventos = assembleiasDoDia(day);
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className="min-h-[90px] border-r border-b border-border p-1.5 relative">
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {eventos.map(a => (
                  <button
                    key={a.id}
                    onClick={() => onClickAssembleia(a)}
                    className={`w-full text-left text-xs px-1.5 py-0.5 rounded text-white truncate ${estadoColors[a.estado] || 'bg-gray-500'}`}
                    title={a.titulo}
                  >
                    {a.hora && <span className="opacity-80">{a.hora} </span>}
                    {a.titulo}
                  </button>
                ))}
              </div>
              <button
                onClick={onNew}
                className="absolute bottom-1 right-1 opacity-0 hover:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity"
                title="Nova assembleia"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}