/**
 * Ambientes da obra e como reconhecê-los no texto. Os termos vieram das
 * mensagens reais: ela escreve "Suítes 1 e 2", "Master", "Lavabo", "gourmet",
 * "box" — e não "quarto", "banheiro", "cozinha".
 */
export const AMBIENTES = [
  "Quartos",
  "Banheiros",
  "Cozinha",
  "Sala",
  "Escritório",
  "Lavanderia",
  "Área externa",
] as const;

export type Ambiente = (typeof AMBIENTES)[number];

const PADROES: { ambiente: Ambiente; regex: RegExp }[] = [
  { ambiente: "Quartos", regex: /\bsu[íi]tes?\b|\bquartos?\b|\bmaster\b|\bcloset\b|\bdormit[óo]rio/i },
  {
    ambiente: "Banheiros",
    regex: /\bbanheiros?\b|\blavabo\b|\bbox\b|\bchuveiro\b|\bbacia\b|\btoalheiro\b/i,
  },
  {
    ambiente: "Cozinha",
    regex: /\bcozinha\b|\bgourmet\b|\bchurrasqueira\b|\bcoifa\b|\bcooktop\b|\bbancada\b/i,
  },
  { ambiente: "Sala", regex: /\bsalas?\b|\bestar\b|\bliving\b|\bjantar\b|\bhome\b/i },
  { ambiente: "Escritório", regex: /\bescrit[óo]rio\b|\bescrivaninhas?\b/i },
  { ambiente: "Lavanderia", regex: /\blavanderia\b|\b[áa]rea de servi[çc]o\b/i },
  {
    ambiente: "Área externa",
    regex: /\bpiscina\b|\bfachada\b|\bgaragem\b|\bmuro\b|\bjardim\b|\bvaranda\b|\bexterno\b|\bdep[óo]sito\b/i,
  },
];

/** Todos os ambientes citados no texto, na ordem em que aparecem na lista. */
export function detectarAmbientes(texto: string): Ambiente[] {
  return PADROES.filter((padrao) => padrao.regex.test(texto)).map((padrao) => padrao.ambiente);
}

export function detectarAmbiente(texto: string): Ambiente | undefined {
  return detectarAmbientes(texto)[0];
}
