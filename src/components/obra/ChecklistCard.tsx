"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { progressoChecklist } from "@/lib/checklist";
import { SwipeParaExcluir } from "./SwipeParaExcluir";
import type { ChecklistPayload, Evento } from "@/lib/types";

export function ChecklistCard({ evento }: { evento: Evento }) {
  const router = useRouter();
  const payload = evento.payload as ChecklistPayload;
  const [itens, setItens] = useState(payload.items ?? []);
  const { feitos, total } = progressoChecklist(itens);

  async function excluir() {
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ deleted: true })
      .eq("id", evento.id);
    router.refresh();
  }

  async function alternar(indice: number) {
    const novos = itens.map((item, i) =>
      i === indice
        ? {
            ...item,
            status: item.status === "ok" ? ("falta" as const) : ("ok" as const),
          }
        : item,
    );
    setItens(novos);

    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ payload: { ...payload, items: novos } })
      .eq("id", evento.id);
    router.refresh();
  }

  return (
    <SwipeParaExcluir onExcluir={excluir}>
      <div className="space-y-3 rounded-card border border-line bg-surface p-4">
        <div className="space-y-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-display text-sm font-bold text-ink">
              {payload.title ?? "Checklist"}
            </p>
            <span className="shrink-0 text-xs text-ink-soft">
              {feitos}/{total}
            </span>
          </div>
          <p className="text-[11px] text-ink-soft">
            da conversa de{" "}
            {new Date(
              payload.sourceListDate ?? evento.received_at,
            ).toLocaleDateString("pt-BR")}
          </p>
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
                onClick={() => alternar(indice)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                    item.status === "ok"
                      ? "border-done bg-done text-white"
                      : "border-pending text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-sm ${
                      item.status === "ok"
                        ? "text-ink-soft line-through"
                        : "text-ink"
                    }`}
                  >
                    {item.text}
                  </span>
                  {item.note && (
                    <span className="block text-xs text-ink-soft">
                      {item.note}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </SwipeParaExcluir>
  );
}
