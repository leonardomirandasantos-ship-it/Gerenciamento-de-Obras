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

const REGEX_PAGAMENTO = /\br\$|\bpix\b|comprovante|\bpago\b|\bpagamento\b/i;
const REGEX_ORCAMENTO = /or[çc]amento/i;
const REGEX_DECISAO =
  /\bcor\b|\bmedida\b|\bmodelo\b|escolh(i|emos)|especifica[çc][ãa]o|porcelanato|rejunte|revestimento|acabamento|\btinta\b|\blou[çc]a\b|\bmetais\b|\bbancada\b/i;
const REGEX_LISTA_MATERIAL = /\bcomprar\b|\bcota[çc][ãa]o\b|\d+\s*(m³|kg|k\.|barras?|sacos?|cx|rolos?|metros?|m\b)/i;

/**
 * RegrasClassifier — heurística local, zero custo (07_ARQUITETURA_TECNICA §3, D43 passo 1).
 * Plano B (D44): não casou nada → "unclassified", nunca força um tipo.
 */
export function classificar(entrada: EntradaClassificacao): ResultadoClassificacao {
  const { texto, temFoto, temVideo, temPdf, temAudio } = entrada;
  const linhas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (temPdf) {
    if (REGEX_ORCAMENTO.test(texto)) return { kind: "E8_orcamento", confidence: 0.7 };
    return { kind: "E5_documento", confidence: 0.8 };
  }

  if (temFoto || temVideo) {
    return { kind: "E4_documentacao", confidence: 0.9 };
  }

  if (temAudio) {
    return { kind: "unclassified", confidence: 0 };
  }

  if (!texto.trim()) {
    return { kind: "unclassified", confidence: 0 };
  }

  if (REGEX_PAGAMENTO.test(texto)) {
    return { kind: "E7_pagamento", confidence: 0.75 };
  }

  // Multi-linha é o sinal mais forte do uso real (~40% do texto são listas),
  // então lista ganha de decisão quando há várias linhas.
  if (linhas.length >= 3) {
    return { kind: "E1_lista", confidence: 0.75 };
  }

  if (REGEX_DECISAO.test(texto)) {
    return { kind: "E3_decisao", confidence: 0.6 };
  }

  if (REGEX_LISTA_MATERIAL.test(texto)) {
    return { kind: "E1_lista", confidence: 0.6 };
  }

  if (texto.length > 200) {
    return { kind: "E6_comunicacao", confidence: 0.5 };
  }

  return { kind: "unclassified", confidence: 0 };
}
