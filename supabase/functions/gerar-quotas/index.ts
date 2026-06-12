import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const dataEmissao = hoje.toISOString().split('T')[0];
    
    const ultimoDiaMes = new Date(anoAtual, mesAtual, 0);
    const dataVencimento = ultimoDiaMes.toISOString().split('T')[0];

    // 1. Obter todas as configurações ATIVAS
    const { data: configuracoes, error: configError } = await supabase
      .from('configuracao_quotas')
      .select('*')
      .eq('ativa', true);

    if (configError || !configuracoes) throw configError;

    // 2. Obter todas as frações
    const { data: fracoes, error: fracoesError } = await supabase
      .from('fracoes')
      .select('id, condominio_id, permilagem');

    if (fracoesError || !fracoes) throw fracoesError;

    // 3. Obter quotas já emitidas este mês (Chave: fracao_id + tipo)
    const { data: quotasExistentes } = await supabase
      .from('quotas')
      .select('fracao_id, tipo')
      .eq('mes', mesAtual)
      .eq('ano', anoAtual);

    const chavesExistentes = new Set(quotasExistentes?.map(q => `${q.fracao_id}_${q.tipo}`) || []);

    const toCreate = [];
    const configsParaDesativar = [];

    // 4. Lógica de Processamento e Cálculos
    for (const config of configuracoes) {
      const repeticoes = parseInt(config.repeticoes) || 1;
      const valorTotal = parseFloat(config.valor_total) || 0;
      const valorMensal = parseFloat(config.valor_mensal) || 0;

      // Validação de tempo para Quotas Extraordinárias
      if (config.tipo === 'extraordinaria') {
        const mesesPassados = (anoAtual - config.ano_inicio) * 12 + (mesAtual - config.mes_inicio);
        
        // Ignora se ainda não começou ou já passou o prazo
        if (mesesPassados < 0 || mesesPassados >= repeticoes) continue; 
        
        // Regista para desativar a configuração após o último lançamento
        if (mesesPassados === repeticoes - 1) {
          configsParaDesativar.push(config.id);
        }
      }

      const fracoesCondo = fracoes.filter(f => f.condominio_id === config.condominio_id);
      const totalFracoes = fracoesCondo.length || 1; // Evita divisões por zero

      for (const fracao of fracoesCondo) {
        if (chavesExistentes.has(`${fracao.id}_${config.tipo}`)) continue;

        let valorFinalFracao = 0;
        const permilagem = parseFloat(fracao.permilagem) || 0;

        // APLICAÇÃO DAS 4 REGRAS MATEMÁTICAS
        if (config.tipo === 'mensal') {
          if (config.modo_divisao === 'permilagem') {
            // (Total Anual / 12) * Permilagem
            valorFinalFracao = (valorTotal / 12) * (permilagem / 1000);
          } else {
            // Quota Mensal Fixa = Aplica o valor mensal definido diretamente à fração
            valorFinalFracao = valorMensal; 
          }
        } 
        else if (config.tipo === 'extraordinaria') {
          if (config.modo_divisao === 'permilagem') {
            // (Total da Obra * Permilagem) / Repetições
            valorFinalFracao = (valorTotal * (permilagem / 1000)) / repeticoes;
          } else {
            // (Total da Obra / Total de Frações) / Repetições
            valorFinalFracao = (valorTotal / totalFracoes) / repeticoes;
          }
        }

        toCreate.push({
          condominio_id: config.condominio_id,
          fracao_id: fracao.id,
          tipo: config.tipo,
          descricao: config.tipo === 'mensal' ? 'Quota + FCR' : `Quota Extraordinária: ${config.descricao || ''}`,
          valor: parseFloat(valorFinalFracao.toFixed(2)),
          data_emissao: dataEmissao,
          data_vencimento: dataVencimento,
          estado: 'pendente',
          ano: anoAtual,
          mes: mesAtual,
          valor_pago: 0
        });
      }
    }

    // 5. Gravação
    if (toCreate.length > 0) {
      const { error: insertError } = await supabase.from('quotas').insert(toCreate);
      if (insertError) throw insertError;
    }

    if (configsParaDesativar.length > 0) {
      const { error: updateError } = await supabase
        .from('configuracao_quotas')
        .update({ ativa: false })
        .in('id', configsParaDesativar);
      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        quotas_geradas: toCreate.length, 
        configs_desativadas: configsParaDesativar.length 
      }), 
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detalhe: err }), { status: 500 });
  }
})