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

  useEffect(() => {
    document.title = "DEFINIR NOVA PALAVRA-PASSE";

    // BARREIRA ANTI-CURIOSOS: Verifica se o utilizador tem a sessão temporária do e-mail
    const verificarAcesso = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Se alguém entrou aqui digitando o URL manualmente (sem token), é expulso!
        toast.error('LINK INVÁLIDO OU EXPIRADO. SOLICITE UMA NOVA RECUPERAÇÃO.');
        navigate('/login-cliente', { replace: true });
      }
    };

    verificarAcesso();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // O Supabase usa a sessão temporária para autorizar esta alteração
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;

      toast.success('PALAVRA-PASSE ATUALIZADA COM SUCESSO');
      
      // Destrói a sessão temporária e manda o utilizador fazer login com a chave nova
      await supabase.auth.signOut();
      navigate('/login-cliente', { replace: true });
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