import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const DefaultFallback = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-[#000000] z-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">A validar acessos...</p>
    </div>
  </div>
);

export default function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  fallback = <DefaultFallback />, 
  unauthenticatedElement = <Navigate to="/" replace /> 
}) {
  // Adicionada a extração do 'user' para conseguirmos ler o role
  const { user, isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return fallback;
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    return unauthenticatedElement;
  }

  if (!isAuthenticated) {
    return unauthenticatedElement;
  }

  // NOVA LÓGICA DE SEGURANÇA: Verificação de Role
  const role = user?.user_metadata?.role;
  
  // Se forem definidos roles permitidos, e o user não os tiver (e não for global), bloqueia.
  if (allowedRoles.length > 0 && !allowedRoles.includes(role) && role !== 'global') {
    return <Navigate to="/sem-acesso" replace />;
  }

  // Retorna os filhos (nova estrutura do App.jsx) ou o Outlet (estrutura clássica de rotas aninhadas)
  return children ? children : <Outlet />;
}