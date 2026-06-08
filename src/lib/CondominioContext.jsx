import { createContext, useContext, useState } from 'react';

const CondominioContext = createContext(null);

export function CondominioProvider({ children }) {
  const [selectedCondominioId, setSelectedCondominioId] = useState('all');
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear());

  return (
    <CondominioContext.Provider value={{ selectedCondominioId, setSelectedCondominioId, selectedAno, setSelectedAno }}>
      {children}
    </CondominioContext.Provider>
  );
}

export function useCondominio() {
  return useContext(CondominioContext);
}