import { extrairItensDeLista, progressoChecklist } from "./checklist";
import { descricaoDoEvento } from "./descricao";
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

/** Hoje em ISO local (yyyy-mm-dd). Em UTC, perto da meia-noite já é amanhã. */
export function hojeIso(agora = new Date()): string {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export type SituacaoDoPrazo = "atrasado" | "hoje" | "futuro";

export function situacaoDoPrazo(data: string, hoje = hojeIso()): SituacaoDoPrazo {
  if (data < hoje) return "atrasado";
  if (data === hoje) return "hoje";
  return "futuro";
}

/** Como a lista se chama fora do card dela. */
export function tituloDaLista(evento: Evento): string {
  return `Lista de ${new Date(dataDaLista(evento)).toLocaleDateString("pt-BR")}`;
}

export type PrazoAberto = {
  eventoId: string;
  texto: string;
  data: string;
  situacao: SituacaoDoPrazo;
};

/**
 * Tudo que tem data marcada e ainda não foi resolvido — evento com prazo,
 * lista com prazo e item de checklist com prazo, na mesma cesta.
 *
 * Fonte única da verdade do "o que vence": a lista de obras e a aba de
 * pendências contam pela MESMA função, senão um dia a tela inicial diz
 * "2 atrasados" e a aba mostra 3.
 */
export function prazosAbertos(eventos: Evento[], hoje = hojeIso()): PrazoAberto[] {
  const prazos: PrazoAberto[] = [];

  for (const evento of eventos) {
    // Lista tem card próprio e entra no laço de baixo, com os itens dela.
    if (evento.kind === "E1_lista" || evento.kind === "E2_checklist") continue;
    const payload = evento.payload as { date?: string; done?: boolean };
    if (!payload.date || payload.done) continue;
    prazos.push({
      eventoId: evento.id,
      texto: descricaoDoEvento(evento),
      data: payload.date,
      situacao: situacaoDoPrazo(payload.date, hoje),
    });
  }

  for (const lista of listasAbertas(eventos)) {
    const prazo = prazoDaLista(lista);
    const itens = itensDaLista(lista);
    const pendentes = itens.filter((item) => item.status !== "ok");

    // O nome do ITEM, nunca "Lista de 24/09" (D154): o que faz sair de casa é
    // "cal", não a data em que a lista chegou. Item sem data própria herda o
    // prazo da lista; item já feito não cobra mais nada.
    for (const item of pendentes) {
      const data = item.date ?? prazo;
      if (!data) continue;
      prazos.push({
        eventoId: lista.id,
        texto: item.text,
        data,
        situacao: situacaoDoPrazo(data, hoje),
      });
    }

    // Lista com prazo e sem nenhum item legível: ela mesma é a pendência.
    if (prazo && itens.length === 0) {
      prazos.push({
        eventoId: lista.id,
        texto: tituloDaLista(lista),
        data: prazo,
        situacao: situacaoDoPrazo(prazo, hoje),
      });
    }
  }

  return prazos.sort((a, b) => a.data.localeCompare(b.data));
}

/** Lista com todos os itens marcados. Sai da fila principal (D155). */
export function listaConcluida(evento: Evento): boolean {
  const { feitos, total } = progressoChecklist(itensDaLista(evento));
  return total > 0 && feitos === total;
}

/** Quando a lista cobra: o prazo dela ou o do item pendente mais próximo. */
export function venceDaLista(evento: Evento): string | undefined {
  const datas = [
    prazoDaLista(evento),
    ...itensDaLista(evento)
      .filter((item) => item.status !== "ok")
      .map((item) => item.date),
  ].filter(Boolean) as string[];

  return datas.sort()[0];
}

export type Pendencia = {
  /** "lista" tem card com itens; "prazo" é um registro solto com data. */
  tipo: "lista" | "prazo";
  evento: Evento;
  vence?: string;
  /** Lista inteira marcada: vai para o grupo recolhido no fim (D155). */
  concluida: boolean;
};

/**
 * A aba de pendências em UMA fila (D150). Antes havia uma seção "Com prazo"
 * em cima repetindo itens que já apareciam no card da lista embaixo: dois
 * lugares para marcar a mesma coisa feita.
 *
 * Ordem: quem tem data cobra primeiro, do mais atrasado ao mais distante;
 * quem não tem data vem depois, do mais novo para o mais antigo.
 */
export function pendenciasOrdenadas(eventos: Evento[]): Pendencia[] {
  const listas: Pendencia[] = listasAbertas(eventos).map((evento) => ({
    tipo: "lista",
    evento,
    vence: venceDaLista(evento),
    concluida: listaConcluida(evento),
  }));

  const soltas: Pendencia[] = eventos
    .filter((evento) => {
      if (evento.kind === "E1_lista" || evento.kind === "E2_checklist") return false;
      const payload = evento.payload as { date?: string; done?: boolean };
      return Boolean(payload.date) && !payload.done;
    })
    .map((evento) => ({
      tipo: "prazo",
      evento,
      vence: (evento.payload as { date?: string }).date,
      // Registro resolvido some da fila (vira `done`), então nunca chega aqui.
      concluida: false,
    }));

  return [...listas, ...soltas].sort((a, b) => {
    if (a.vence && b.vence) return a.vence.localeCompare(b.vence);
    if (a.vence) return -1;
    if (b.vence) return 1;

    const criacaoA = a.tipo === "lista" ? dataDaLista(a.evento) : a.evento.received_at;
    const criacaoB = b.tipo === "lista" ? dataDaLista(b.evento) : b.evento.received_at;
    return criacaoB.localeCompare(criacaoA);
  });
}
