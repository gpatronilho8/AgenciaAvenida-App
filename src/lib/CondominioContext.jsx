import { createContext, useContext, useState } from 'react';

const CondominioContext = createContext(null);

export function CondominioProvider({ children }) {
  const [selectedCondominioId, setSelectedCondominioId] = useState('all');
  return (
    <CondominioContext.Provider value={{ selectedCondominioId, setSelectedCondominioId }}>
      {children}
    </CondominioContext.Provider>
  );
}

export function useCondominio() {
  return useContext(CondominioContext);
}