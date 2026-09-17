"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { extrairPrazoDeclarado, formatarData } from "@/lib/datas";
import { BottomSheet } from "./BottomSheet";
import type { ChecklistItem, ChecklistPayload, Evento, ListaPayload } from "@/lib/types";

/**
 * Editar a lista já criada (D113): renomear item, tirar, acrescentar e mexer
 * no prazo. Faltava — uma vez criada, a lista era imutável, e item digitado
 * errado só saía apagando a lista inteira.
 *
 * Editar uma lista ainda crua a converte em checklist, que é onde os itens
 * passam a ter vida própria. A conversão segue invisível (D76).
 */
export function EditarLista({
  evento,
  obraId,
  itens,
  onFechar,
}: {
  evento: Evento;
  obraId: string;
  itens: ChecklistItem[];
  onFechar: () => void;
}) {
  const router = useRouter();
  const ehChecklist = evento.kind === "E2_checklist";
  const payload = evento.payload as ChecklistPayload & { date?: string };

  const [linhas, setLinhas] = useState<ChecklistItem[]>(itens);
  const [prazo, setPrazo] = useState(payload.date ?? "");
  const [salvando, setSalvando] = useState(false);

  function editarTexto(indice: number, texto: string) {
    setLinhas((atuais) => atuais.map((item, i) => (i === indice ? { ...item, text: texto } : item)));
  }

  function remover(indice: number) {
    setLinhas((atuais) => atuais.filter((_, i) => i !== indice));
  }

  function acrescentar() {
    setLinhas((atuais) => [...atuais, { text: "", status: "falta" }]);
  }

  async function salvar() {
    const limpos = linhas
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text !== "");

    if (limpos.length === 0 || salvando) return;

    setSalvando(true);
    const supabase = createClient();

    if (ehChecklist) {
      await supabase
        .from("eventos")
        .update({
          payload: { ...payload, items: limpos, date: prazo || undefined },
          edited: true,
        })
        .eq("id", evento.id);
    } else {
      // Lista crua editada nasce como checklist, preservando o vínculo com a
      // mensagem de origem para poder religar se for excluída depois (D73).
      const { data: checklist } = await supabase
        .from("eventos")
        .insert({
          obra_id: obraId,
          kind: "E2_checklist",
          confidence: 1,
          phase_id: evento.phase_id,
          edited: true,
          payload: {
            title: `Lista de ${new Date(evento.received_at).toLocaleDateString("pt-BR")}`,
            sourceListDate: evento.received_at,
            sourceEventId: evento.id,
            items: limpos,
            date: prazo || undefined,
            statusHistory: [],
          },
        })
        .select("id")
        .single();

      if (checklist) {
        await supabase
          .from("eventos")
          .update({
            payload: { ...(evento.payload as ListaPayload), linkedChecklistId: checklist.id },
          })
          .eq("id", evento.id);
      }
    }

    setSalvando(false);
    onFechar();
    router.refresh();
  }

  const prazoSugerido = !prazo ? extrairPrazoDeclarado(evento.raw_text ?? "") : null;

  return (
    <BottomSheet titulo="Editar lista" onFechar={onFechar}>
      <>
        <ul className="mb-3 space-y-2">
          {linhas.map((item, indice) => (
            <li key={indice} className="flex items-center gap-2">
              <input
                value={item.text}
                onChange={(e) => editarTexto(indice, e.target.value)}
                placeholder="Item da lista"
                className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={() => remover(indice)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-alert"
                aria-label={`Tirar ${item.text || "item"}`}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={acrescentar}
          className="mb-4 w-full rounded-card border border-dashed border-line px-3 py-2.5 font-display text-caption font-semibold text-ink-soft"
        >
          + item
        </button>

        <div className="mb-6 space-y-1">
          <label className="text-caption font-semibold text-ink">Prazo da lista (opcional)</label>
          <input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
          {prazoSugerido && (
            <button
              type="button"
              onClick={() => setPrazo(prazoSugerido)}
              className="text-micro text-primary underline"
            >
              usar {formatarData(prazoSugerido)}, que você citou na mensagem
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando || linhas.every((item) => item.text.trim() === "")}
          className="w-full rounded-card bg-primary px-3 py-3 font-display text-body font-semibold text-white disabled:opacity-40"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </>
    </BottomSheet>
  );
}
