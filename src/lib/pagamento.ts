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
  /r?\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)|(?:paguei|pago|valor|pix(?:\s+de)?)\s*(?:r?\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)/i;
const REGEX_FAVORECIDO =
  /\b(?:pro|pra|para|favorecido:?|recebedor:?)\s+([A-ZÀ-Ý][\wà-ÿ]*(?:\s+(?:d[aeo]s?\s+)?[A-ZÀ-Ý][\wà-ÿ]*)*)/;

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
    dados.payeeName = achouFavorecido[1].trim();
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
