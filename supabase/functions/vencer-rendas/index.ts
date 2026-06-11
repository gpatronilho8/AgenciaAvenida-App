import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async () => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Atualiza todas as rendas pendentes para o estado 'vencida'
    const { data, error } = await supabase
      .from('rendas_mensais')
      .update({ estado: 'vencida' })
      .eq('estado', 'pendente')
      .select('id');

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, atualizadas: data?.length || 0 }), 
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno', detalhe: err }), { status: 500 });
  }
})
