import { supabase } from './supabase.js';

// O nosso "escudo" para manter as outras páginas sem erros enquanto não as ligamos
const funcoesVaziasSeguras = {
  list: async () => [],
  findMany: async () => [],
  findOne: async () => null,
  filter: async () => [],
  create: async () => ({ id: 'simulado' }),
  update: async () => ({}),
  delete: async () => true,
};

export const agenciaAvenida = {
  auth: {
    login: async () => ({ user: { name: "Administrador" }, token: "token" }),
    logout: async () => console.log("Logout simulado"),
    getCurrentUser: async () => ({ email: "admin@agencia-avenida.pt", full_name: "Gonçalo Patronilho" }),
    me: async () => ({ email: "admin@agencia-avenida.pt", full_name: "Gonçalo Patronilho" }),
  },
  
  entities: new Proxy({
    // === A LIGAÇÃO REAL APENAS PARA CONDOMÍNIOS ===
    Condominio: {
      list: async () => {
        const { data, error } = await supabase.from('condominio').select('*').order('nome');
        if (error) { console.error('Erro a carregar condomínios:', error); return []; }
        return data || [];
      },
      filter: async () => {
        const { data, error } = await supabase.from('condominio').select('*');
        if (error) { console.error('Erro a filtrar condomínios:', error); return []; }
        return data || [];
      },
      findOne: async (id) => {
        const { data, error } = await supabase.from('condominio').select('*').eq('id', id).single();
        if (error) { console.error('Erro a encontrar condomínio:', error); return null; }
        return data;
      },
      create: async (payload) => {
        const { data, error } = await supabase.from('condominio').insert([payload]).select().single();
        if (error) { console.error('Erro a criar condomínio:', error); throw error; }
        return data;
      },
      update: async (id, payload) => {
        const { data, error } = await supabase.from('condominio').update(payload).eq('id', id).select().single();
        if (error) { console.error('Erro a atualizar condomínio:', error); throw error; }
        return data;
      },
      delete: async (id) => {
        const { error } = await supabase.from('condominio').delete().eq('id', id);
        if (error) { console.error('Erro a apagar condomínio:', error); throw error; }
        return true;
      }
    }
  }, {
    get: function(target, prop) {
      // Se o React pedir a tabela Condominio, devolvemos a ligação real acima!
      if (prop in target) {
        return target[prop];
      }
      // Se pedir Despesas, Ocorrencias, etc., devolvemos o escudo vazio para não dar erro
      return funcoesVaziasSeguras;
    }
  })
};

export const createClient = () => agenciaAvenida;