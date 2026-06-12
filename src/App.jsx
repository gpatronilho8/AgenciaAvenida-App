import { ToasterCustomizado } from "@/components/ui/meu-sonner";
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { CondominioProvider } from '@/lib/CondominioContext';
import ModuleLayout from '@/components/layout/ModuleLayout';
import Hub from "@/pages/Hub";

// Páginas de Autenticação e Barreiras de Acesso
import LoginBackoffice from '@/pages/LoginBackoffice';
import LoginCliente from '@/pages/LoginCliente';
import SeletorApp from '@/pages/SeletorApp';
import SemAcesso from '@/pages/SemAcesso';
import AtualizarPassword from '@/pages/AtualizarPassword';

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

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const role = user?.user_metadata?.role;

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
      return <Navigate to="/" replace />;
    }
  }

  // Definição booleana de permissões com suporte ao utilizador global
  const isBackofficeAllowed = role === 'backoffice' || role === 'global';
  const isClienteAllowed = role === 'cliente' || role === 'global';

  return (
    <Routes>
      {/* Mapeamento de segurança do Hub Operacional para alinhar com os redirecionamentos dos logins */}
      <Route path="/hub" element={isBackofficeAllowed ? <Hub /> : <Navigate to="/sem-acesso" replace />} />
      <Route path="/backoffice/hub" element={isBackofficeAllowed ? <Hub /> : <Navigate to="/sem-acesso" replace />} />

      {/* Portal do Condómino / Área de Cliente */}
      <Route path="/portal" element={isClienteAllowed ? <PortalCondomino /> : <Navigate to="/sem-acesso" replace />} />
      <Route path="/cliente/dashboard" element={isClienteAllowed ? <PortalCondomino /> : <Navigate to="/sem-acesso" replace />} />

      {/* Módulo Condomínios */}
      <Route element={isBackofficeAllowed ? <ModuleLayout module="condominios" /> : <Navigate to="/sem-acesso" replace />}>
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
      <Route element={isBackofficeAllowed ? <ModuleLayout module="propriedades" /> : <Navigate to="/sem-acesso" replace />}>
        <Route path="/propriedades/dashboard" element={<PropriedadesDashboard />} />
        <Route path="/propriedades/lista" element={<PropriedadesLista />} />
        <Route path="/propriedades/rendas" element={<Rendas />} />
        <Route path="/propriedades/pessoas" element={<Pessoas />} />
      </Route>

      {/* Módulo Processos */}
      <Route element={isBackofficeAllowed ? <ModuleLayout module="processos" /> : <Navigate to="/sem-acesso" replace />}>
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
              {/* Rotas 100% Públicas autónomas (Fora do ciclo de redirecionamento automático do Auth) */}
              <Route path="/" element={<SeletorApp />} />
              <Route path="/sem-acesso" element={<SemAcesso />} />
              
              {/* Endereços de login compatíveis com a estrutura antiga e com o novo roteamento unificado */}
              <Route path="/login" element={<LoginBackoffice />} />
              <Route path="/backoffice/login" element={<LoginBackoffice />} />
              <Route path="/login-cliente" element={<LoginCliente />} />
              <Route path="/cliente/login" element={<LoginCliente />} />

              <Route path="/atualizar-password" element={<AtualizarPassword />} />

              {/* Filtro global de sessões ativas */}
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <div style={{ border: '10px solid red', position: 'fixed', bottom: 10, right: 10, zIndex: 9999 }}>
            <ToasterCustomizado />
          </div>
        </CondominioProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;