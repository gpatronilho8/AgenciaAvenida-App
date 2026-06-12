import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ShieldAlert, Lock, Mail } from 'lucide-react';
import { supabase } from '@/api/supabase.js';
import { useAuth } from '@/lib/AuthContext';

export default function LoginBackoffice() {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showRgpd, setShowRgpd] = useState(false);
    const [loginSubmetidoAgora, setLoginSubmetidoAgora] = useState(false);

    // AUTO-LOGIN SEGURO E CONFIGURAÇÃO DO TÍTULO DA ABA
    useEffect(() => {
        document.title = "BACKOFFICE AGÊNCIA AVENIDA";

        if (isAuthenticated && user && !loginSubmetidoAgora) {
            const role = user.user_metadata?.role;
            if (role === 'backoffice' || role === 'global') {
                const protocol = window.location.protocol;
                const port = window.location.port ? `:${window.location.port}` : '';
                const baseDomain = window.location.hostname.replace(/^(clientes\.|backoffice\.)/, '');
                
                window.location.href = `${protocol}//backoffice.${baseDomain}${port}/hub`;
            }
        }
    }, [isAuthenticated, user, loginSubmetidoAgora, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
    
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;

            const role = data.user?.user_metadata?.role;
            if (role !== 'backoffice' && role !== 'global') {
                await supabase.auth.signOut();
                navigate('/sem-acesso');
                return;
            }
    
            setLoginSubmetidoAgora(true);
            setShowRgpd(true);
        } catch (error) {
            toast.error(error.message || 'CREDENCIAIS INVÁLIDAS');
        } finally {
            setLoading(false);
        }
    };

    const handleAceitarRgpd = () => {
        setShowRgpd(false);
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        const baseDomain = window.location.hostname.replace(/^(clientes\.|backoffice\.)/, '');
        
        window.location.href = `${protocol}//backoffice.${baseDomain}${port}/hub`;
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            {/* Otimizado: p-8 reduzido para p-6 e space-y-6 para space-y-4 */}
            <div className="w-full max-w-md space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">

                {/* LOGOTIPO E CABEÇALHO - Tamanhos reduzidos para ganho vertical */}
                <div className="text-center space-y-1.5">
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
                            Plataforma de Gestão
                        </p>
                    </div>
                </div>

                {/* FORMULÁRIO - Espaçamento encolhido de space-y-4 para space-y-3 */}
                <form onSubmit={handleLogin} className="space-y-3 pt-1">
                    <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase tracking-wider">E-mail de Registo</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="pl-9 h-9 bg-background text-sm"
                                placeholder="nome@agencia-avenida.pt"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <div className="flex justify-between items-center">
                            <Label className="text-[9px] font-black uppercase tracking-wider">Palavra-passe</Label>
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                type="password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-9 h-9 bg-background text-sm"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {/* Botão passou de h-11 para h-9.5 */}
                    <Button type="submit" disabled={loading} className="w-full h-9.5 font-black uppercase text-[11px] tracking-wider rounded-lg shadow-sm mt-3">
                        {loading ? 'A validar...' : 'Entrar no Sistema'}
                    </Button>
                </form>
            </div>

            {/* MODAL MANDATÓRIO: CUMPRIMENTO RGPD (Também compactado para ecrãs pequenos) */}
            <Dialog open={showRgpd} onOpenChange={() => { }}>
                <DialogContent className="max-w-lg rounded-xl p-5 [&>button]:hidden max-h-[90vh] overflow-y-auto no-scrollbar">
                    <DialogHeader className="flex flex-col items-center text-center space-y-0.5">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center border border-blue-100">
                            <ShieldAlert className="w-5 h-5" />
                        </div>
                        <DialogTitle className="font-black text-sm uppercase tracking-wider text-foreground">
                            Cumprimento RGPD
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-[11px] text-muted-foreground leading-relaxed text-justify bg-muted/30 p-3.5 rounded-lg border border-dashed my-2">
                        Está a aceder a um sistema da Agência Avenida, destinado exclusivamente a fins profissionais e reservado a utilizadores devidamente autorizados. Este sistema armazena dados pessoais que estão protegidos legalmente pelo Regulamento Geral da Proteção de Dados, pelo que o seu acesso, utilização e manipulação deve cumprir integralmente as políticas corporativas e os requisitos legais em vigor. É expressamente proibida a partilha de credenciais de acesso, incluindo palavras-passe, bem como qualquer utilização indevida dos sistemas ou dos dados neles contidos. Todos os utilizadores estão vinculados a obrigações de confidencialidade, sendo estritamente proibida a divulgação ou utilização não autorizada de informações protegidas. Ao prosseguir, está a indicar a compreensão e aceitação das condições estabelecidas acima.
                    </p>

                    <div className="mt-1">
                        <Button onClick={handleAceitarRgpd} className="w-full h-10 font-black uppercase text-xs tracking-wider rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                            Aceder ao Sistema
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}