import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { supabase } from '@/api/supabase.js';

export default function AtualizarPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    document.title = "DEFINIR NOVA PALAVRA-PASSE";

    const verificarAcesso = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Se não houver token/sessão, envia para o ecrã de Sem Acesso
        navigate('/sem-acesso', { replace: true });
      } else {
        // Guarda a role para sabermos para onde o atirar no final
        setUserRole(session.user.user_metadata?.role);
      }
    };

    verificarAcesso();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;

      toast.success('PALAVRA-PASSE ATUALIZADA COM SUCESSO!');
      
      // Construtor dinâmico de URLs (funciona em localhost e em produção)
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : '';
      // Remove subdomínios caso já lá esteja, para ter o domínio base limpo
      const baseDomain = window.location.hostname.replace(/^(cliente\.|backoffice\.)/, '');

      // Redirecionamento baseado na Role (mantém a sessão ativa!)
      setTimeout(() => {
        if (userRole === 'cliente') {
          window.location.href = `${protocol}//cliente.${baseDomain}${port}/portal`;
        } else if (userRole === 'backoffice') {
          window.location.href = `${protocol}//backoffice.${baseDomain}${port}/hub`;
        } else if (userRole === 'global') {
          window.location.href = `${protocol}//${baseDomain}${port}/`;
        } else {
          navigate('/', { replace: true });
        }
      }, 1500); // 1.5s de atraso para o utilizador conseguir ler o Toast verde

    } catch (error) {
      toast.error(error.message || 'ERRO AO ATUALIZAR A PALAVRA-PASSE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">
        
        <div className="text-center space-y-1.5 pb-1">
          <div className="mx-auto w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-black uppercase tracking-wider text-foreground">Nova Palavra-passe</h1>
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Escolha uma nova chave de acesso</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-3 pt-1">
          <div className="space-y-1">
            <Label className="text-[9px] font-black uppercase tracking-wider">Nova Palavra-passe</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input 
                type="password" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="pl-9 h-9 bg-background text-sm" 
                placeholder="••••••••" 
                minLength={6}
              />
            </div>
          </div>

          <div className="pt-3">
            <Button type="submit" disabled={loading} className="w-full h-9.5 font-black uppercase text-[11px] tracking-wider rounded-lg">
              {loading ? 'A guardar...' : 'Gravar Nova Palavra-passe'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}