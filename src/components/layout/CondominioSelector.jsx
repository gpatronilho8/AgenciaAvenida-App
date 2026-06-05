import { useQuery } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { useCondominio } from '@/lib/CondominioContext';
import { Building2, ChevronDown } from 'lucide-react';

export default function CondominioSelector() {
  const { selectedCondominioId, setSelectedCondominioId } = useCondominio();
  const { data: condominios = [] } = useQuery({
    queryKey: ['condominios'],
    queryFn: () => agenciaAvenida.entities.Condominio.list(),
  });

  const selected = condominios.find(c => c.id === selectedCondominioId);

  return (
    <div className="px-3 py-3 border-b border-sidebar-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/40 mb-2 px-1">Filtrar por Condomínio</p>
      <div className="space-y-0.5">
        <button
          onClick={() => setSelectedCondominioId('all')}
          className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
            selectedCondominioId === 'all'
              ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
              : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
          }`}
        >
          <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>TODOS</span>
        </button>
        {condominios.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedCondominioId(c.id)}
            className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              selectedCondominioId === c.id
                ? 'bg-sidebar-primary/20 text-sidebar-primary font-semibold'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'
            }`}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedCondominioId === c.id ? 'bg-sidebar-primary' : 'bg-sidebar-foreground/20'}`} />
            <span className="truncate">{c.nome}</span>
          </button>
        ))}
      </div>
    </div>
  );
}