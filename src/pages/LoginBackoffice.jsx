import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldAlert, Lock, Mail } from 'lucide-react';
import { supabase } from '@/api/supabase.js';
import { useState, useEffect } from 'react';

export default function LoginBackoffice() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRgpd, setShowRgpd] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
          const role = user.user_metadata?.role;
          if (role === 'backoffice' || role === 'global') {
            navigate('/hub', { replace: true });
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

        if (role !== 'backoffice' && role !== 'global') {
            // CORREÇÃO DE SEGURANÇA: Destrói o token local gerado para limpar o estado da app
            await supabase.auth.signOut();
            navigate('/sem-acesso');
            return;
        }

    };

    const handleAceitarRgpd = () => {
        setShowRgpd(false);
        //toast.success('ACESSO AUTORIZADO');
        navigate('/'); // Redireciona para o painel principal
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-6 bg-card p-8 rounded-2xl border border-border shadow-sm">

                {/* LOGOTIPO E CABEÇALHO */}
                <div className="text-center space-y-3">
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
                            Plataforma de Gestão
                        </p>
                    </div>
                </div>

                {/* FORMULÁRIO */}
                <form onSubmit={handleLogin} className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-wider">E-mail de Registo</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="pl-9 bg-background"
                                placeholder="nome@agencia-avenida.pt"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black uppercase tracking-wider">Palavra-passe</Label>
                            <button
                                type="button"
                                onClick={() => toast.info('CONTACTE O ADMINISTRADOR DO SISTEMA PARA REDEFINIR A PASSWORD')}
                                className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
                            >
                                Esqueci-me?
                            </button>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-9 bg-background"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <Button type="submit" disabled={loading} className="w-full h-11 font-black uppercase text-xs tracking-wider rounded-xl shadow-sm mt-2">
                        {loading ? 'A validar...' : 'Entrar no Sistema'}
                    </Button>
                </form>
            </div>

            {/* MODAL MANDATÓRIO: CUMPRIMENTO RGPD */}
            <Dialog open={showRgpd} onOpenChange={() => { }}>
                <DialogContent className="max-w-lg rounded-xl p-6 [&>button]:hidden"> {/* Esconde o botão X de fechar */}
                    <DialogHeader className="flex flex-col items-center text-center space-y-2">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <DialogTitle className="font-black text-base uppercase tracking-wider text-foreground">
                            Cumprimento RGPD
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-xs text-muted-foreground leading-relaxed text-justify bg-muted/30 p-4 rounded-xl border border-dashed">
                        Está a aceder a um sistema da Agência Avenida, destinado exclusivamente a fins profissionais e reservado a utilizadores devidamente autorizados. Este sistema armazena dados pessoais que estão protegidos legalmente pelo Regulamento Geral da Proteção de Dados, pelo que o seu acesso, utilização e manipulação deve cumprir integralmente as políticas corporativas e os requisitos legais em vigor. É expressamente proibida a partilha de credenciais de acesso, incluindo palavras-passe, bem como qualquer utilização indevida dos sistemas ou dos dados neles contidos. Todos os utilizadores estão vinculados a obrigações de confidencialidade, sendo estritamente proibida a divulgação ou utilização não autorizada de informações protegidas. Ao prosseguir, está a indicar a compreensão e aceitação das condições estabelecidas acima.
                    </p>

                    <div className="mt-4">
                        <Button onClick={handleAceitarRgpd} className="w-full h-11 font-black uppercase text-xs tracking-wider rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                            Aceder ao Sistema
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}