import { extrairItensDeLista, progressoChecklist } from "./checklist";
import type { ChecklistItem, ChecklistPayload, Evento, ListaPayload } from "./types";

/** Data que ordena o card: o checklist herda a data da lista que o originou. */
export function dataDaLista(evento: Evento): string {
  if (evento.kind === "E2_checklist") {
    return (evento.payload as ChecklistPayload).sourceListDate ?? evento.received_at;
  }
  return evento.received_at;
}

/** Itens do card, venha ele de um checklist ou de uma lista ainda crua. */
export function itensDaLista(evento: Evento): ChecklistItem[] {
  if (evento.kind === "E2_checklist") {
    return (evento.payload as ChecklistPayload).items ?? [];
  }
  return extrairItensDeLista(evento.raw_text ?? "").map((text) => ({
    text,
    status: "falta" as const,
  }));
}

/** Prazo da lista, quando ela tem um. */
export function prazoDaLista(evento: Evento): string | undefined {
  return (evento.payload as { date?: string }).date;
}

/**
 * Listas abertas da obra, checklist e lista crua na mesma cesta (D76).
 * Uma lista só sai daqui quando é tirada explicitamente (`dismissed`).
 * O filtro tolera vínculo órfão — dado antigo apontando para checklist que
 * não existe mais voltaria a sumir das duas pontas (D73).
 */
export function listasAbertas(eventos: Evento[]): Evento[] {
  const checklists = eventos.filter((evento) => evento.kind === "E2_checklist");
  const idsDeChecklists = new Set(checklists.map((checklist) => checklist.id));

  const listasSoltas = eventos.filter((evento) => {
    if (evento.kind !== "E1_lista") return false;
    const payload = evento.payload as ListaPayload;
    if (payload.dismissed) return false;
    return !payload.linkedChecklistId || !idsDeChecklists.has(payload.linkedChecklistId);
  });

  // Lista com prazo sobe, na ordem do prazo (D117): a priorização acontece
  // AQUI, no mesmo card, em vez de repetir o card numa seção "com prazo".
  return [...checklists, ...listasSoltas].sort((a, b) => {
    const prazoA = prazoDaLista(a);
    const prazoB = prazoDaLista(b);

    if (prazoA && prazoB) return prazoA.localeCompare(prazoB);
    if (prazoA) return -1;
    if (prazoB) return 1;
    return dataDaLista(b).localeCompare(dataDaLista(a));
  });
}

/**
 * Quanto ainda falta comprar/resolver. Conta também a lista que ainda não foi
 * tocada: antes só somava item de checklist, então uma lista recém-chegada
 * aparecia na aba de pendências mas o contador dizia zero.
 */
export function itensAComprar(eventos: Evento[]): number {
  return listasAbertas(eventos).reduce((soma, lista) => {
    const { feitos, total } = progressoChecklist(itensDaLista(lista));
    return soma + (total - feitos);
  }, 0);
}
