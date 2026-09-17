import type { Evento } from "./types";

export type PagamentoPayload = {
  amount?: number;
  payeeName?: string;
  payeeKeyMasked?: string;
  payeeType?: "prestador" | "fornecedor";
  date?: string;
  [key: string]: unknown;
};

const NUMERO = String.raw`\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?`;

const VERBO_DE_PAGAMENTO =
  String.raw`paguei|pagamos|pago|adiantei|transferi|depositei|comprei|compramos|gastei|gastamos|quitei|acertei|valor|comprovante(?:\s+de)?|pix(?:\s+de)?`;

/**
 * Unidade logo depois do número quer dizer QUANTIDADE, não dinheiro:
 * "comprei 3 sacos de cimento" não são R$ 3. Sem esta trava, quantidade de
 * material entrava somando no total do dash.
 */
const UNIDADES =
  String.raw`sacos?|sacas?|barras?|kg|quilos?|un|unidades?|pe[çc]as?|caixas?|cx|rolos?|m[²³23]?|metros?|mm|cm|litros?|milheiros?|tijolos?|blocos?|l[aâ]minas?`;

/**
 * Aceita algumas palavras de enchimento entre o verbo e o número
 * ("paguei **mais** 300 pro Alex"), mas só letras — assim o preenchimento
 * nunca engole outro número.
 */
const REGEX_VALOR = new RegExp(
  String.raw`r?\$\s*(${NUMERO})` +
    // O (?!\d) impede o regex de recuar para um pedaço do número ("10" viraria
    // "1" só para escapar da trava de unidade).
    String.raw`|(?:${VERBO_DE_PAGAMENTO})\s+(?:[a-zà-ÿ]{1,7}\s+){0,2}?(?:r?\$\s*)?(${NUMERO})(?!\d)(?!\s*(?:${UNIDADES})\b)`,
  "i",
);

// Nome vem quase sempre em minúscula no uso real ("paguei 200 para armando
// pintor"), então não exigimos maiúscula — no máximo 3 palavras, parando na
// primeira pontuação.
const NOME = String.raw`[\p{L}][\p{L}à-ÿ]*(?:\s+(?:d[aeo]s?\s+)?[\p{L}][\p{L}à-ÿ]*){0,2}`;

/**
 * Artigo entra no regex como opcional (e não conta como palavra do nome),
 * senão "para a construção Bom Lar" perdia o "Lar" ao sobrar só 3 palavras.
 */
const ARTIGO_OPCIONAL = String.raw`(?:(?:os?|as?|uma?s?)\s+)?`;

/** "paguei 200 para armando pintor" — quem recebeu vem depois da preposição. */
const REGEX_FAVORECIDO = new RegExp(
  String.raw`\b(?:pro|pra|para|ao|à|favorecido:?|recebedor:?)\s+${ARTIGO_OPCIONAL}(${NOME})`,
  "iu",
);

/**
 * Compra em estabelecimento: "comprei 200 de tijolo **na** construção Bom Lar".
 * Só é consultada quando a preposição forte não achou nada, porque "na/no"
 * também aparece em lugar e tempo ("na obra", "na sexta") — daí o NAO_E_NOME.
 */
const REGEX_LOCAL_DA_COMPRA = new RegExp(
  String.raw`\b(?:n[ao]s?|em|d[ao]s?)\s+${ARTIGO_OPCIONAL}(${NOME})`,
  "iu",
);

/** Palavras que indicam que o que vem depois da preposição não é favorecido. */
const NAO_E_NOME = new Set([
  "comprar",
  "pagar",
  "buscar",
  "levar",
  "fazer",
  "terminar",
  "entregar",
  "obra",
  "casa",
  "material",
  "cimento",
  "hoje",
  "amanha",
  "amanhã",
  "ontem",
  "segunda",
  "terca",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "sábado",
  "domingo",
  "dia",
  "semana",
  "mes",
  "mês",
  "parte",
  "vista",
  "entrada",
  "total",
  "conta",
  "frente",
  "cima",
  "baixo",
]);

/**
 * Artigo antes do nome é o jeito natural de falar ("paguei pro **o** Valdir",
 * "adiantei pra **a** dona Maria"), mas entrava no nome: "o Valdir" e "Valdir"
 * viravam duas pessoas no resumo, porque o agrupamento é pelo nome.
 */
