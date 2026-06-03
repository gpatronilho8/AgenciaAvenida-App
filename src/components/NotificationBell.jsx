import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, AlertTriangle, FileText, RefreshCw, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agenciaAvenida } from '@/api/agenciaAvenidaClient.js';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const tipoRota = {
  ocorrencia: '/condominios/ocorrencias',
  processo_novo: '/processos',
  processo_atualizado: '/processos',
};

const tipoIcon = {
  ocorrencia: AlertTriangle,
  processo_novo: FileText,
  processo_atualizado: RefreshCw,
};

const tipoColor = {
  ocorrencia: 'text-orange-500',
  processo_novo: 'text-blue-500',
  processo_atualizado: 'text-violet-500',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: notificacoes = [] } = useQuery({
    queryKey: ['notificacoes'],
    queryFn: () => agenciaAvenida.entities.Notificacao.list('-created_date', 30),
    refetchInterval: 30000,
  });

  const naoLidas = notificacoes.filter(n => !n.lida).length;

  const marcarLida = useMutation({
    mutationFn: (id) => agenciaAvenida.entities.Notificacao.update(id, { lida: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => {
      const naoLidasList = notificacoes.filter(n => !n.lida);
      await Promise.all(naoLidasList.map(n => agenciaAvenida.entities.Notificacao.update(n.id, { lida: true })));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const limparTodas = useMutation({
    mutationFn: async () => {
      await Promise.all(notificacoes.map(n => agenciaAvenida.entities.Notificacao.delete(n.id)));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificacoes'] }),
  });

  const handleClickNotificacao = (n) => {
    if (!n.lida) marcarLida.mutate(n.id);
    const rota = tipoRota[n.tipo];
    if (rota) { setOpen(false); navigate(rota); }
  };

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Modal central */}
      {open && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setOpen(false)}
          />
          {/* Pop-up central */}
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-popover border border-border rounded-2xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Notificações</span>
                {naoLidas > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{naoLidas}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {naoLidas > 0 && (
                  <button
                    onClick={() => marcarTodasLidas.mutate()}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" /> Marcar lidas
                  </button>
                )}
                {notificacoes.length > 0 && (
                  <button
                    onClick={() => limparTodas.mutate()}
                    className="text-xs text-destructive hover:underline flex items-center gap-1"
                    title="Limpar todas"
                  >
                    <Trash2 className="w-3 h-3" /> Limpar
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto divide-y divide-border">
              {notificacoes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Bell className="w-10 h-10 opacity-20 mb-3" />
                  <p className="text-sm">Sem notificações</p>
                </div>
              )}
              {notificacoes.map(n => {
                const Icon = tipoIcon[n.tipo] || Bell;
                const color = tipoColor[n.tipo] || 'text-muted-foreground';
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickNotificacao(n)}
                    className={cn(
                      'flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-muted/50 transition-colors',
                      !n.lida && 'bg-primary/5'
                    )}
                  >
                    <div className={cn('mt-0.5 flex-shrink-0', color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm leading-snug', !n.lida ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{n.titulo}</p>
                      {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5">{n.mensagem}</p>}
                      {n.created_date && (
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {new Date(n.created_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {!n.lida && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}