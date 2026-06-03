// src/api/agenciaAvenidaClient.js
// Mock do cliente para garantir a independência da interface visual.
// Mais tarde, estas funções vão ligar-se diretamente ao nosso motor em Python/Flask.

export const agenciaAvenida = {
  auth: {
    login: async (email, password) => {
      console.log("Simulação de Login para:", email);
      return { 
        user: { email: email, name: "Administrador de Sistema" }, 
        token: "token-seguro-local" 
      };
    },
    logout: async () => {
      console.log("Logout simulado com sucesso.");
    },
    getCurrentUser: async () => {
      return { email: "admin@agencia-avenida.pt", name: "Administrador de Sistema" };
    }
  },
  entities: {
    Condominio: {
      findMany: async () => { return []; },
      findOne: async (id) => { return null; },
    },
    Despesa: {
      findMany: async () => { return []; },
    },
    Ocorrencia: {
      findMany: async () => { return []; },
    },
    Propriedade: {
      findMany: async () => { return []; },
    },
    ProcessoJudicial: {
      findMany: async () => { return []; },
    },
    Quota: {
      findMany: async () => { return []; },
    }
  }
};

// Substitui a função original deles para evitar erros na inicialização
export const createClient = () => agenciaAvenida;