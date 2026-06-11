import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    // Inicializa o cliente com a chave de serviço para ter permissões globais de sistema
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const hoje = new Date();
    const mes = hoje.getMonth() + 1; // getMonth é zero-indexed (Janeiro = 0)
    const ano = hoje.getFullYear();

    // 0. VERIFICAR SE A AUTOMAÇÃO ESTÁ LIGADA
    const { data: config } = await supabase
      .from('configuracoes_sistema')
      .select('auto_rendas')
      .eq('id', 1)
      .single();

    if (config && config.auto_rendas === false) {
      return new Response(
        JSON.stringify({ success: true, message: 'Automação desligada nas configurações. Nenhuma renda gerada.' }), 
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // 1. Obter todas as propriedades ativas
    const { data: propriedades, error: propError } = await supabase
      .from('propriedades')
      .select('id, renda_mensal')
      .eq('ativa', true);

    if (propError || !propriedades) throw propError;

    // 2. Obter rendas já geradas para este mês/ano (evitar duplicações)
    const { data: rendasExistentes, error: rendasError } = await supabase
      .from('rendas_mensais')
      .select('propriedade_id')
      .eq('mes', mes)
      .eq('ano', ano);

    if (rendasError) throw rendasError;

    const idsExistentes = new Set(rendasExistentes?.map(r => r.propriedade_id) || []);

    // 3. Preparar array com as novas rendas a inserir
    const toCreate = propriedades
      .filter(p => !idsExistentes.has(p.id))
      .map(p => ({
        propriedade_id: p.id,
        ano: ano,
        mes: mes,
        valor_renda: parseFloat(p.renda_mensal) || 0,
        estado: 'pendente'
      }));

    // 4. Inserir em bloco
    if (toCreate.length > 0) {
      const { error: insertError } = await supabase.from('rendas_mensais').insert(toCreate);
      if (insertError) throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, geradas: toCreate.length }), 
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detalhe: err }), { status: 500 });
  }
})
