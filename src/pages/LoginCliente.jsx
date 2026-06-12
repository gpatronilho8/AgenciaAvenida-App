import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/api/supabase.js';
import { useState, useEffect } from 'react';

export default function LoginCliente() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sucessoRegisto, setSucessoRegisto] = useState(false);

  // Estados dos Formulários
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.user_metadata?.role;
      if (role === 'cliente' || role === 'global') {
        navigate('/portal', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage(error.message);
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
  };

  const handleRegisto = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Chamar a função RPC do Supabase para verificar se o e-mail está autorizado (Cliente/Condómino)
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
          // Força o link de confirmação do e-mail a apontar para o portal de clientes:
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
        {/* Cartão de sucesso alargado para max-w-lg para manter coerência visual */}
        <div className="w-full max-w-lg text-center bg-card border p-8 rounded-2xl shadow-sm space-y-4">
          <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="font-black text-lg uppercase tracking-wider text-foreground">Confirmar Entidade</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enviámos um código de confirmação para o e-mail <strong className="text-foreground">{email}</strong>. Introduza o código ou clique no link recebido para validar a sua ligação às frações da Agência Avenida.
          </p>
          <Button variant="outline" onClick={() => { setSucessoRegisto(false); setIsLogin(true); }} className="w-full font-bold text-xs uppercase h-10 rounded-xl">
            Voltar ao Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
      {/* Cartão principal alargado de max-w-md para max-w-lg */}
      <div className="w-full max-w-lg bg-card p-8 rounded-2xl border border-border shadow-sm space-y-6">

        {/* LOGOTIPO E CABEÇALHO DA ÁREA DE CLIENTE */}
        <div className="text-center space-y-3 pb-2">
          <div className="mx-auto w-24 h-24 flex items-center justify-center overflow-hidden rounded-xl">
            <img
              src="/aa_regular.jpg"
              alt="Logotipo Agência Avenida"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
              Agência Avenida
            </h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Área de Cliente
            </p>
          </div>
        </div>

        {/* SELEÇÃO LOGIN / REGISTO */}
        <div className="grid grid-cols-2 border-b pb-2 gap-4">
          <button
            className={`text-xs font-black uppercase pb-2 tracking-wider transition-all text-center ${isLogin ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIsLogin(true)}
          >
            Aceder à Área de Cliente
          </button>
          <button
            className={`text-xs font-black uppercase pb-2 tracking-wider transition-all text-center ${!isLogin ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIsLogin(false)}
          >
            Criar Nova Conta
          </button>
        </div>

        {isLogin ? (
          /* FORMULÁRIO DE LOGIN */
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider">O meu E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9 bg-background" placeholder="exemplo@gmail.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase tracking-wider">Palavra-passe</Label>
                <button type="button" onClick={() => toast.info('Funcionalidade de recuperação enviada para o e-mail.')} className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider">Esqueci-me?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-9 bg-background" placeholder="••••••••" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 font-black uppercase text-xs tracking-wider rounded-xl mt-2">
              {loading ? 'A autenticar...' : 'Entrar na Minha Área'}
            </Button>
          </form>
        ) : (
          /* FORMULÁRIO DE REGISTO AUTÓNOMO */
          <form onSubmit={handleRegisto} className="space-y-5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="text" required value={nome} onChange={e => setNome(e.target.value)} className="pl-9 bg-background" placeholder="Nome completo..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider">E-mail de Registo</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9 bg-background" placeholder="Deve coincidir com os nossos registos..." />
              </div>
              <p className="text-[9px] text-muted-foreground font-medium leading-tight">Iremos apresentar a informação associada a este e-mail. Se os seus dados não se encontram atualizados, contacte-nos antes de efetuar o registo.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-wider">Definir Palavra-passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="pl-9 bg-background" placeholder="Insira uma palavra-chave..." />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 font-black uppercase text-xs tracking-wider rounded-xl gap-2 mt-2">
              {loading ? 'A validar entidade...' : 'Verificar e Registar'} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}