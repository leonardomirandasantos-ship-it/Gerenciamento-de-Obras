import type { EventoKind } from "./types";

export type EntradaClassificacao = {
  texto: string;
  temFoto: boolean;
  temVideo: boolean;
  temPdf: boolean;
  temAudio: boolean;
};

export type ResultadoClassificacao = {
  kind: EventoKind;
  confidence: number;
};

const REGEX_PAGAMENTO =
  /\bpix\b|comprovante|\bpago\b|\bpaguei\b|\bpagamos\b|\bpagamento\b|\badiantei\b|\badiantamento\b|\btransferi\b|\bdepositei\b/i;

const REGEX_ORCAMENTO = /or[çc]amento|cota[çc][ãa]o|\bproposta\b/i;

/** No uso real ela escreve "$5.380," sem o R — então aceito as duas formas. */
const REGEX_DINHEIRO = /(?:r\$|\$)\s*\d/i;

const REGEX_DECISAO =
  /\bcor\b|\bcores\b|\bmedida\b|\bmodelo\b|escolh(i|emos)|especifica[çc][ãa]o|porcelanato|rejunte|revestimento|acabamento|\btinta\b|\blou[çc]a\b|\bmetais\b|\bbancada\b|\bpiso\b|soleira/i;

/** Linha que começa com quantidade é o padrão dominante de material. */
const REGEX_COMECA_COM_QUANTIDADE = /^\s*\d+([.,]\d+)?\s*\S/;

const REGEX_MATERIAL =
  /\bcomprar\b|\bcota[çc][ãa]o\b|\bsacos?\b|\bbarras?\b|m³|\bkg\b|\brolos?\b|\bcx\b|\bun\b|\bpe[çc]as?\b|\bmm\b|\bcm\b|\bmetros?\b/i;

/** Pendência curta em forma de tarefa ("Mudar tomada", "Requadros portas"). */
const REGEX_TAREFA =
  /^\s*(?:requadr|mud(?:ar|e)|troc|rejunt|instal|coloc|compr|ped(?:ir|e)|confirm|ajust|aument|refaz|refar|falar|termin|finaliz|revis|limp|ver\b)/i;

/**
 * RegrasClassifier — heurística local, zero custo (D43 passo 1). A ordem das
 * regras segue o que o export real mostrou: lista multi-linha é o padrão mais
 * comum, decisão normalmente se anuncia na primeira linha, e dinheiro sem verbo
 * de pagamento é cotação, não pagamento.
 *
 * Plano B (D44): não casou nada → "unclassified", e a sugestão F_classificar
 * oferece resolver em 1 toque.
 */
export function classificar(entrada: EntradaClassificacao): ResultadoClassificacao {
  const { texto, temFoto, temVideo, temPdf, temAudio } = entrada;

  if (temPdf) {
    if (REGEX_ORCAMENTO.test(texto)) return { kind: "E8_orcamento", confidence: 0.7 };
    return { kind: "E5_documento", confidence: 0.8 };
  }

  if (temFoto || temVideo) return { kind: "E4_documentacao", confidence: 0.9 };
  if (temAudio) return { kind: "unclassified", confidence: 0 };
  if (!texto.trim()) return { kind: "unclassified", confidence: 0 };

  const linhas = texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean);
  const primeiraLinha = linhas[0] ?? "";

  if (REGEX_PAGAMENTO.test(texto)) {
    return { kind: "E7_pagamento", confidence: 0.75 };
  }

  // "REJUNTES" / "Piso social: porcelanato bege" — o assunto se declara na
  // primeira linha, mesmo quando o bloco tem várias linhas de especificação.
  if (REGEX_DECISAO.test(primeiraLinha)) {
    return { kind: "E3_decisao", confidence: 0.6 };
  }

  if (linhas.length >= 3) {
    return { kind: "E1_lista", confidence: 0.75 };
  }

  // Texto corrido e longo é comunicação (ex.: reclamação formal a fornecedor),
  // não lista — precisa vir antes das heurísticas de material, senão um "80 cm"
  // no meio do parágrafo faz o texto virar material.
  if (texto.length > 200) {
    return { kind: "E6_comunicacao", confidence: 0.6 };
  }

  if (REGEX_ORCAMENTO.test(texto) || REGEX_DINHEIRO.test(texto)) {
    return { kind: "E8_orcamento", confidence: 0.6 };
  }

  if (REGEX_DECISAO.test(texto)) {
    return { kind: "E3_decisao", confidence: 0.55 };
  }

  if (
    linhas.some((linha) => REGEX_COMECA_COM_QUANTIDADE.test(linha)) ||
    REGEX_MATERIAL.test(texto)
  ) {
    return { kind: "E1_lista", confidence: 0.6 };
  }

  if (REGEX_TAREFA.test(texto)) {
    return { kind: "E1_lista", confidence: 0.55 };
  }

  return { kind: "unclassified", confidence: 0 };
}
