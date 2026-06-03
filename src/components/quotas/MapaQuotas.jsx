import { useMemo } from 'react';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MapaQuotas({ quotas, fracoes, condominioId }) {
  const fracoesFilt = useMemo(() =>
    fracoes.filter(f => !condominioId || condominioId === 'all' || f.condominio_id === condominioId),
    [fracoes, condominioId]
  );

  const ano = new Date().getFullYear();

  // Indexar quotas por fracao_id + mes para o ano corrente
  const idx = useMemo(() => {
    const map = {};
    quotas.filter(q => q.ano === ano).forEach(q => {
      if (!map[q.fracao_id]) map[q.fracao_id] = {};
      map[q.fracao_id][q.mes] = q;
    });
    return map;
  }, [quotas, ano]);

  if (!fracoesFilt.length) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Mapa de Quotas {ano}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Verde = pago · Amarelo = pendente · Vermelho = vencido</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[80px]">Fração</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap min-w-[100px]">Valor</th>
              {MESES.map(m => (
                <th key={m} className="px-2 py-3 text-center font-medium text-muted-foreground w-10">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fracoesFilt.map(f => {
              const quotasFracao = idx[f.id] || {};
              return (
                <tr key={f.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-foreground whitespace-nowrap">{f.codigo}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">€{(f.quota_mensal || 0).toFixed(0)}</td>
                  {MESES.map((_, i) => {
                    const mes = i + 1;
                    const q = quotasFracao[mes];
                    let bg = 'bg-muted/40';
                    let title = 'Sem registo';
                    if (q) {
                      if (q.estado === 'pago') { bg = 'bg-green-500'; title = `Pago: €${q.valor}`; }
                      else if (q.estado === 'vencido') { bg = 'bg-red-400'; title = `Vencido: €${q.valor}`; }
                      else if (q.estado === 'pendente') { bg = 'bg-yellow-400'; title = `Pendente: €${q.valor}`; }
                      else { bg = 'bg-muted/40'; title = q.estado; }
                    }
                    return (
                      <td key={mes} className="px-2 py-2.5">
                        <div className="flex justify-center">
                          <div
                            className={`w-6 h-6 rounded ${bg} cursor-default`}
                            title={title}
                          />
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