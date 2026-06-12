import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/api/supabase.js';
import { useAuth } from '@/lib/AuthContext';

export default function LoginCliente() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sucessoRegisto, setSucessoRegisto] = useState(false);

  // Estados dos Formulários
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');

  // REDIRECIONAMENTO INTELIGENTE (E AUTO-LOGIN)
  useEffect(() => {
    document.title = "ÁREA CLIENTE AGÊNCIA AVENIDA";

    if (isAuthenticated && user) {
      const role = user.user_metadata?.role;
      if (role === 'cliente' || role === 'global') {
        // Lógica de Subdomínio em vez de navigate simples
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        const baseDomain = window.location.hostname.replace(/^(www\.|clientes\.|backoffice\.)+/gi, '');
        
        window.location.href = `${protocol}//clientes.${baseDomain}${port}/portal`;
      }
    }
  }, [isAuthenticated, user, navigate]);

  // NOVA LÓGICA: RECUPERAÇÃO DE PASSWORD
  const handleRecuperarPassword = async () => {
    if (!email) {
      toast.error('POR FAVOR, PREENCHA O CAMPO DE E-MAIL PRIMEIRO');
      return;
    }
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://clientes.agencia-avenida.pt/atualizar-password',
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('E-MAIL DE RECUPERAÇÃO ENVIADO COM SUCESSO');
    }
    setLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        toast.error(error.message || 'CREDENCIAIS INVÁLIDAS');
        setLoading(false);
        return;
      }

      const role = data.user?.user_metadata?.role;

      if (role !== 'cliente' && role !== 'global') {
        // CORREÇÃO DE SEGURANÇA: Destrói o token local gerado para limpar o estado da app
        await supabase.auth.signOut();
        navigate('/sem-acesso');
        return;
      }
      
      // Lógica de Subdomínio ao terminar login com sucesso
      const protocol = window.location.protocol;
      const port = window.location.port ? `:${window.location.port}` : '';
      const baseDomain = window.location.hostname.replace(/^(clientes\.|backoffice\.)/, '');
      window.location.href = `${protocol}//clientes.${baseDomain}${port}/portal`;

    } catch (error) {
      toast.error('OCORREU UM ERRO AO AUTENTICAR');
      setLoading(false);
    }
  };

  const handleRegisto = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Chamar a função RPC do Supabase para verificar se o e-mail está autorizado
      const { data: isAutorizado, error: rpcError } = await supabase
        .rpc('validar_email_registo', { email_pesquisa: email });

      if (rpcError) throw rpcError;

      if (!isAutorizado) {
        toast.error('NÃO É POSSÍVEL AVANÇAR COM O REGISTO. POR FAVOR, CONTACTE A AGÊNCIA AVENIDA');
        setLoading(false);
        return;
      }

      // 2. Se for válido, avança com a criação de conta no Supabase Auth
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nome, role: 'cliente' },
          emailRedirectTo: 'https://clientes.agencia-avenida.pt/portal'
        }
      });

      if (signUpError) throw signUpError;

      setSucessoRegisto(true);
      toast.success('VERIFIQUE A SUA CAIXA DE CORREIO');
    } catch (error) {
      toast.error(error.message || 'OCORREU UM ERRO NO PROCESSAMENTO');
    } finally {
      setLoading(false);
    }
  };

  if (sucessoRegisto) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4">
        {/* Cartão de sucesso compactado para max-w-sm */}
        <div className="w-full max-w-sm text-center bg-card border p-6 rounded-xl shadow-sm space-y-3">
          <div className="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <h2 className="font-black text-base uppercase tracking-wider text-foreground">Confirmar Entidade</h2>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Enviámos um código de confirmação para o e-mail <strong className="text-foreground">{email}</strong>. Introduza o código ou clique no link recebido para validar a sua ligação às frações da Agência Avenida.
          </p>
          <Button variant="outline" onClick={() => { setSucessoRegisto(false); setIsLogin(true); }} className="w-full font-bold text-[11px] uppercase h-9 mt-2 rounded-lg">
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
      {/* Cartão principal compactado: max-w-sm, p-6, space-y-4 */}
      <div className="w-full max-w-sm bg-card p-6 rounded-xl border border-border shadow-sm space-y-4">

        {/* LOGOTIPO E CABEÇALHO DA ÁREA DE CLIENTE */}
        <div className="text-center space-y-1.5 pb-1">
          <div className="mx-auto w-16 h-16 flex items-center justify-center overflow-hidden rounded-lg">
            <img
              src="/aa_regular.jpg"
              alt="Logotipo Agência Avenida"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-foreground">
              Agência Avenida
            </h1>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">
              Área de Cliente
            </p>
          </div>
        </div>

        {/* SELEÇÃO LOGIN / REGISTO */}
        <div className="grid grid-cols-2 border-b pb-1.5 gap-4">
          <button
            className={`text-[11px] font-black uppercase pb-1.5 tracking-wider transition-all text-center ${isLogin ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIsLogin(true)}
          >
            Entrar
          </button>
          <button
            className={`text-[11px] font-black uppercase pb-1.5 tracking-wider transition-all text-center ${!isLogin ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIsLogin(false)}
          >
            Registar
          </button>
        </div>

        {isLogin ? (
          /* FORMULÁRIO DE LOGIN */
          <form onSubmit={handleLogin} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-wider">O meu E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-9 bg-background text-sm" placeholder="exemplo@gmail.com" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-[9px] font-black uppercase tracking-wider">Palavra-passe</Label>
                {/* LIGAÇÃO DA FUNÇÃO DE RECUPERAÇÃO AQUI */}
                <button type="button" onClick={handleRecuperarPassword} className="text-[9px] font-bold text-primary hover:underline uppercase tracking-wider">Esqueci-me?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-9 h-9 bg-background text-sm" placeholder="••••••••" />
              </div>
            </div>
            <div className="pt-3">
              <Button type="submit" disabled={loading} className="w-full h-9.5 font-black uppercase text-[11px] tracking-wider rounded-lg">
                {loading ? 'A autenticar...' : 'Entrar na Minha Área'}
              </Button>
            </div>
          </form>
        ) : (
          /* FORMULÁRIO DE REGISTO AUTÓNOMO */
          <form onSubmit={handleRegisto} className="space-y-3 pt-1">
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-wider">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="pl-9 h-9 bg-background text-sm" placeholder="Nome completo..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-wider">E-mail de Registo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9 h-9 bg-background text-sm" placeholder="Deve coincidir com os nossos registos..." />
              </div>
              <p className="text-[9px] text-muted-foreground font-medium leading-tight pt-1">Iremos apresentar a informação associada a este e-mail. Se os seus dados não se encontram atualizados, contacte-nos antes de efetuar o registo.</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] font-black uppercase tracking-wider">Definir Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-9 h-9 bg-background text-sm" placeholder="Insira uma palavra-chave..." />
              </div>
            </div>
            <div className="pt-3">
              <Button type="submit" disabled={loading} className="w-full h-9.5 font-black uppercase text-[11px] tracking-wider rounded-lg gap-2">
                {loading ? 'A validar...' : 'Verificar e Registar'} <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}