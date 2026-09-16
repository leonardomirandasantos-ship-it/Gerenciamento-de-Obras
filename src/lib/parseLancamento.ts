export type TipoLancamento = "gasto_reembolsar" | "pagamento_feito" | "atualizacao";

export type LancamentoParseado = {
  tipo: TipoLancamento;
  valor: number | null;
  pessoa: string | null;
  confiante: boolean;
};

const REGEX_VALOR = /r?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i;
const REGEX_REEMBOLSO = /reembols|me deve|a receber/i;
const REGEX_PAGAMENTO = /\bpaguei\b|\bpagou\b|\bpagamento\b|\bpagei\b/i;
const REGEX_PESSOA = /\b(?:pro|pra|para|do|da)\s+([A-ZÀ-Ý][\wà-ÿ]*(?:\s+[A-ZÀ-Ý][\wà-ÿ]*)?)/;

function extrairValor(texto: string): number | null {
  const match = texto.match(REGEX_VALOR);
  if (!match) return null;

  const bruto = match[1].replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const numero = parseFloat(bruto);
  return Number.isNaN(numero) ? null : numero;
}

function extrairPessoa(texto: string): string | null {
  const match = texto.match(REGEX_PESSOA);
  return match ? match[1] : null;
}

export function parseLancamento(texto: string): LancamentoParseado {
  const valor = extrairValor(texto);
  const pessoa = extrairPessoa(texto);

  if (valor === null) {
    return { tipo: "atualizacao", valor: null, pessoa, confiante: true };
  }

  const temReembolso = REGEX_REEMBOLSO.test(texto);
  const temPagamento = REGEX_PAGAMENTO.test(texto);

  if (temReembolso) {
    return { tipo: "gasto_reembolsar", valor, pessoa, confiante: true };
  }

  if (temPagamento) {
    return { tipo: "pagamento_feito", valor, pessoa, confiante: true };
  }

  return { tipo: "gasto_reembolsar", valor, pessoa, confiante: false };
}
