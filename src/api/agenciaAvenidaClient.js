import { supabase } from './supabase.js';

// 1. O MAPA DE TRADUÇÃO (React -> Supabase)
const tableMap = {
  Condominio: 'condominios',
  Assembleia: 'assembleias',
  ConfiguracaoQuota: 'configuracao_quotas',
  Despesa: 'despesas',
  DespesaPropriedade: 'despesas_propriedades', 
  Documento: 'documentos',
  Fracao: 'fracoes',
  Movimento: 'movimentos',
  Notificacao: 'notificacoes',
  Ocorrencia: 'ocorrencias',
  Pessoa: 'pessoas',
  Processo: 'processos',
  ProcessoJudicial: 'processos_judiciais',
  Propriedade: 'propriedades',
  Quota: 'quotas',
  RendaMensal: 'rendas_mensais'
};

// 2. O MOTOR AUTOMÁTICO (Faz as operações CRUD para qualquer tabela)
const createEntityMethods = (tableName) => ({
  list: async () => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) { console.error(`Erro a carregar ${tableName}:`, error); return []; }
    return data || [];
  },
  filter: async () => {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) { console.error(`Erro a filtrar ${tableName}:`, error); return []; }
    return data || [];
  },
  findOne: async (id) => {
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (error) { console.error(`Erro a encontrar em ${tableName}:`, error); return null; }
    return data;
  },
  create: async (payload) => {
    const { data, error } = await supabase.from(tableName).insert([payload]).select().single();
    if (error) { console.error(`Erro a criar em ${tableName}:`, error); throw error; }
    return data;
  },
  update: async (id, payload) => {
    const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
    if (error) { console.error(`Erro a atualizar em ${tableName}:`, error); throw error; }
    return data;
  },
  delete: async (id) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) { console.error(`Erro a apagar em ${tableName}:`, error); throw error; }
    return true;
  }
});

// 3. O CLIENTE EXPORTADO PARA A APLICAÇÃO
export const agenciaAvenida = {
  auth: {
    login: async () => ({ user: { name: "Administrador" }, token: "token" }),
    logout: async () => console.log("Logout simulado"),
    getCurrentUser: async () => ({ email: "admin@agencia-avenida.pt", full_name: "Gonçalo Patronilho" }),
    me: async () => ({ email: "admin@agencia-avenida.pt", full_name: "Gonçalo Patronilho" }),
  },
  
  entities: new Proxy({}, {
    get: function(target, prop) {
      // Quando o ecrã pedir uma entidade (ex: prop = 'Pessoa')
      const tableName = tableMap[prop];
      
      if (tableName) {
        // Se existir no nosso mapa, devolve o motor ligado à tabela correta
        return createEntityMethods(tableName);
      }
      
      // Fallback de segurança: Se o React pedir algo que não está mapeado, não dá erro.
      console.warn(`Atenção: A entidade "${prop}" não está mapeada para o Supabase!`);
      return {
        list: async () => [], findMany: async () => [], findOne: async () => null,
        filter: async () => [], create: async () => ({ id: 'simulado' }),
        update: async () => ({}), delete: async () => true,
      };
    }
  })
};

export const createClient = () => agenciaAvenida;