import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Simulamos um administrador já ligado para poderes ver todas as páginas locais
  const [user, setUser] = useState({ email: "admin@agencia-avenida.pt", name: "Administrador" });
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  
  // Desativamos todas as barras de loading e verificações online
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [appPublicSettings, setAppPublicSettings] = useState({ id: "agencia-avenida", public_settings: {} }); 

  // Funções vazias para não quebrar botões que dependam delas
  const checkAppState = async () => {};
  const checkUserAuth = async () => {};
  
  const logout = () => {
    console.log("Logout local executado.");
    setUser(null);
    setIsAuthenticated(false);
  };

  const navigateToLogin = () => {
    console.log("Navegação para Login solicitada.");
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
