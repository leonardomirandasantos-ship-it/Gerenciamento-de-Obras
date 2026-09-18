import type { Evento, EventoKind } from "./types";

type PayloadDoArquivo = {
  fileName?: string;
  summary?: string;
  supplier?: string;
  payeeName?: string;
};

const NOME_DO_TIPO: Partial<Record<EventoKind, string>> = {
  E7_pagamento: "Comprovante",
  E8_orcamento: "Orçamento",
  E5_documento: "Documento",
  E4_documentacao: "Foto da obra",
};

function curto(texto: string, limite: number): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite).trimEnd()}…`;
}

/**
 * Um nome só para o cartão do arquivo (D149). As palavras dela vêm primeiro,
 * porque são as que ela lembra; sem legenda, vale o que a IA leu; o nome
 * original do arquivo é o último recurso — costuma ser
 * "WhatsApp-Doc-2026-09-10-proposta_final_v3.pdf".
 *
 * Os três continuam na busca: aqui só se escolhe o que APARECE.
 */
export function tituloDoArquivo(evento: Evento): string {
  const payload = evento.payload as PayloadDoArquivo;
  return (
    evento.caption?.trim() ||
    payload.summary ||
    evento.raw_text?.trim().slice(0, 60) ||
    payload.fileName ||
    NOME_DO_TIPO[evento.kind] ||
    "Arquivo"
  );
}

/** No celular ninguém digita acento: "orcamento" tem que achar "Orçamento". */
export function paraBusca(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Tudo o que se sabe do arquivo, para a busca achar por qualquer lado. */
export function textoDeBuscaDoArquivo(evento: Evento, extras: (string | undefined)[] = []): string {
  const payload = evento.payload as PayloadDoArquivo;
  const texto = [
    evento.caption,
    payload.summary,
    payload.fileName,
    payload.supplier,
    payload.payeeName,
    evento.raw_text,
    ...extras,
  ]
    .filter(Boolean)
    .join(" ");
  return paraBusca(texto);
}

/**
 * Nome do arquivo que SAI pelo encaminhar (D149). Antes saía sempre
 * "comprovante.pdf" — até orçamento e contrato — e quem recebia no WhatsApp
 * não sabia o que era. O arquivo guardado não muda: só a cópia que sai.
 *
 * Formato: "Orçamento - Vidraçaria Porto - 10-09-2026".
 */
export function nomeParaEncaminhar(evento: Evento): string {
  const payload = evento.payload as PayloadDoArquivo;
  const tipo = NOME_DO_TIPO[evento.kind] ?? "Arquivo";
  const quem = payload.supplier || payload.payeeName;
  const doQue = quem || curto(evento.caption?.trim() || payload.summary || "", 40);
  const data = new Date(evento.received_at).toLocaleDateString("pt-BR").replaceAll("/", "-");

  // "Orçamento - Orçamento de esquadrias" repete: se a descrição já diz o
  // tipo, o prefixo sai.
  const jaDizOTipo = paraBusca(doQue).startsWith(paraBusca(tipo));

  return [jaDizOTipo ? undefined : tipo, doQue, data]
    .filter(Boolean)
    .join(" - ")
    .replace(/[\\/:*?"<>|\n\r]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
