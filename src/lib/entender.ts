import type { EventoKind } from "./types";

/**
 * Contrato entre o app e o modelo de IA. Fica fora da rota para poder ser lido
 * e testado sem chamar a API — e para a tradução tipo→lente morar num lugar só.
 *
 * O modelo responde em vocabulário de OBRA ("pendencia", "gasto"), não em
 * códigos E1–E9: ele acerta muito mais falando a língua do produto, e a
 * tradução para o nosso tipo interno acontece aqui.
 */

export type TipoEntendido =
  | "pendencia"
  | "gasto"
  | "decisao"
  | "orcamento"
  | "comunicacao"
  | "documentacao";

export type RegistroEntendido = {
  tipo: TipoEntendido;
  texto: string;
  valor?: number;
  favorecido?: string;
  prazo?: string;
  ambientes?: string[];
  itens?: string[];
};

export type Entendimento = {
  transcricao: string;
  registros: RegistroEntendido[];
};

export const TIPO_PARA_KIND: Record<TipoEntendido, EventoKind> = {
  pendencia: "E1_lista",
  gasto: "E7_pagamento",
  decisao: "E3_decisao",
  orcamento: "E8_orcamento",
  comunicacao: "E6_comunicacao",
  documentacao: "E4_documentacao",
};

/**
 * Schema de saída estruturada — evita garimpar JSON no meio de prosa.
 *
 * Dois cuidados que evitam um 400 na primeira chamada: o `type` do Schema do
 * Gemini é o enum do OpenAPI e vai em MAIÚSCULO; e `enum` dentro do schema
 * exige `format: "enum"` em parte das versões, então `tipo` fica STRING solto
 * e a validação acontece aqui no código, que já sabe traduzir e descartar.
 */
export const ESQUEMA_ENTENDIMENTO = {
  type: "OBJECT",
  properties: {
    transcricao: {
      type: "STRING",
      description: "Transcrição literal do áudio, em português. Vazio se for imagem.",
    },
    registros: {
      type: "ARRAY",
      description: "Um item por assunto distinto. Não invente o que não foi dito.",
      items: {
        type: "OBJECT",
        properties: {
          tipo: {
            type: "STRING",
            description:
              "Um de: pendencia, gasto, decisao, orcamento, comunicacao, documentacao.",
          },
          texto: {
            type: "STRING",
            description: "O assunto em uma frase curta, nas palavras dela.",
          },
          valor: { type: "NUMBER", description: "Só para gasto/orçamento, em reais." },
          favorecido: { type: "STRING", description: "Quem recebeu o pagamento." },
          prazo: { type: "STRING", description: "Data no formato YYYY-MM-DD." },
          ambientes: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Só para decisão: ambientes da casa citados.",
          },
          itens: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Só para pendência com vários itens: um item por linha.",
          },
        },
        required: ["tipo", "texto"],
      },
    },
  },
  required: ["transcricao", "registros"],
} as const;

/**
 * O modelo pode devolver "Pendência", "pendencia" ou "PENDENCIA" — nenhuma
 * dessas variações deveria custar um registro perdido.
 */
export function kindDoTipo(tipo: string | undefined): EventoKind | null {
  if (!tipo) return null;
  const limpo = tipo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return TIPO_PARA_KIND[limpo as TipoEntendido] ?? null;
}

export function montarPrompt({
  ehAudio,
  hoje,
  fases,
  favorecidos,
  ambientes,
}: {
  ehAudio: boolean;
  hoje: string;
  fases: string;
  favorecidos: string;
  ambientes: string;
}): string {
  return `Você organiza registros de obra para uma engenheira brasileira. Ela manda
${ehAudio ? "um áudio gravado no canteiro" : "uma imagem (comprovante, nota ou documento)"} e você extrai o que dá para organizar.

${ehAudio ? "Transcreva primeiro, literalmente, em português do Brasil. Ela usa jargão de obra (canaleta, rejunte, prumada, baldrame, contrapiso, requadro, chapisco) e nomes de material com medida (19x19x29). Mantenha os números exatos." : "Leia o que está escrito na imagem. Não descreva a imagem, extraia os dados."}

Depois separe em registros. UM REGISTRO POR ASSUNTO: se ela falar de um pagamento
e de uma compra pendente no mesmo áudio, são dois registros.

Como decidir o tipo — o que separa é o TEMPO DO VERBO, não o assunto:
- "gasto": dinheiro que JÁ saiu. "paguei", "gastei", "comprei", "adiantei", comprovante.
  Preencha valor e favorecido quando forem ditos.
- "pendencia": o que ela AINDA vai fazer ou comprar. "preciso", "tenho que", "comprar",
  "falta", lista de material a pedir. Se forem vários itens, preencha "itens".
- "decisao": especificação de acabamento escolhida (cor, modelo, material de um ambiente).
  Preencha "ambientes" com os ambientes citados.
- "orcamento": cotação, proposta, preço que alguém passou — dinheiro que ainda NÃO saiu.
- "comunicacao": recado, reclamação, combinado com fornecedor, sem ação nossa.
- "documentacao": registro do andamento da obra, sem ação.

Atenção: "comprar cimento" é pendencia; "comprei cimento" é gasto. "vou pagar o
Valdir" é pendencia, porque ainda não pagou.

Prazo: hoje é ${hoje}. Converta o que ela falar ("sexta", "amanhã", "semana que vem",
"dia 20") para YYYY-MM-DD. Só preencha prazo quando ela declarar um prazo — se só
citou uma data de passagem, deixe vazio.
${favorecidos ? `\nPessoas e empresas que já receberam nesta obra (use o nome exatamente assim se for uma delas): ${favorecidos}.` : ""}
${ambientes ? `\nAmbientes já usados nesta obra: ${ambientes}. Pode criar um novo se ela citar outro.` : ""}
${fases ? `\nFases da obra: ${fases}.` : ""}

Regras finais:
- Não invente valor, nome nem data que não foram ditos. Campo em dúvida fica vazio.
- Se o áudio não tiver nada organizável (só um "bom dia"), devolva a transcrição e
  a lista de registros vazia.
- "texto" é curto e nas palavras dela, não seu resumo formal.`;
}
