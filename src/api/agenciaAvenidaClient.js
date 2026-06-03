// src/api/agenciaAvenidaClient.js
// Mock do cliente blindado com Proxy. Nunca mais terás ecrãs em branco!

const funcoesVaziasSeguras = {
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
  // O "Proxy" é um escudo mágico: 
  // Qualquer tabela (Condominio, Despesa, etc.) que o React tente ler, 
  // ele devolve as funcoesVaziasSeguras sem dar erro!
  entities: new Proxy({}, {
    get: function(target, prop) {
      return funcoesVaziasSeguras;
    }
  })
};

export const createClient = () => agenciaAvenida;