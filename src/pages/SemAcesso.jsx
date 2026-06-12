import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function SemAcesso() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#450a0a] text-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans">
      <div className="bg-[#7f1d1d] border border-red-500/30 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <h2 className="text-xl font-bold tracking-widest mb-3 uppercase text-white">ACESSO NEGADO</h2>
        
        <p className="text-red-200 text-sm leading-relaxed mb-8">
          A sua conta de utilizador não possui acesso a esta página. Em caso de dúvida, contacte os nossos serviços.
        </p>
        
        <button
          onClick={() => navigate('/')}
          className="w-full bg-white text-red-950 font-bold tracking-widest py-4 rounded-xl shadow-md hover:bg-red-50 transition-all duration-200 uppercase text-xs"
        >
          VOLTAR AO INÍCIO
        </button>
      </div>
    </div>
  );
}