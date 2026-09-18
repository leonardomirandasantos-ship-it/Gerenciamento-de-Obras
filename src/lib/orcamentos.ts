import { createClient } from "./supabase/client";
import type { Evento } from "./types";

export type OrcamentoPayload = {
  fileName?: string;
  supplier?: string;
  payeeName?: string;
  product?: string;
  amount?: number;
  category?: string;
  items?: string[];
  /** Ela fechou com esse fornecedor (D148). Não é gasto: ver `marcarFechado`. */
  closed?: boolean;
};

/** Texto de fala e captura antiga gravam `payeeName`; a IA do PDF grava os dois. */
export function fornecedorDoOrcamento(payload: OrcamentoPayload): string | undefined {
  return payload.supplier || payload.payeeName || undefined;
}

/**
 * "Fechei com esse" é um ESTADO do orçamento, não um gasto (D148). Converter o
 * orçamento em gasto contaria o dinheiro duas vezes quando o comprovante do PIX
 * chegar, e erraria o valor quando o pagamento for parcelado. O gasto continua
 * vindo do pagamento de verdade.
 */
export async function marcarFechado(evento: Evento, fechado: boolean): Promise<boolean> {
  const supabase = createClient();
  const payload = { ...(evento.payload as OrcamentoPayload) };
  if (fechado) payload.closed = true;
  else delete payload.closed;

  const { error } = await supabase.from("eventos").update({ payload }).eq("id", evento.id);
  return !error;
}
