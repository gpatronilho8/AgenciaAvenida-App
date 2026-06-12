import { Toaster } from "@/components/ui/sonner";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { CondominioProvider } from '@/lib/CondominioContext';
import ModuleLayout from '@/components/layout/ModuleLayout';
import Hub from "@/pages/Hub";

// Páginas de Autenticação (Novas)
import LoginBackoffice from '@/pages/LoginBackoffice'; // Ajusta o caminho se necessário
import LoginCliente from '@/pages/LoginCliente';       // Ajusta o caminho se necessário

// Hub
import Hub from '@/pages/Hub';

// Condomínios module
import CondominiosDashboard from '@/pages/CondominiosDashboard';
import Condominios from '@/pages/Condominios';
import Fracoes from '@/pages/Fracoes';
import Quotas from '@/pages/Quotas';
import Ocorrencias from '@/pages/Ocorrencias';
import Documentos from '@/pages/Documentos';
import ProcessosJudiciais from '@/pages/ProcessosJudiciais';
import Movimentos from '@/pages/Movimentos';
import Assembleias from '@/pages/Assembleias';

// Propriedades module
import PropriedadesDashboard from '@/pages/PropriedadesDashboard';
import PropriedadesLista from '@/pages/PropriedadesLista';
import Rendas from '@/pages/Rendas';

// Processos module
import Processos from '@/pages/Processos';

// Shared
import Pessoas from '@/pages/Pessoas';
import Configuracoes from '@/pages/Configuracoes';
import PortalCondomino from '@/pages/PortalCondomino';

const RotaInicialInteligente = () => {
  const { user } = useAuth();
  const dominio = window.location.hostname;

  // 1. Se for o cliente (verificado pelo metadado ou pelo domínio), atira para o portal
  if (user?.user_metadata?.role === 'cliente' || dominio.includes('clientes')) {
    return <Navigate to="/portal" replace />;
  }
  
  // 2. Caso contrário (é a equipa do Backoffice), mostra logo o ecrã do Hub!
  // Certifica-te de que o componente Hub está importado no topo deste ficheiro.
  return <Hub />; 
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { 
      navigateToLogin(); // Certifica-te que no teu AuthContext isto redireciona para '/login'
      return null; 
    }
  }

  return (
    <Routes>
      {/* Hub — página inicial autenticada */}
      <Route path="/" element={<RotaInicialInteligente />} />

      {/* Portal do Condómino */}
      <Route path="/portal" element={<PortalCondomino />} />

      {/* Módulo Condomínios */}
      <Route element={<ModuleLayout module="condominios" />}>
        <Route path="/condominios/dashboard" element={<CondominiosDashboard />} />
        <Route path="/condominios/lista" element={<Condominios />} />
        <Route path="/condominios/fracoes" element={<Fracoes />} />
        <Route path="/condominios/quotas" element={<Quotas />} />
        <Route path="/condominios/ocorrencias" element={<Ocorrencias />} />
        <Route path="/condominios/documentos" element={<Documentos />} />
        <Route path="/condominios/processos-judiciais" element={<ProcessosJudiciais />} />
        <Route path="/condominios/movimentos" element={<Movimentos />} />
        <Route path="/condominios/assembleias" element={<Assembleias />} />
        <Route path="/pessoas" element={<Pessoas />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>

      {/* Módulo Propriedades */}
      <Route element={<ModuleLayout module="propriedades" />}>
        <Route path="/propriedades/dashboard" element={<PropriedadesDashboard />} />
        <Route path="/propriedades/lista" element={<PropriedadesLista />} />
        <Route path="/propriedades/rendas" element={<Rendas />} />
        <Route path="/propriedades/pessoas" element={<Pessoas />} />
      </Route>

      {/* Módulo Processos */}
      <Route element={<ModuleLayout module="processos" />}>
        <Route path="/processos" element={<Processos />} />
        <Route path="/processos/pessoas" element={<Pessoas />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CondominioProvider>
          <Router>
            <Routes>
              {/* Rotas 100% Públicas - Ficam fora da verificação de autenticação */}
              <Route path="/login" element={<LoginBackoffice />} />
              <Route path="/login-cliente" element={<LoginCliente />} />

              {/* Todas as outras rotas passam pelo filtro do AuthenticatedApp */}
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </CondominioProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;