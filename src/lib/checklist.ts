import { extrairDataMencionada, removerMencaoDeData } from "./datas";
import type { ChecklistItem } from "./types";

const REGEX_BULLET = /^[-*•·]\s*/;
const REGEX_STATUS_OK = /\s*\b(ok|feito|pronto|conclu[íi]do|comprado)\b\.?$/i;
const REGEX_STATUS_FALTA = /\s*\b(n[ãa]o|falta|pendente)\b\.?$/i;
const REGEX_NOTA = /^(.*?)\s+[-–—]\s+(.+)$/;

const MAX_PALAVRAS_POR_ITEM = 5;
const CONECTOR = /\s+\b(?:e|ou)\b\s+/i;
/** Vírgula de lista, não de número: "2,5" e "R$ 1.250,00" ficam inteiros. */
const VIRGULA_DE_LISTA = /,(?!\d)/;

/**
 * "comprar cal, cimento e areia" vira três itens (D156).
 *
 * A porta é estreita de propósito: exige vírgula E conector ("A, B e C"), que
 * é como se enumera em português. Vírgula sozinha aparece em frase ("pix pro
 * José Costa, mão de obra da semana") e "e" sozinho aparece em nome ("Suítes 1
 * e 2", "Concreto muros e muros") — separar por um só dos dois picotava a
 * amostra real do WhatsApp. Pedaço comprido também barra: enumeração de obra é
 * curta, frase é longa.
 *
 * Isto NÃO é parsear lista em colunas (anti-goal do Fluxo 1): continua sendo
 * uma linha = um assunto; só se reconhece que o assunto tinha três coisas.
 */
export function separarEnumeracao(linha: string): string[] {
  const texto = linha.trim();

  if (!VIRGULA_DE_LISTA.test(texto)) return [texto];
  if (!CONECTOR.test(texto)) return [texto];
  // "Muro fundo - rebocar, pintar" é item com nota, não enumeração.
  if (REGEX_NOTA.test(texto)) return [texto];

  const partes = texto
    .split(new RegExp(VIRGULA_DE_LISTA, "g"))
    .flatMap((parte) => parte.split(new RegExp(CONECTOR, "gi")))
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (partes.length < 2) return [texto];
  if (partes.some((parte) => parte.split(/\s+/).length > MAX_PALAVRAS_POR_ITEM)) return [texto];

  return partes;
}

/** Cada linha não vazia é um item. Não parseia em colunas (Fluxo 1, anti-goal). */
export function extrairItensDeLista(texto: string): string[] {
  return texto
    .split("\n")
    .map((linha) => linha.replace(REGEX_BULLET, "").trim())
    .filter((linha) => linha.length > 0)
    .flatMap(separarEnumeracao);
}

/** Normaliza para comparar itens entre um re-envio e um checklist existente. */
export function normalizarItem(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(REGEX_STATUS_OK, "")
    .replace(REGEX_STATUS_FALTA, "")
    .replace(/\s+[-–—]\s+.*$/, "")
    .replace(/\b\d+([.,]\d+)?\b/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lê "Guarda corpo ok", "Piscina não", "Muro fundo - rebocar". */
export function parseItemComStatus(linha: string): ChecklistItem {
  const limpa = linha.replace(REGEX_BULLET, "").trim();

  let status: ChecklistItem["status"] = "falta";
  let texto = limpa;

  if (REGEX_STATUS_OK.test(limpa)) {
    status = "ok";
    texto = limpa.replace(REGEX_STATUS_OK, "").trim();
  } else if (REGEX_STATUS_FALTA.test(limpa)) {
    texto = limpa.replace(REGEX_STATUS_FALTA, "").trim();
  }

  // "comprar cimento até 20/09" já nasce com prazo no item. E, se a data virou
  // campo, ela sai do texto: o chip já mostra "hoje" ao lado (D153). A mensagem
  // original na conversa não muda — só o item do checklist.
  const date = extrairDataMencionada(limpa) ?? undefined;
  if (date) texto = removerMencaoDeData(texto);

  const comNota = texto.match(REGEX_NOTA);
  if (comNota) {
    return { text: comNota[1].trim(), status, note: comNota[2].trim(), date };
  }

  return { text: texto, status, date };
}

export function itensParaChecklist(texto: string): ChecklistItem[] {
  return extrairItensDeLista(texto).map(parseItemComStatus);
}

export type Similaridade = { casados: number; proporcao: number };

/** Quanto um re-envio de lista "é" um checklist que já existe (Fluxo 2, caso B). */
export function compararComChecklist(
  itensNovos: string[],
  itensChecklist: ChecklistItem[],
): Similaridade {
  const doChecklist = itensChecklist.map((item) => normalizarItem(item.text)).filter(Boolean);
  const novos = itensNovos.map(normalizarItem).filter(Boolean);

  if (doChecklist.length === 0 || novos.length === 0) {
    return { casados: 0, proporcao: 0 };
  }

  const casados = novos.filter((item) => doChecklist.includes(item)).length;
  return { casados, proporcao: casados / Math.max(novos.length, doChecklist.length) };
}

/**
 * Limiar do "checklist vivo" (pendência consciente #3 das specs): conservador de
 * propósito — 2+ itens casando e metade da lista — pra não sugerir fusão errada.
 */
export function pareceMesmaLista(similaridade: Similaridade): boolean {
  return similaridade.casados >= 2 && similaridade.proporcao >= 0.5;
}

/** Aplica os status de um re-envio sobre os itens do checklist existente. */
export function fundirStatus(
  itensAtuais: ChecklistItem[],
  itensRecebidos: ChecklistItem[],
): { itens: ChecklistItem[]; alterados: number } {
  let alterados = 0;

  const itens = itensAtuais.map((atual) => {
    const chave = normalizarItem(atual.text);
    const recebido = itensRecebidos.find((item) => normalizarItem(item.text) === chave);
    if (!recebido) return atual;

    const mudouStatus = recebido.status !== atual.status;
    const mudouNota = Boolean(recebido.note) && recebido.note !== atual.note;
    if (!mudouStatus && !mudouNota) return atual;

    alterados += 1;
    return {
      ...atual,
      status: recebido.status,
      note: recebido.note ?? atual.note,
    };
  });

  return { itens, alterados };
}

export function progressoChecklist(itens: ChecklistItem[]): { feitos: number; total: number } {
  return {
    feitos: itens.filter((item) => item.status === "ok").length,
    total: itens.length,
  };
}
