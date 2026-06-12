import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Home, Users, CreditCard,
  Receipt, AlertTriangle, FileText, Settings,
  Menu, X, ChevronLeft, HomeIcon, Layers, Scale, CalendarDays
} from 'lucide-react';
import { useState } from 'react';

const LOGO_URL = "/aa_white.png";

const navByModule = {
  condominios: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/condominios/dashboard' },
    { label: 'Condomínios', icon: Building2, path: '/condominios/lista' },
    { label: 'Frações', icon: Home, path: '/condominios/fracoes' },
    { label: 'Entidades', icon: Users, path: '/pessoas' },
    { label: 'Quotas', icon: CreditCard, path: '/condominios/quotas' },
    { label: 'Financeiro', icon: Receipt, path: '/condominios/movimentos' },
    { label: 'Ocorrências', icon: AlertTriangle, path: '/condominios/ocorrencias' },
    { label: 'Documentos', icon: FileText, path: '/condominios/documentos' },
    { label: 'Proc. Judiciais', icon: Scale, path: '/condominios/processos-judiciais' },
    { label: 'Assembleias', icon: CalendarDays, path: '/condominios/assembleias' },
  ],
  propriedades: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/propriedades/dashboard' },
    { label: 'Propriedades', icon: HomeIcon, path: '/propriedades/lista' },
    { label: 'Rendas', icon: CreditCard, path: '/propriedades/rendas' },
    { label: 'Entidades', icon: Users, path: '/propriedades/pessoas' },
  ],
  processos: [
    { label: 'Processos', icon: Layers, path: '/processos' },
    { label: 'Entidades', icon: Users, path: '/processos/pessoas' },
  ],
};

const moduleColors = {
  condominios: { accent: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Condomínios' },
  propriedades: { accent: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Propriedades' },
  processos: { accent: 'text-violet-400', bg: 'bg-violet-500/20', label: 'Processos' },
};

export default function ModuleSidebar({ module }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = navByModule[module] || [];
  const colors = moduleColors[module] || moduleColors.condominios;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo + Module */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <img src={LOGO_URL} alt="Agência Avenida" className="h-9 w-auto object-contain rounded" />
          <div>
            <p className="text-sidebar-foreground font-semibold text-sm leading-tight">Agência Avenida</p>
            <p className="text-sidebar-foreground/50 text-xs">Plataforma de Gestão</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${colors.bg}`}>
          <span className={`text-xs font-bold uppercase tracking-wider ${colors.accent}`}>{colors.label}</span>
        </div>
      </div>

      {/* Nav - AQUI ESTÁ A CLASSE no-scrollbar */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-sidebar-primary/20 text-sidebar-primary'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-sidebar-primary' : '')} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-0.5">
        <button
          onClick={() => navigate('/hub')}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar ao Início
        </button>
        <Link
          to="/configuracoes"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}
      <div className={cn(
        'lg:hidden fixed left-0 top-0 h-full w-64 z-40 bg-sidebar transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>
      
      {/* Largura adaptativa para Desktop */}
      <div className="hidden lg:flex flex-col w-60 xl:w-64 flex-shrink-0 bg-sidebar h-screen sticky top-0 transition-all duration-300">
        <SidebarContent />
      </div>
    </>
  );
}