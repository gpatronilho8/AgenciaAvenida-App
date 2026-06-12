import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabase';

export default function SeletorApp() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const handleNavigation = (targetPath, allowedRoles) => {
    // Se o utilizador já estiver logado e tentar forçar uma app à qual não pertence
    if (userRole && !allowedRoles.includes(userRole) && userRole !== 'global') {
      navigate('/sem-acesso');
    } else {
      navigate(targetPath);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-4xl text-center mb-14">
        <h1 className="text-3xl md:text-4xl font-bold tracking-wider mb-2 text-white">AGÊNCIA AVENIDA</h1>
        <p className="text-xs tracking-widest text-[#94a3b8] uppercase font-semibold">Plataforma Digital Unificada</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        {/* CARD 1: Plataforma de Gestão (Backoffice) */}
        <button
          onClick={() => handleNavigation('/login', ['backoffice'])}
          disabled={loading}
          className={`flex flex-col items-center justify-center bg-[#1e293b] border-2 rounded-2xl p-10 transition-all duration-300 group aspect-square shadow-2xl relative ${
            userRole === 'cliente' 
              ? 'border-red-900/50 opacity-30 cursor-not-allowed' 
              : 'border-[#334155] hover:border-blue-500'
          }`}
        >
          <img 
            src="/aa_favicon.png" 
            alt="Agência Avenida Logo" 
            className="w-24 h-24 mb-6 object-contain filter brightness-100 group-hover:scale-105 transition-transform duration-300"
          />
          <span className="text-xs tracking-widest text-[#94a3b8] uppercase mb-1 font-semibold">Agência Avenida</span>
          <span className="text-lg font-bold tracking-wide uppercase text-white">Plataforma de Gestão</span>
          
          {userRole === 'cliente' && (
            <span className="absolute bottom-4 text-[10px] font-bold text-red-400 tracking-widest uppercase bg-red-950/80 px-3 py-1 rounded-full border border-red-800">
              Acesso Restrito
            </span>
          )}
        </button>

        {/* CARD 2: Área de Cliente (Portal do Condómino) */}
        <button
          onClick={() => handleNavigation('/login-cliente', ['cliente'])}
          disabled={loading}
          className={`flex flex-col items-center justify-center bg-[#1e293b] border-2 rounded-2xl p-10 transition-all duration-300 group aspect-square shadow-2xl relative ${
            userRole === 'backoffice' 
              ? 'border-red-900/50 opacity-30 cursor-not-allowed' 
              : 'border-[#334155] hover:border-blue-500'
          }`}
        >
          <img 
            src="/aa_favicon.png" 
            alt="Agência Avenida Logo" 
            className="w-24 h-24 mb-6 object-contain filter brightness-100 group-hover:scale-105 transition-transform duration-300"
          />
          <span className="text-xs tracking-widest text-[#94a3b8] uppercase mb-1 font-semibold">Agência Avenida</span>
          <span className="text-lg font-bold tracking-wide uppercase text-white">Área de Cliente</span>
          
          {userRole === 'backoffice' && (
            <span className="absolute bottom-4 text-[10px] font-bold text-red-400 tracking-widest uppercase bg-red-950/80 px-3 py-1 rounded-full border border-red-800">
              Acesso Restrito
            </span>
          )}
        </button>
      </div>

      <div className="mt-20 text-[11px] text-[#64748b] tracking-wider uppercase">
        &copy; 2026 Agência Avenida · Plataforma de Gestão
      </div>
    </div>
  );
}