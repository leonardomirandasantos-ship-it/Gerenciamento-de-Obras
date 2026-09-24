import { progressoChecklist } from "./checklist";
import { itensDaLista } from "./pendencias";
import type { ChecklistPayload, Evento } from "./types";

export type ProgressoDaLista = { feitos: number; total: number };

/**
 * A conversa mostra o que ELA mandou (D6). O checklist é registro derivado —
 * nasce quando ela marca o primeiro item — e estava entrando no feed como uma
 * segunda mensagem, logo abaixo da lista original, com os mesmos itens. Marcar
 * três listas enchia a conversa de eco (D158).
 *
 * Checklist órfão continua aparecendo: sem a lista de origem no feed, ele é a
 * única forma de ver aquilo na conversa.
 */
export function eventosDaConversa(eventos: Evento[]): Evento[] {
  const presentes = new Set(eventos.map((evento) => evento.id));

  return eventos.filter((evento) => {
    if (evento.kind !== "E2_checklist") return true;
    const origem = (evento.payload as ChecklistPayload).sourceEventId;
    return !origem || !presentes.has(origem);
  });
}

/**
 * Quanto já foi marcado, por mensagem de origem. É o que devolve o estado para
 * o card antigo: a lista que ela mandou passa a dizer "✓ 2 de 3" ali mesmo.
 */
export function progressoDasListas(eventos: Evento[]): Record<string, ProgressoDaLista> {
  const progressos: Record<string, ProgressoDaLista> = {};

  for (const evento of eventos) {
    if (evento.kind !== "E2_checklist") continue;
    const origem = (evento.payload as ChecklistPayload).sourceEventId;
    if (!origem) continue;
    progressos[origem] = progressoChecklist(itensDaLista(evento));
  }

  return progressos;
}
