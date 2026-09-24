import { extrairDataMencionada, removerMencaoDeData } from "./datas";
import type { ChecklistItem } from "./types";

const REGEX_BULLET = /^[-*•·]\s*/;
const REGEX_STATUS_OK = /\s*\b(ok|feito|pronto|conclu[íi]do|comprado)\b\.?$/i;
const REGEX_STATUS_FALTA = /\s*\b(n[ãa]o|falta|pendente)\b\.?$/i;
const REGEX_NOTA = /^(.*?)\s+[-–—]\s+(.+)$/;

/** Verbo de aquisição: o que vem depois dele é uma relação de coisas a obter. */
const VERBO_DE_COMPRA = /^(?:comprar|compra|pedir|pedido de|encomendar|orçar|orcar|cotar)\b/i;

const CONECTOR = /\s+\b(?:e|ou)\b\s+/i;
/** Vírgula de lista, não de número: "2,5" e "R$ 1.250,00" ficam inteiros. */
const VIRGULA_DE_LISTA = /,(?!\d)/;

/**
 * Palavra que só faz sentido dentro de uma frase: se aparecer, a linha é frase
 * e não relação. "comprar cimento e areia para o contrapiso" é uma compra só.
 */
const PALAVRA_DE_FRASE = new Set([
  "de", "do", "da", "dos", "das", "para", "pra", "pro", "com", "em", "no", "na",
  "nos", "nas", "ao", "aos", "à", "às", "o", "a", "os", "as", "um", "uma", "que",
  "por", "sem", "sob", "até", "ate", "mais", "tudo", "isso", "urgente", "rápido",
  "rapido", "logo", "favor", "ainda", "já", "ja", "também", "tambem",
]);

const PALAVRA_SIMPLES = /^[a-zà-ÿ][a-zà-ÿ'-]{2,}$/i;

function ehPalavraSimples(pedaco: string): boolean {
  const limpo = pedaco.trim();
  return PALAVRA_SIMPLES.test(limpo) && !PALAVRA_DE_FRASE.has(limpo.toLowerCase());
}

/**
 * O trecho INICIAL de palavras simples é a relação; o que vier depois gruda no
 * último item (D162). "Comprar prego martelo e marreta que vem" tem que dar
 * três itens — exigir que a linha inteira fosse limpa fazia um "que vem" no
 * fim cancelar a quebra toda.
 */
function corridaDePalavras(palavras: string[], minimo: number): string[] | null {
  let corte = 0;
  while (corte < palavras.length && ehPalavraSimples(palavras[corte])) corte += 1;

  if (corte < minimo) return null;

  const itens = palavras.slice(0, corte);
  const cauda = palavras.slice(corte).join(" ");
  if (cauda) itens[itens.length - 1] = `${itens[itens.length - 1]} ${cauda}`;

  return itens;
}

/** Fragmentos iguais são repetição de frase ("Concreto muros e muros"). */
function temRepetido(pedacos: string[]): boolean {
  const vistos = new Set(pedacos.map((p) => p.toLowerCase()));
  return vistos.size !== pedacos.length;
}

function porVirgulaEConector(texto: string): string[] | null {
  if (!VIRGULA_DE_LISTA.test(texto) || !CONECTOR.test(texto)) return null;

  const pedacos = texto
    .split(new RegExp(VIRGULA_DE_LISTA, "g"))
    .flatMap((parte) => parte.split(new RegExp(CONECTOR, "gi")))
    .map((parte) => parte.trim())
    .filter(Boolean);

  if (pedacos.length < 2 || pedacos.length > 8) return null;
  if (pedacos.some((pedaco) => pedaco.split(/\s+/).length > 5)) return null;
  return pedacos;
}

/** Tokens da linha, com o conector fora e o verbo de compra fora. */
function palavrasSoltas(texto: string): string[] {
  return texto
    .replace(VERBO_DE_COMPRA, "")
    .split(/\s+/)
    .map((palavra) => palavra.trim())
    .filter((palavra) => palavra && !/^(?:e|ou)$/i.test(palavra));
}

/**
 * "Comprar cal cimento pincel" e "Comprar areia pedra e brita" são três itens
 * cada um. Quem pede material no celular não põe vírgula — exigir vírgula
 * deixava a regra bonita e inútil (D159).
 *
 * O que autoriza separar por espaço é o VERBO DE COMPRA: depois de "comprar"
 * vem uma relação de coisas. "Mudar Tomada churrasqueira" tem a mesma forma e
 * é uma tarefa só, por isso o verbo precisa ser de aquisição, não qualquer um.
 */
function porVerboDeCompra(texto: string): string[] | null {
  if (!VERBO_DE_COMPRA.test(texto)) return null;

  const itens = corridaDePalavras(palavrasSoltas(texto), 2);
  if (!itens || itens.length > 8 || temRepetido(itens)) return null;

  return itens;
}

/**
 * "Brita areia e pedra", sem verbo nenhum. Aqui a porta é a mais estreita de
 * todas — três ou mais palavras simples, sem repetir, ligadas por "e" —
 * porque é a forma que mais parece frase: "Concreto muros e muros" (repete) e
 * "Suítes 1 e 2" (número) são as duas da amostra real que precisam passar
 * inteiras.
 */
function porConectorEntrePalavras(texto: string): string[] | null {
  if (!CONECTOR.test(texto)) return null;

  const itens = corridaDePalavras(palavrasSoltas(texto), 3);
  if (!itens || itens.length > 8 || temRepetido(itens)) return null;

  return itens;
}

/**
 * Uma linha pode conter vários itens. Isto NÃO é parsear lista em colunas
 * (anti-goal do Fluxo 1): continua uma linha = um assunto; só se reconhece que
 * o assunto trazia três coisas.
 *
 * A data sai antes de decidir — "Comprar areia tijolo e pedra pra hoje" tem
 * que ser julgada como "Comprar areia tijolo e pedra". O prazo não se perde:
 * ele já está no campo `date` da lista e é herdado pelo checklist (D157).
 */
export function separarEnumeracao(linha: string): string[] {
  const original = linha.trim();
  // "Muro fundo - rebocar, pintar" é item com nota, não relação.
  if (REGEX_NOTA.test(original)) return [original];

  const texto = removerMencaoDeData(original);

  const pedacos =
    porVirgulaEConector(texto) ?? porVerboDeCompra(texto) ?? porConectorEntrePalavras(texto);

  return pedacos && pedacos.length >= 2 ? pedacos : [original];
}

/**
 * Quando a regra local não quebrou mas a linha cheira a relação de coisas
 * (D164). É o gatilho da segunda opinião da IA — e só isso: quem decide o que
 * aparece na tela na hora continua sendo a regra local, que é instantânea.
 *
 * A porta é: uma linha só, curta, com verbo de compra ou conector ou vírgula,
 * e pelo menos três palavras de conteúdo. Fora disso não vale gastar chamada.
 */
export function precisaDeSegundaOpiniao(texto: string): boolean {
  const linhas = texto.split("\n").map((linha) => linha.trim()).filter(Boolean);
  if (linhas.length !== 1) return false;

  const linha = linhas[0];
  if (linha.length > 120) return false;
  if (extrairItensDeLista(linha).length > 1) return false;
  if (REGEX_NOTA.test(linha)) return false;

  const cheiraLista =
    VERBO_DE_COMPRA.test(linha) || CONECTOR.test(linha) || VIRGULA_DE_LISTA.test(linha);
  if (!cheiraLista) return false;

  return palavrasSoltas(removerMencaoDeData(linha)).length >= 3;
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
