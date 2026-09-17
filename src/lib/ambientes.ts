/**
 * Ambientes da obra e como reconhecê-los no texto. Os termos vieram das
 * mensagens reais: ela escreve "Suítes 1 e 2", "Master", "Lavabo", "gourmet",
 * "box" — e não "quarto", "banheiro", "cozinha".
 */
export const AMBIENTES: string[] = [
  "Quartos",
  "Banheiros",
  "Cozinha",
  "Sala",
  "Escritório",
  "Lavanderia",
  "Área externa",
];

/**
 * Ambiente é texto livre, não taxonomia fechada: os 7 acima são só os que o
 * app reconhece sozinho a partir do texto. Casa real tem canil, adega, ateliê
 * — o usuário cria o que faltar ao fixar a decisão (D98).
 */
export type Ambiente = string;

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

/** Ambientes de um evento: os fixados, ou os detectados se ainda não fixaram. */
export function ambientesDoEvento(evento: {
  payload: Record<string, unknown>;
  raw_text: string | null;
}): Ambiente[] {
  const payload = evento.payload as { environments?: string[]; environment?: string };
  if (payload.environments?.length) return payload.environments;
  if (payload.environment) return [payload.environment];
  return detectarAmbientes(evento.raw_text ?? "");
}

/**
 * Lista de filtro da aba Decisões: os conhecidos mais os que esta obra
 * realmente usa. Cresce sozinha — não existe tela de "cadastrar ambiente",
 * e nenhum filtro aparece sem ter decisão por trás.
 */
export function ambientesDaObra(
  eventos: { payload: Record<string, unknown>; raw_text: string | null }[],
): Ambiente[] {
  const usados = new Set<string>();
  for (const evento of eventos) {
    for (const ambiente of ambientesDoEvento(evento)) usados.add(ambiente);
  }

  const extras = [...usados].filter((ambiente) => !AMBIENTES.includes(ambiente)).sort();
  return [...AMBIENTES, ...extras];
}
