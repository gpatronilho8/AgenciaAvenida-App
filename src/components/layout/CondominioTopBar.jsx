import { useQuery } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { useCondominio } from '@/lib/CondominioContext';
import { Building2, ChevronDown, Search, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import NotificationBell from '@/components/NotificationBell';

export default function CondominioTopBar({ module }) {
  const { selectedCondominioId, setSelectedCondominioId } = useCondominio();
  const { data: condominios = [] } = useQuery({
    queryKey: ['condominios'],
    queryFn: () => agenciaAvenida.entities.Condominio.list(),
  });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    agenciaAvenida.auth.me().then(setUser).catch(() => {});
  }, []);

  const selected = condominios.find(c => c.id === selectedCondominioId);
  const label = selected ? selected.nome : 'Todos os Condomínios';

  const filtered = condominios.filter(c =>
    !search || c.nome?.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="border-b border-border bg-background px-6 py-2.5 flex items-center gap-3 flex-shrink-0">
      {/* Seletor de condomínio — apenas no módulo condominios */}
      {module === 'condominios' && (
        <>
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condomínio:</span>
          <div className="relative" ref={ref}>
            <button
              onClick={() => { setOpen(!open); setSearch(''); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-all"
            >
              <span>{label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-64">
                <div className="px-2 pb-1 border-b border-border mb-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      autoFocus
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Pesquisar condomínio..."
                      className="w-full pl-7 pr-3 py-1.5 text-sm bg-muted rounded-lg outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => { setSelectedCondominioId('all'); setOpen(false); setSearch(''); }}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    selectedCondominioId === 'all' ? 'text-primary font-semibold bg-primary/5' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Todos os Condomínios
                </button>
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => { setSelectedCondominioId(c.id); setOpen(false); setSearch(''); }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      selectedCondominioId === c.id ? 'text-primary font-semibold bg-primary/5' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedCondominioId === c.id ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                    <span className="truncate">{c.nome}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Sem resultados</p>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notifications + User — sempre visível */}
      <div className="flex items-center gap-3">
        <NotificationBell />
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-foreground leading-tight">{user.full_name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm border border-border flex-shrink-0">
              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <button
              onClick={() => agenciaAvenida.auth.logout()}
              title="Sair"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}