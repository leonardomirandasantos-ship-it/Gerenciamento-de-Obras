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
  | "documentacao"
  | "documento"
  | "duvida";

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
  // PDF que é papel da obra e não dinheiro: contrato, projeto, ART, nota (D148).
  documento: "E5_documento",
  // PDF em que não dá para saber se o dinheiro já saiu: vira o card
  // "é orçamento ou gasto?" em vez de um chute que mexe no total da obra.
  duvida: "unclassified",
};

export type FormatoDoArquivo = "audio" | "imagem" | "pdf";

export function formatoDoMime(mime: string): FormatoDoArquivo {
  if (mime === "application/pdf") return "pdf";
  return mime.startsWith("audio/") ? "audio" : "imagem";
}

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
              "Um de: pendencia, gasto, decisao, orcamento, comunicacao, documentacao, documento, duvida.",
          },
          texto: {
            type: "STRING",
            description: "O assunto em uma frase curta, nas palavras dela.",
          },
          valor: { type: "NUMBER", description: "Só para gasto/orçamento, em reais." },
          favorecido: {
            type: "STRING",
            description: "Quem recebeu o pagamento, ou quem emitiu o orçamento.",
          },
          prazo: { type: "STRING", description: "Data no formato YYYY-MM-DD." },
          ambientes: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Só para decisão: ambientes da casa citados.",
          },
          itens: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "Pendência com vários itens, ou os itens de um orçamento.",
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

const PDF = `Leia o documento. Não descreva o arquivo, extraia os dados. O PDF inteiro
é UM arquivo e vira UM registro: devolva exatamente um item em "registros".

O que decide o tipo é se o dinheiro JÁ SAIU:
- Comprovante de pagamento (PIX, TED, boleto com autenticação de pago, recibo de quem
  recebeu): tipo "gasto". "favorecido" é quem RECEBEU; "valor" é o valor pago.
- Orçamento, proposta, cotação, pedido ainda não pago: tipo "orcamento". "favorecido"
  é a empresa ou pessoa que fez o orçamento; "valor" é o TOTAL; em "itens", os
  principais itens orçados (no máximo 10, curtos). "texto" diz o que foi orçado,
  ex.: "Orçamento de esquadrias de alumínio".
- Nota fiscal, contrato, projeto, planta, ART/RRT, laudo, memorial, alvará: tipo
  "documento". "texto" diz o que é, ex.: "Contrato de empreitada da estrutura".
  Nota fiscal é "documento" e não "gasto": o pagamento dela entra pelo comprovante,
  e contar os dois somaria o mesmo dinheiro duas vezes.
- Se não der para saber se o dinheiro já saiu (recibo sem assinatura, pedido que
  pode ou não estar pago): tipo "duvida", com valor e favorecido se houver. Ela
  decide com um toque; um chute errado mexeria no total da obra.

Ignore CPF, CNPJ, agência, conta, chave e código de autenticação: não precisamos disso.`;

const SEPARAR = `Depois separe em registros. UM REGISTRO POR ASSUNTO: se ela falar de um pagamento
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
Valdir" é pendencia, porque ainda não pagou.`;

export function montarPrompt({
  formato,
  hoje,
  fases,
  favorecidos,
  ambientes,
}: {
  formato: FormatoDoArquivo;
  hoje: string;
  fases: string;
  favorecidos: string;
  ambientes: string;
}): string {
  const ehAudio = formato === "audio";
  const oQueChega = {
    audio: "um áudio gravado no canteiro",
    imagem: "uma imagem (comprovante, nota ou documento)",
    pdf: "um PDF (orçamento, comprovante, nota, contrato ou projeto)",
  }[formato];

  return `Você organiza registros de obra para uma engenheira brasileira. Ela manda
${oQueChega} e você extrai o que dá para organizar.

${formato === "pdf" ? PDF : ehAudio ? "Transcreva primeiro, literalmente, em português do Brasil. Ela usa jargão de obra (canaleta, rejunte, prumada, baldrame, contrapiso, requadro, chapisco) e nomes de material com medida (19x19x29). Mantenha os números exatos." : `Leia o que está escrito na imagem. Não descreva a imagem, extraia os dados.

Se for comprovante de pagamento (PIX, TED, boleto), o "favorecido" é quem RECEBEU
o dinheiro — o campo "Recebedor", "Destinatário" ou "Beneficiário", nunca o
pagador. O "valor" é o valor da transação em reais; "R$ 401,00" é 401. Ignore
CPF, agência, conta, chave e código de autenticação: não precisamos desses dados.

Se for foto do canteiro, sem texto para extrair, use o tipo "documentacao" e
descreva em uma linha curta o que a foto mostra.`}

${formato === "pdf" ? "" : SEPARAR}

Prazo: hoje é ${hoje}. Converta o que ela falar ("sexta", "amanhã", "semana que vem",
"dia 20") para YYYY-MM-DD. Só preencha prazo quando ela declarar um prazo — se só
citou uma data de passagem, deixe vazio.
${favorecidos ? `\nPessoas e empresas que já receberam nesta obra (use o nome exatamente assim se for uma delas): ${favorecidos}.` : ""}
${ambientes ? `\nAmbientes já usados nesta obra: ${ambientes}. REUSE um destes quando servir — "banheiro da suíte" é "Banheiros". Só crie um nome novo se ela citar um ambiente que não cabe em nenhum.` : ""}
${fases ? `\nFases da obra: ${fases}.` : ""}

Regras finais:
- Não invente valor, nome nem data que não foram ditos. Campo em dúvida fica vazio.
- Se o áudio não tiver nada organizável (só um "bom dia"), devolva a transcrição e
  a lista de registros vazia.
- "texto" é curto e nas palavras dela, não seu resumo formal.`;
}
