import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, Home, Users, CreditCard,
  Receipt, AlertTriangle, FileText, BarChart3, Settings, LogOut, Menu, X
} from 'lucide-react';
import { useState } from 'react';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import CondominioSelector from './CondominioSelector';

const LOGO_URL = "https://media.agenciaAvenida.com/images/public/user_69ea73b562cec41faae7023d/560647939_264be9ba-be8e-4182-ac20-e19ea39feb71.jpeg";

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Condomínios', icon: Building2, path: '/condominios' },
  { label: 'Frações', icon: Home, path: '/fracoes' },
  { label: 'Pessoas', icon: Users, path: '/pessoas' },
  { label: 'Quotas', icon: CreditCard, path: '/quotas' },
  { label: 'Despesas', icon: Receipt, path: '/despesas' },
  { label: 'Ocorrências', icon: AlertTriangle, path: '/ocorrencias' },
  { label: 'Documentos', icon: FileText, path: '/documentos' },
  { label: 'Financeiro', icon: BarChart3, path: '/financeiro' },
];

export default function Sidebar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => agenciaAvenida.auth.logout();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border">
        <img src={LOGO_URL} alt="Agência Avenida" className="h-10 w-auto object-contain rounded" />
        <div>
          <p className="text-sidebar-foreground font-semibold text-sm leading-tight">Agência Avenida</p>
          <p className="text-sidebar-foreground/50 text-xs">Gestão de Condomínios</p>
        </div>
      </div>

      {/* Condomínio Selector */}
      <CondominioSelector />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
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
      <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
        <Link
          to="/configuracoes"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-sidebar text-sidebar-foreground"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={cn(
        'lg:hidden fixed left-0 top-0 h-full w-64 z-40 bg-sidebar transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-sidebar h-screen sticky top-0">
        <SidebarContent />
      </div>
    </>
  );
}