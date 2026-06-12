import { useNavigate } from 'react-router-dom';
import { Building2, Home, FileText, ArrowRight, LogOut, Printer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const LOGO_WHITE = "/aa_white.png";

const modules = [
  {
    id: 'condominios',
    icon: Building2,
    label: 'Condomínios',
    description: 'Gestão de edifícios, frações, quotas, despesas e ocorrências.',
    path: '/condominios/dashboard',
    color: 'from-blue-600 to-blue-800',
    stats: ['Quotas', 'Despesas', 'Ocorrências', 'Documentos'],
  },
  {
    id: 'propriedades',
    icon: Home,
    label: 'Propriedades',
    description: 'Gestão de arrendamentos, rendas mensais e fechos aos proprietários.',
    path: '/propriedades/dashboard',
    color: 'from-emerald-600 to-emerald-800',
    stats: ['Rendas', 'Despesas', 'Fechos', 'Transferências'],
  },
  {
    id: 'processos',
    icon: FileText,
    label: 'Processos',
    description: 'IRS, cartas de condução, certidões e outros serviços.',
    path: '/processos',
    color: 'from-violet-600 to-violet-800',
    stats: ['IRS', 'Carta Condução', 'Certidões', 'Outros'],
  },
];

function OcorrenciaPreviewDialog({ ocorrencia, onClose }) {
  if (!ocorrencia) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">{ocorrencia.titulo}</h2>
            <p className="text-sm text-muted-foreground capitalize">{ocorrencia.tipo} · {ocorrencia.area}</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1">
            <Printer className="w-3.5 h-3.5" />Imprimir
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-muted/40 rounded-lg p-3 text-sm mb-3">
          <div className="flex items-center gap-2"><span className="font-medium">Estado:</span> <StatusBadge status={ocorrencia.estado} /></div>
          <div className="flex items-center gap-2"><span className="font-medium">Prioridade:</span> <StatusBadge status={ocorrencia.prioridade} /></div>
          {ocorrencia.data_abertura && <div><span className="font-medium">Abertura:</span> {ocorrencia.data_abertura}</div>}
          {ocorrencia.data_resolucao && <div><span className="font-medium">Resolução:</span> {ocorrencia.data_resolucao}</div>}
        </div>
        {ocorrencia.descricao && <p className="text-sm text-muted-foreground mb-2">{ocorrencia.descricao}</p>}
        {ocorrencia.observacoes && <p className="text-sm text-muted-foreground italic">{ocorrencia.observacoes}</p>}
      </DialogContent>
    </Dialog>
  );
}

export default function Hub() {
  const navigate = useNavigate();
  const [previewOcorrencia, setPreviewOcorrencia] = useState(null);
  
  // 1. EXTRAÍMOS O LOGOUT DIRETAMENTE DO CONTEXTO AQUI
  const { user, logout } = useAuth();

  const { data: ocorrencias = [] } = useQuery({ 
    queryKey: ['ocorrencias-hub'], 
    queryFn: () => agenciaAvenida.entities.Ocorrencia.filter({ estado: 'aberta' }, '-data_abertura', 5) 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      <header className="flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <img src={LOGO_WHITE} alt="Agência Avenida" className="h-16 w-auto" />
          <div className="border-l border-white/20 pl-4">
            <p className="text-white font-bold text-lg leading-tight">Agência Avenida</p>
            <p className="text-slate-400 text-xs">Plataforma de Gestão</p>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              {/* Leitura do nome ajustada para o padrão Supabase */}
              <p className="text-white text-sm font-semibold">{user.user_metadata?.full_name}</p>
              <p className="text-slate-400 text-xs">{user.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center text-white font-bold text-sm border border-slate-500 uppercase">
              {/* Fallback de segurança para a inicial do nome ou email */}
              {user.user_metadata?.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </div>
            <button
              onClick={logout} // 2. LIGAÇÃO DIRETA À FUNÇÃO DO CONTEXTO
              title="Sair"
              className="ml-1 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-5xl">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                onClick={() => navigate(mod.path)}
                className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${mod.color} mb-4 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{mod.label}</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {mod.stats.map(s => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-300">{s}</span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-400 group-hover:text-white transition-colors">
                  Entrar no módulo
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </main>

      <footer className="text-center py-4 text-slate-600 text-xs">
        © {new Date().getFullYear()} Agência Avenida · Plataforma de Gestão
      </footer>

      <OcorrenciaPreviewDialog ocorrencia={previewOcorrencia} onClose={() => setPreviewOcorrencia(null)} />
    </div>
  );
}