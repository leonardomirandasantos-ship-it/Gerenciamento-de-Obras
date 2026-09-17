"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarChecklistDeLista } from "@/lib/aplicarSugestao";
import { extrairItensDeLista, progressoChecklist } from "@/lib/checklist";
import { formatarData } from "@/lib/datas";
import { createClient } from "@/lib/supabase/client";
import { SwipeParaExcluir } from "./SwipeParaExcluir";
import { VerNoChat } from "./VerNoChat";
import { EditarLista } from "./EditarLista";
import type { ChecklistItem, ChecklistPayload, Evento, ListaPayload } from "@/lib/types";

/**
 * Card único de lista/checklist. Para quem usa, é a mesma coisa: uma lista de
 * itens para ir marcando. A conversão para checklist acontece por baixo, no
 * primeiro toque — antes o card "sumia" de uma seção e reaparecia em outra no
 * fim da página, e parecia que não tinha criado nada.
 */
export function CardDeLista({ evento, obraId }: { evento: Evento; obraId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [editando, setEditando] = useState(false);

  const ehChecklist = evento.kind === "E2_checklist";
  const payload = evento.payload as ChecklistPayload;

  const itens: ChecklistItem[] = ehChecklist
    ? (payload.items ?? [])
    : extrairItensDeLista(evento.raw_text ?? "").map((text) => ({
        text,
        status: "falta" as const,
      }));

  const { feitos, total } = progressoChecklist(itens);
  const data = ehChecklist ? (payload.sourceListDate ?? evento.received_at) : evento.received_at;

  async function alternarItem(indice: number) {
    if (carregando) return;
    setCarregando(true);
    const supabase = createClient();

    if (!ehChecklist) {
      await criarChecklistDeLista(evento, obraId, indice);
    } else {
      const novos = itens.map((item, i) =>
        i === indice
          ? { ...item, status: item.status === "ok" ? ("falta" as const) : ("ok" as const) }
          : item,
      );
      await supabase
        .from("eventos")
        .update({ payload: { ...payload, items: novos } })
        .eq("id", evento.id);
    }

    setCarregando(false);
    router.refresh();
  }

  async function concluirTudo() {
    setCarregando(true);
    const supabase = createClient();

    if (!ehChecklist) {
      await criarChecklistDeLista(evento, obraId, "todos");
    } else {
      const novos = itens.map((item) => ({ ...item, status: "ok" as const }));
      await supabase
        .from("eventos")
        .update({ payload: { ...payload, items: novos } })
        .eq("id", evento.id);
    }

    setCarregando(false);
    router.refresh();
  }

  /** Sai das pendências; a mensagem original continua na conversa (D3). */
  async function tirarDaLista() {
    setCarregando(true);
    const supabase = createClient();

    if (ehChecklist) {
      await supabase.from("eventos").update({ deleted: true }).eq("id", evento.id);

      if (payload.sourceEventId) {
        const { data: origem } = await supabase
          .from("eventos")
          .select("payload")
          .eq("id", payload.sourceEventId)
          .single();

        if (origem) {
          const payloadOrigem = { ...((origem.payload ?? {}) as ListaPayload) };
          delete payloadOrigem.linkedChecklistId;
          payloadOrigem.dismissed = true;
          await supabase
            .from("eventos")
            .update({ payload: payloadOrigem })
            .eq("id", payload.sourceEventId);
        }
      }
    } else {
      await supabase
        .from("eventos")
        .update({ payload: { ...(evento.payload as ListaPayload), dismissed: true } })
        .eq("id", evento.id);
    }

    setCarregando(false);
    router.refresh();
  }

  const tudoFeito = total > 0 && feitos === total;
  const prazoDaLista = (evento.payload as { date?: string }).date;

  return (
    <SwipeParaExcluir onExcluir={tirarDaLista} rotulo="Tirar">
      <div className="space-y-3 rounded-card bg-surface shadow-card p-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate font-display text-body font-bold text-ink">
              Lista de {new Date(data).toLocaleDateString("pt-BR")}
            </p>
            <span className="shrink-0 font-display text-caption font-bold text-done">
              {feitos}/{total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-done transition-all"
              style={{ width: total > 0 ? `${(feitos / total) * 100}%` : "0%" }}
            />
          </div>
        </div>

        <ul className="space-y-2">
          {itens.map((item, indice) => (
            <li key={`${item.text}-${indice}`}>
              <button
                type="button"
                onClick={() => alternarItem(indice)}
                disabled={carregando}
                className="flex w-full items-start gap-2 text-left disabled:opacity-60"
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] ${
                    item.status === "ok"
                      ? "border-done bg-done text-white"
                      : "border-pending text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-body ${
                      item.status === "ok" ? "text-ink-soft line-through" : "text-ink"
                    }`}
                  >
                    {item.text}
                  </span>
                  {item.note && <span className="block text-micro text-ink-soft">{item.note}</span>}
                  {item.date && (
                    <span
                      className="chip mt-1"
                      style={{ "--chip": "var(--info)" } as React.CSSProperties}
                    >
                      📅 {formatarData(item.date)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>

        {prazoDaLista && (
          <span className="chip" style={{ "--chip": "var(--info)" } as React.CSSProperties}>
            📅 {formatarData(prazoDaLista)}
          </span>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-micro text-primary underline"
          >
            editar
          </button>
          <VerNoChat
            obraId={obraId}
            eventoId={ehChecklist ? (payload.sourceEventId ?? evento.id) : evento.id}
          />
        </div>

        <div className="flex gap-2 border-t border-line pt-3">
          <button
            type="button"
            onClick={concluirTudo}
            disabled={carregando || tudoFeito}
            className="flex-1 rounded-card border border-done px-3 py-2.5 font-display text-caption font-semibold text-done disabled:opacity-40"
          >
            {tudoFeito ? "Tudo feito" : "✓ Concluir tudo"}
          </button>
          <button
            type="button"
            onClick={tirarDaLista}
            disabled={carregando}
            className="flex-1 rounded-card border border-line px-3 py-2.5 font-display text-caption font-semibold text-alert disabled:opacity-40"
          >
            🗑 Tirar da lista
          </button>
        </div>
      </div>

      {editando && (
        <EditarLista
          evento={evento}
          obraId={obraId}
          itens={itens}
          onFechar={() => setEditando(false)}
        />
      )}
    </SwipeParaExcluir>
  );
}