const ARTIGOS = new Set(["o", "a", "os", "as", "um", "uma", "ao", "à"]);

/** Palavras que só ligam a frase: se sobraram no fim, não são do nome. */
const CONECTORES = new Set([
  "das",
  "dos",
  "via",
  "por",
  "pelo",
  "pela",
  "com",
  "e",
  "no",
  "na",
  "em",
  "pra",
  "pro",
  "para",
  "de",
  "do",
  "da",
]);

function formatarNome(bruto: string): string | null {
  const palavras = bruto.trim().split(/\s+/);

  while (palavras.length > 1 && ARTIGOS.has(palavras[0].toLowerCase())) {
    palavras.shift();
  }
  while (palavras.length > 1 && CONECTORES.has(palavras[palavras.length - 1].toLowerCase())) {
    palavras.pop();
  }
  if (palavras.length === 0 || NAO_E_NOME.has(palavras[0].toLowerCase())) return null;
  return palavras
    .map((palavra) =>
      palavra.length <= 2 || CONECTORES.has(palavra.toLowerCase())
        ? palavra.toLowerCase()
        : palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase(),
    )
    .join(" ");
}

function paraNumero(bruto: string): number | null {
  const normalizado = bruto.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const numero = parseFloat(normalizado);
  return Number.isNaN(numero) ? null : numero;
}

export function extrairDadosPagamento(texto: string): PagamentoPayload {
  const dados: PagamentoPayload = {};

  const achouValor = texto.match(REGEX_VALOR);
  if (achouValor) {
    const bruto = achouValor[1] ?? achouValor[2];
    const valor = bruto ? paraNumero(bruto) : null;
    if (valor !== null) dados.amount = valor;
  }

  const achouFavorecido = texto.match(REGEX_FAVORECIDO);
  const nome = achouFavorecido ? formatarNome(achouFavorecido[1]) : null;

  if (nome) {
    dados.payeeName = nome;
  } else {
    const achouLocal = texto.match(REGEX_LOCAL_DA_COMPRA);
    const local = achouLocal ? formatarNome(achouLocal[1]) : null;
    if (local) dados.payeeName = local;
  }

  return dados;
}

export function normalizarFavorecido(nome: string): string {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type Favorecido = {
  id: string;
  obra_id: string;
  name: string;
  type: "prestador" | "fornecedor" | null;
};

export type ResumoFavorecido = {
  nome: string;
  favorecidoId: string | null;
  tipo: "prestador" | "fornecedor" | null;
  total: number;
  pagamentos: number;
  desde: string | null;
  eventos: Evento[];
};

/**
 * O sumário financeiro não depende de cadastro (Fluxo 2, caso E, camada 2):
 * agrupa pelo nome do favorecido que vier no pagamento; se houver cadastro,
 * só enriquece com o tipo.
 */
export function agruparPorFavorecido(
  pagamentos: Evento[],
  favorecidos: Favorecido[],
): ResumoFavorecido[] {
  const porChave = new Map<string, ResumoFavorecido>();

  for (const evento of pagamentos) {
    const payload = evento.payload as PagamentoPayload;
    const nome = payload.payeeName?.trim();
    if (!nome) continue;

    const chave = normalizarFavorecido(nome);
    const cadastro = favorecidos.find((f) => normalizarFavorecido(f.name) === chave);

    const atual = porChave.get(chave) ?? {
      nome,
      favorecidoId: cadastro?.id ?? null,
      tipo: cadastro?.type ?? payload.payeeType ?? null,
      total: 0,
      pagamentos: 0,
      desde: null,
      eventos: [],
    };

    atual.total += payload.amount ?? 0;
    atual.pagamentos += 1;
    atual.eventos.push(evento);
    if (!atual.desde || new Date(evento.received_at) < new Date(atual.desde)) {
      atual.desde = evento.received_at;
    }

    porChave.set(chave, atual);
  }

  return [...porChave.values()].sort((a, b) => b.total - a.total);
}

export function totalPago(pagamentos: Evento[]): number {
  return pagamentos.reduce(
    (soma, evento) => soma + ((evento.payload as PagamentoPayload).amount ?? 0),
    0,
  );
}

export function formatarReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
