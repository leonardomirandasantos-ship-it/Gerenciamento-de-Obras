import type { ChecklistPayload, Evento } from "./types";

/**
 * Como chamar um registro numa lista. Existe porque a aba de prazos mostrava
 * "Registro" para qualquer coisa sem texto (checklist, anexo), e "Registro"
 * não diz nada sobre o que precisa ser feito.
 */
export function descricaoDoEvento(evento: Evento): string {
  if (evento.raw_text?.trim()) return evento.raw_text;
  if (evento.caption?.trim()) return evento.caption;

  const titulo = (evento.payload as ChecklistPayload).title;
  if (titulo) return titulo;

  const arquivo = (evento.payload as { fileName?: string }).fileName;
  if (arquivo) return arquivo;

  if (evento.anexos?.length) {
    return `${evento.anexos.length} ${evento.anexos.length === 1 ? "anexo" : "anexos"}`;
  }
  return "Registro";
}
