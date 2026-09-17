import { createClient } from "./supabase/client";
import { fundirStatus, itensParaChecklist } from "./checklist";
import type { Sugestao } from "./suggestions";
import type { ChecklistPayload, Evento, ListaPayload } from "./types";

async function registrar(
  sugestao: Sugestao,
  obraId: string,
  estado: "accepted" | "ignored",
) {
  const supabase = createClient();
  await supabase.from("sugestoes").insert({
    obra_id: obraId,
    evento_id: sugestao.eventoId,
    caso: sugestao.caso,
    estado,
    trigger_desc: sugestao.gatilho,
    proposta: sugestao.proposta,
  });
}

export async function ignorarSugestao(sugestao: Sugestao, obraId: string) {
  await registrar(sugestao, obraId, "ignored");
}

/**
 * Cria o checklist a partir de uma lista. Usado tanto pela sugestão (caso A)
 * quanto pelo botão direto no card da lista, na aba de pendências.
 */
export async function criarChecklistDeLista(
  evento: Evento,
  obraId: string,
  marcarItem?: number,
) {
  const supabase = createClient();
  const rawText = evento.raw_text ?? "";
  const itens = itensParaChecklist(rawText).map((item, indice) =>
    indice === marcarItem ? { ...item, status: "ok" as const } : item,
  );

  const payload: ChecklistPayload = {
    title: `Lista de ${new Date(evento.received_at).toLocaleDateString("pt-BR")}`,
    sourceListDate: evento.received_at,
    // Guardado para religar a lista se o checklist for excluído depois.
    sourceEventId: evento.id,
    items: itens,
    statusHistory: [],
  };

  const { data: checklist } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind: "E2_checklist",
      confidence: 1,
      phase_id: evento.phase_id,
      payload,
    })
    .select("id")
    .single();

  if (checklist) {
    const payloadLista: ListaPayload = {
      ...(evento.payload as ListaPayload),
      linkedChecklistId: checklist.id,
    };
    await supabase
      .from("eventos")
      .update({ payload: payloadLista })
      .eq("id", evento.id);
  }
}

export async function aplicarSugestao(
  sugestao: Sugestao,
  evento: Evento,
  obraId: string,
  opcao?: string,
  extra?: { amount?: number; payeeName?: string },
) {
  const supabase = createClient();

  if (sugestao.caso === "F_classificar" && opcao) {
    await supabase
      .from("eventos")
      .update({ kind: opcao, confidence: 1, edited: true })
      .eq("id", evento.id);
  }

  if (sugestao.caso === "H_pagamento_incompleto") {
    await supabase
      .from("eventos")
      .update({
        payload: {
          ...evento.payload,
          amount: extra?.amount,
          payeeName: extra?.payeeName,
        },
        edited: true,
      })
      .eq("id", evento.id);
  }

  if (sugestao.caso === "E_prestador") {
    const nome = String(sugestao.dados.payeeName);
    const tipo = opcao === "fornecedor" ? "fornecedor" : "prestador";

    const { data: favorecido } = await supabase
      .from("favorecidos")
      .upsert(
        { obra_id: obraId, name: nome, type: tipo },
        { onConflict: "obra_id,name" },
      )
      .select("id")
      .single();

    await supabase
      .from("eventos")
      .update({
        favorecido_id: favorecido?.id ?? null,
        payload: { ...evento.payload, payeeType: tipo },
      })
      .eq("id", evento.id);
  }

  if (sugestao.caso === "A_checklist") {
    await criarChecklistDeLista(evento, obraId);
  }

  if (sugestao.caso === "B_status") {
    const checklistId = String(sugestao.dados.checklistId);
    const rawText = String(sugestao.dados.rawText ?? evento.raw_text ?? "");

    const { data: checklist } = await supabase
      .from("eventos")
      .select("id, payload")
      .eq("id", checklistId)
      .single();

    if (checklist) {
      const atual = (checklist.payload ?? {}) as ChecklistPayload;
      const { itens, alterados } = fundirStatus(
        atual.items ?? [],
        itensParaChecklist(rawText),
      );

      const payload: ChecklistPayload = {
        ...atual,
        items: itens,
        statusHistory: [
          ...(atual.statusHistory ?? []),
          {
            at: new Date().toISOString(),
            fromEventId: evento.id,
            changed: alterados,
          },
        ],
      };

      await supabase.from("eventos").update({ payload }).eq("id", checklistId);

      const payloadLista: ListaPayload = {
        ...(evento.payload as ListaPayload),
        linkedChecklistId: checklistId,
      };
      await supabase
        .from("eventos")
        .update({ payload: payloadLista })
        .eq("id", evento.id);
    }
  }

  if (sugestao.caso === "C_data") {
    await supabase
      .from("eventos")
      .update({ payload: { ...evento.payload, date: sugestao.dados.date } })
      .eq("id", evento.id);
  }

  if (sugestao.caso === "D_decisao") {
    await supabase
      .from("eventos")
      .update({
        payload: {
          ...evento.payload,
          title: sugestao.dados.title,
          value: sugestao.dados.value,
          environment: sugestao.dados.environment,
          environments: sugestao.dados.environments,
        },
      })
      .eq("id", evento.id);
  }

  await registrar(sugestao, obraId, "accepted");
}
