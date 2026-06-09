import React from 'react';
import { cn } from '@/lib/utils';
import { Building2, AlertCircle } from 'lucide-react';

const mesesExtenso = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MapaQuotas({ condominioId, fracoes = [], quotas = [], pessoas = [], ano }) {
  // Helpers
  const getOwnerName = (f) => {
    let ownerId = null;
    if (Array.isArray(f.titulares) && f.titulares.length > 0) ownerId = f.titulares[0];
    else if (typeof f.titulares === 'string') {
      try { const arr = JSON.parse(f.titulares); if (arr.length > 0) ownerId = arr[0]; } catch (e) { ownerId = f.titulares; }
    }
    if (!ownerId && f.pessoa_id) ownerId = f.pessoa_id;
    if (!ownerId && f.proprietario_id) ownerId = f.proprietario_id;

    if (!ownerId) return 'Sem Titular';
    const pessoa = pessoas.find(p => p.id === ownerId);
    return pessoa ? pessoa.nome : 'Desconhecido';
  };

  const formatFracao = (f) => f ? `${f.codigo_fracao} (${f.descricao_piso_lado || ''})` : '-';

  const quotasAno = quotas.filter(q => 
    q.condominio_id === condominioId && 
    (ano === 'all' || q.ano === ano)
  );

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col mt-6">
      <div className="p-5 border-b border-border bg-muted/20 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" /> Mapa Anual {ano === 'all' ? 'Completo' : ano}
          </h3>
        </div>
        <div className="flex flex-wrap gap-4 text-[11px] font-medium uppercase tracking-wider">
           <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span> Pago</div>
           <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span> Pendente</div>
           <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span> Vencida</div>
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-muted/50 text-muted-foreground font-semibold">
            <tr>
              <th className="px-4 py-4 sticky left-0 bg-muted/50 z-10 w-32 border-r border-border shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#262626]">Fração</th>
              <th className="px-4 py-4 w-48">Titular</th>
              <th className="px-4 py-4 text-right">Mensalidade</th>
              <th className="px-4 py-4 text-right text-red-600">Dívida Ext.</th>
              {mesesExtenso.map((m, i) => (
                <th key={i} className="px-3 py-4 text-center w-16">{m.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fracoes.map(fracao => {
              const quotasFracao = quotasAno.filter(q => q.fracao_id === fracao.id);
              const mensalidadeExemplo = quotasFracao.find(q => q.tipo === 'mensal');
              const valorMensal = mensalidadeExemplo ? mensalidadeExemplo.valor : 0;

              const dividasDaFracao = quotas.filter(q => q.fracao_id === fracao.id && q.tipo === 'linha_faturacao_divida' && (q.estado === 'pendente' || q.estado === 'vencida'));
              const dividaAnterior = dividasDaFracao.reduce((acc, q) => acc + (q.valor || 0), 0);
              
              const tooltipDivida = dividasDaFracao.length > 0 
                ? dividasDaFracao.map(d => `${d.descricao || 'Dívida Externa'} (€${d.valor.toFixed(2)})`).join('\n') 
                : undefined;

              return (
                <tr key={fracao.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-bold text-foreground sticky left-0 bg-card z-10 border-r border-border shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#262626]">
                    {formatFracao(fracao)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[180px]">
                    {getOwnerName(fracao)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {valorMensal > 0 ? `€${valorMensal.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-500" title={tooltipDivida}>
                    {dividaAnterior > 0 ? (
                      <div className="flex items-center justify-end gap-1 cursor-help">
                        <AlertCircle className="w-3.5 h-3.5" /> €{dividaAnterior.toFixed(2)}
                      </div>
                    ) : '-'}
                  </td>

                  {mesesExtenso.map((_, i) => {
                    const mes = i + 1;
                    const quotaDoMes = quotasFracao.find(q => q.mes === mes && q.tipo !== 'linha_faturacao');
                    
                    if (!quotaDoMes) {
                      return <td key={mes} className="px-3 py-3 text-center"><span className="w-2 h-0.5 bg-muted-foreground/20 rounded mx-auto block"></span></td>;
                    }

                    const isPago = quotaDoMes.estado === 'pago';
                    let isVencida = quotaDoMes.estado === 'vencida';
                    
                    if (!isPago && !isVencida && quotaDoMes.data_vencimento) {
                      const hoje = new Date();
                      hoje.setHours(0,0,0,0);
                      const dataVenc = new Date(quotaDoMes.data_vencimento);
                      if (dataVenc < hoje) isVencida = true;
                    }
                    
                    return (
                      <td key={mes} className="px-2 py-3 text-center">
                        <div 
                          title={`${quotaDoMes.descricao || 'Quota'} - €${quotaDoMes.valor.toFixed(2)}`}
                          className={cn(
                            "mx-auto flex flex-col items-center justify-center p-1.5 rounded-md border text-[10px] font-bold cursor-help transition-all shadow-sm",
                            isPago 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
                              : isVencida 
                                ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                                : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                          )}
                        >
                          <span>{isPago ? 'OK' : '€' + quotaDoMes.valor.toFixed(0)}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}