import { useQuery } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { useCondominio } from '@/lib/CondominioContext';
import { useAuth } from '@/lib/AuthContext'; // IMPORT DO CONTEXTO DE AUTENTICAÇÃO
import { Building2, ChevronDown, Search, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import NotificationBell from '@/components/NotificationBell';

export default function CondominioTopBar({ module }) {
  const { selectedCondominioId, setSelectedCondominioId, selectedAno, setSelectedAno } = useCondominio();
  const { user, logout } = useAuth(); // EXTRAIR USER E LOGOUT DIRETAMENTE

  const { data: condominios = [] } = useQuery({
    queryKey: ['condominios'],
    queryFn: () => agenciaAvenida.entities.Condominio.list(),
  });
  
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openAno, setOpenAno] = useState(false); 
  
  const ref = useRef(null);
  const refAno = useRef(null); 
  
  const location = useLocation();

  const activeCondominios = condominios
    .filter(c => c.ativo !== false)
    .sort((a, b) => (a.codigo || '').localeCompare(b.codigo || '', undefined, { numeric: true, sensitivity: 'base' }));

  const selected = activeCondominios.find(c => c.id === selectedCondominioId);
  
  const label = selected 
    ? (selected.codigo ? `(${selected.codigo}) ${selected.nome}` : selected.nome) 
    : 'Todos os Condomínios';

  const filtered = activeCondominios.filter(c => {
    if (!search) return true;
    const term = search.toLowerCase();
    return c.nome?.toLowerCase().includes(term) || c.codigo?.toLowerCase().includes(term);
  });

  useEffect(() => {
    const handler = (e) => { 
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(''); }
      if (refAno.current && !refAno.current.contains(e.target)) { setOpenAno(false); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const paginasGlobais = ['/pessoas', '/configuracoes', '/condominios/lista', "/condominios/assembleias"];
  const mostrarSeletor = module === 'condominios' && !paginasGlobais.includes(location.pathname);

  const paginasComSeletorAno = ['/condominios/quotas', '/condominios/movimentos', '/condominios/ocorrencias', '/condominios/documentos', '/condominios/processos-judiciais'];
  const mostrarSeletorAno = module === 'condominios' && paginasComSeletorAno.includes(location.pathname);

  const opcoesAno = ['all', 2025, 2026, 2027, 2028];
  const anoLabel = selectedAno === 'all' ? 'Todos' : selectedAno;

  return (
    <div className="border-b border-border bg-background px-6 py-2.5 flex items-center gap-3 flex-shrink-0 min-h-[57px]">
      {mostrarSeletor && (
        <>
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline-block">Condomínio:</span>
          <div className="relative" ref={ref}>
            <button
              onClick={() => { setOpen(!open); setSearch(''); setOpenAno(false); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-all"
            >
              <span className="max-w-[200px] sm:max-w-[300px] truncate">{label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} />
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
                      placeholder="Pesquisar por nome ou ID..."
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
                    <span className="truncate">
                      {c.codigo && <span className="font-bold mr-1.5 opacity-80">({c.codigo})</span>}
                      {c.nome}
                    </span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">Sem resultados</p>
                )}
              </div>
            )}
          </div>

          {mostrarSeletorAno && (
            <>
              <div className="w-px h-5 bg-border mx-1 hidden sm:block"></div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline-block">Ano:</span>
              <div className="relative" ref={refAno}>
                <button
                  onClick={() => { setOpenAno(!openAno); setOpen(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium transition-all min-w-[90px] justify-between"
                >
                  <span>{anoLabel}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0 ${openAno ? 'rotate-180' : ''}`} />
                </button>
                
                {openAno && (
                  <div className="absolute left-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[100px]">
                    {opcoesAno.map(ano => (
                      <button
                        key={ano}
                        onClick={() => { 
                          setSelectedAno(ano === 'all' ? 'all' : parseInt(ano)); 
                          setOpenAno(false); 
                        }}
                        className={`w-full text-left flex items-center px-3 py-2 text-sm transition-colors ${
                          selectedAno === ano || (selectedAno === 'all' && ano === 'all')
                            ? 'text-primary font-semibold bg-primary/5' 
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {ano === 'all' ? 'Todos' : ano}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <NotificationBell />
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-border">
            <div className="hidden sm:block text-right">
              {/* Leitura corrigida para o Supabase Metadata */}
              <p className="text-sm font-semibold text-foreground leading-tight">
                {user.user_metadata?.full_name || 'Colaborador'}
              </p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            {/* Lógica da inicial corrigida */}
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-sm border border-border flex-shrink-0 uppercase">
              {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}