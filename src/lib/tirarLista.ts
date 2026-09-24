import { createClient } from "./supabase/client";
import type { ChecklistPayload, Evento, ListaPayload } from "./types";

/**
 * Tirar e trazer de volta uma lista das pendências (D165).
 *
 * "Tirar" nunca apagou nada de verdade: a mensagem continua inteira na
 * conversa (D3) e o checklist fica guardado com o que já tinha sido marcado.
 * Faltava só o caminho de volta — e é por isso que ele existe em dois lugares:
 * o desfazer na hora, no lugar do card, e o "voltar para pendências" na bolha
 * da conversa, para quando ela só percebe depois.
 */
export async function tirarDasPendencias(evento: Evento): Promise<void> {
  const supabase = createClient();

  if (evento.kind !== "E2_checklist") {
    await supabase
      .from("eventos")
      .update({ payload: { ...(evento.payload as ListaPayload), dismissed: true } })
      .eq("id", evento.id);
    return;
  }

  await supabase.from("eventos").update({ deleted: true }).eq("id", evento.id);

  const origem = (evento.payload as ChecklistPayload).sourceEventId;
  if (!origem) return;

  const { data: lista } = await supabase
    .from("eventos")
    .select("payload")
    .eq("id", origem)
    .single();
  if (!lista) return;

  // O vínculo é desfeito para a lista poder ser recriada depois (D73).
  const payloadOrigem = { ...((lista.payload ?? {}) as ListaPayload) };
  delete payloadOrigem.linkedChecklistId;
  payloadOrigem.dismissed = true;

  await supabase.from("eventos").update({ payload: payloadOrigem }).eq("id", origem);
}

/** Religa a lista ao checklist e tira a marca de "fora das pendências". */
async function religar(listaId: string, checklistId?: string): Promise<boolean> {
  const supabase = createClient();

  const { data: lista } = await supabase
    .from("eventos")
    .select("payload")
    .eq("id", listaId)
    .single();
  if (!lista) return false;

  const payload = { ...((lista.payload ?? {}) as ListaPayload) };
  delete payload.dismissed;
  if (checklistId) payload.linkedChecklistId = checklistId;

  const { error } = await supabase.from("eventos").update({ payload }).eq("id", listaId);
  return !error;
}

/**
 * Traz a lista de volta com o que já estava marcado: o checklist removido é
 * reaproveitado, não recriado. Recriar do zero perderia os itens feitos, que é
 * justamente o trabalho que ela não quer perder.
 */
export async function voltarParaPendencias(evento: Evento): Promise<boolean> {
  const supabase = createClient();

  if (evento.kind === "E2_checklist") {
    const { error } = await supabase
      .from("eventos")
      .update({ deleted: false })
      .eq("id", evento.id);
    if (error) return false;

    const origem = (evento.payload as ChecklistPayload).sourceEventId;
    return origem ? religar(origem, evento.id) : true;
  }

  const { data: checklist } = await supabase
    .from("eventos")
    .select("id")
    .eq("obra_id", evento.obra_id)
    .eq("kind", "E2_checklist")
    .eq("deleted", true)
    .eq("payload->>sourceEventId", evento.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checklist) {
    await supabase.from("eventos").update({ deleted: false }).eq("id", checklist.id);
  }

  return religar(evento.id, checklist?.id);
}
