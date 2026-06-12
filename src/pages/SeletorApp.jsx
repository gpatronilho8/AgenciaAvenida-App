import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabase';

export default function SeletorApp() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Define o título da aba do navegador
    document.title = "AGÊNCIA AVENIDA";

    async function checkActiveSession() {
      // 1. Redirecionamento inteligente por Subdomínio
      const dominio = window.location.hostname;
      if (dominio.includes('clientes.')) {
        navigate('/login-cliente', { replace: true });
        return;
      }
      if (dominio.includes('backoffice.')) {
        navigate('/login', { replace: true });
        return;
      }

      // 2. Lógica normal de verificar a sessão para o domínio principal
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserRole(user.user_metadata?.role || null);
      }
      setLoading(false);
    }
    checkActiveSession();
  }, [navigate]);

  const handleNavigation = (targetPath, allowedRoles, subdominio) => {
    // Se o utilizador já estiver logado e tentar forçar uma app à qual não pertence
    if (userRole && !allowedRoles.includes(userRole) && userRole !== 'global') {
      navigate('/sem-acesso');
    } else {
      // Verifica se estamos no ambiente de desenvolvimento local
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isLocalhost) {
        // Em local, navega normalmente pelas rotas do React
        navigate(targetPath);
      } else {
        // Em produção, BLINDAMOS a construção do URL
        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : '';
        // Remove 'clientes.' ou 'backoffice.' caso já lá estejam, para garantir uma base limpa
        const baseDomain = window.location.hostname.replace(/^(www\.|clientes\.|backoffice\.)+/gi, '');
        
        // Constrói o URL perfeitamente: https://clientes.agencia-avenida.pt/login-cliente
        window.location.href = `${protocol}//${subdominio}.${baseDomain}${port}${targetPath}`;
      }
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
      
      {/* Grelha reduzida para cartões mais próximos e pequenos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-xl">
        
        {/* CARD 1: Plataforma de Gestão (Backoffice) */}
        <button
          onClick={() => handleNavigation('/login', ['backoffice'], 'backoffice')}
          disabled={loading}
          className={`flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-8 transition-all duration-300 group shadow-sm relative ${
            userRole === 'cliente' 
              ? 'opacity-40 cursor-not-allowed bg-gray-50' 
              : 'hover:border-blue-500 hover:shadow-md'
          }`}
        >
          <img 
            src="/aa_favicon.png" 
            alt="Agência Avenida Logo" 
            className="w-24 h-24 mb-4 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-0.1">Agência Avenida</span>
          <span className="text-xl font-black uppercase tracking-wider text-foreground">COLABORADORES</span>
          
          {userRole === 'cliente' && (
            <span className="absolute top-3 right-3 text-[9px] font-bold text-red-600 tracking-widest uppercase bg-red-50 px-2 py-1 rounded-md border border-red-100">
              Restrito
            </span>
          )}
        </button>

        {/* CARD 2: Área de Cliente (Portal do Condómino) */}
        <button
          onClick={() => handleNavigation('/login-cliente', ['cliente'], 'clientes')}
          disabled={loading}
          className={`flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl p-8 transition-all duration-300 group shadow-sm relative ${
            userRole === 'backoffice' 
              ? 'opacity-40 cursor-not-allowed bg-gray-50' 
              : 'hover:border-blue-500 hover:shadow-md'
          }`}
        >
          <img 
            src="/aa_favicon.png" 
            alt="Agência Avenida Logo" 
            className="w-24 h-24 mb-4 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-0.1">Agência Avenida</span>
          <span className="text-xl font-black uppercase tracking-wider text-foreground">ÁREA DE CLIENTE</span>
          
          {userRole === 'backoffice' && (
            <span className="absolute top-3 right-3 text-[9px] font-bold text-red-600 tracking-widest uppercase bg-red-50 px-2 py-1 rounded-md border border-red-100">
              Restrito
            </span>
          )}
        </button>
        
      </div>
    </div>
  );
}