import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/api/supabase'; // Ajusta este caminho para o local onde inicializas o supabase no teu projeto

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Estados reais de autenticação
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Começa a true para mostrar o loading enquanto verifica a sessão
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  
  // Estados mantidos para compatibilidade com a tua app
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: "agencia-avenida", public_settings: {} }); 

  useEffect(() => {
    // 1. Verificar a sessão inicial no arranque da aplicação
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          setUser(session.user);
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setAuthError({ type: 'auth_required' });
        }
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        setAuthError({ type: 'auth_required' });
      } finally {
        setIsLoadingAuth(false);
        setAuthChecked(true);
      }
    };

    checkSession();

    // 2. Ouvir mudanças de estado em tempo real (ex: quando o LoginBackoffice faz signIn)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAuthenticated(true);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthError({ type: 'auth_required' });
      }
      setIsLoadingAuth(false);
    });

    // Limpar o listener quando o componente for desmontado
    return () => subscription.unsubscribe();
  }, []);

  // Funções reais de ação
  const logout = async () => {
    console.log("A executar logout no Supabase...");
    setIsLoadingAuth(true);
    await supabase.auth.signOut();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  const navigateToLogin = () => {
    // Como o AuthProvider envolve o Router no teu App.jsx, usamos window.location
    // para forçar o redirecionamento de forma limpa.
    window.location.href = '/login';
  };

  const checkUserAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user || null;
  };

  const checkAppState = async () => {
    return true; // Mantido para não quebrar chamadas legadas
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth tem de ser usado dentro de um AuthProvider');
  }
  return context;
};