import type { Evento } from "./types";

export type PagamentoPayload = {
  amount?: number;
  payeeName?: string;
  payeeKeyMasked?: string;
  payeeType?: "prestador" | "fornecedor";
  date?: string;
  [key: string]: unknown;
};

const REGEX_VALOR =
  /r?\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)|(?:paguei|pagamos|pago|adiantei|transferi|depositei|valor|pix(?:\s+de)?)\s*(?:r?\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)/i;

// Nome vem quase sempre em minúscula no uso real ("paguei 200 para armando
// pintor"), então não exigimos maiúscula — no máximo 3 palavras, parando na
// primeira pontuação.
const REGEX_FAVORECIDO =
  /\b(?:pro|pra|para|ao|à|favorecido:?|recebedor:?)\s+([\p{L}][\p{L}à-ÿ]*(?:\s+(?:d[aeo]s?\s+)?[\p{L}][\p{L}à-ÿ]*){0,2})/iu;

/** Palavras que indicam que o que vem depois de "pra/para" não é pessoa. */
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
  "sexta",
  "segunda",
  "dia",
]);

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
  if (achouFavorecido) {
    const bruto = achouFavorecido[1].trim();
    const palavras = bruto.split(/\s+/);
    if (!NAO_E_NOME.has(palavras[0].toLowerCase())) {
      dados.payeeName = palavras
        .map((palavra) =>
          palavra.length <= 2
            ? palavra.toLowerCase()
            : palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase(),
        )
        .join(" ");
    }
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
