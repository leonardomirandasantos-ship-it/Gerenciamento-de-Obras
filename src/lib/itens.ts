/**
 * Contrato da segunda opinião sobre a quebra em itens (D164). Fica separado da
 * rota para poder ser exercitado direto contra o modelo, sem subir o app —
 * foi assim que as regras do prompt foram calibradas contra a amostra real.
 */
export const ESQUEMA_DE_ITENS = {
  type: "OBJECT",
  properties: {
    itens: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Os itens da linha, nas palavras dela.",
    },
  },
  required: ["itens"],
} as const;

export function montarPromptDeItens(linha: string): string {
  return `Uma engenheira de obra mandou a linha abaixo numa lista. Devolva os itens dela.

Regras:
- Use as PALAVRAS DELA. Não traduza, não padronize, não complete, não invente.
- Se a linha for UMA coisa só, devolva um item só. Vale para tarefa ("Mudar tomada
  da churrasqueira"), frase ("o Vilmar não apareceu"), material com medida
  ("1000 estrutural 14x19x29") e nome composto ("Casa de máquina", "Guarda corpo",
  "Concreto muros e muros", "Suítes 1 e 2").
- Separe quando for relação de coisas a comprar ou fazer: "comprar prego martelo
  e marreta" são três; "cal, cimento e areia" são três.
- Tire o prazo do texto do item — a data já fica guardada à parte. "comprar cal
  pra hoje" vira só "cal".
- No máximo 12 itens.

Linha: ${JSON.stringify(linha)}`;
}

