"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/datas";
import type { ChecklistItem, ChecklistPayload, Evento } from "@/lib/types";

export type ItemDeChecklist = { item: ChecklistItem; checklist: Evento };

export function PrazosLista({
  eventos,
  itens,
}: {
  eventos: Evento[];
  itens: ItemDeChecklist[];
}) {
  const router = useRouter();

  async function concluirEvento(evento: Evento) {
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ payload: { ...evento.payload, done: true } })
      .eq("id", evento.id);
    router.refresh();
  }

  async function tirarPrazoDoEvento(evento: Evento) {
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ payload: { ...evento.payload, date: null } })
      .eq("id", evento.id);
    router.refresh();
  }

  async function atualizarItem(
    { item, checklist }: ItemDeChecklist,
    mudanca: Partial<ChecklistItem>,
  ) {
    const payload = checklist.payload as ChecklistPayload;
    const novos = (payload.items ?? []).map((atual) =>
      atual.text === item.text ? { ...atual, ...mudanca } : atual,
    );

    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ payload: { ...payload, items: novos } })
      .eq("id", checklist.id);
    router.refresh();
  }

  function Acoes({
    onFeito,
    onIgnorar,
  }: {
    onFeito: () => void;
    onIgnorar: () => void;
  }) {
    return (
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={onFeito}
          aria-label="Marcar como feito"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-done text-xs text-done active:bg-primary-soft"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={onIgnorar}
          aria-label="Tirar o prazo"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-xs text-ink-soft active:bg-surface-alt"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {eventos.map((evento) => {
        const prazo = String((evento.payload as { date?: string }).date);
        return (
          <li
            key={evento.id}
            className="flex items-center gap-2 rounded-card border border-line bg-surface p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink">{evento.raw_text ?? "Registro"}</p>
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: "var(--color-info)" }}
              >
                {formatarData(prazo)}
              </span>
            </div>
            <Acoes
              onFeito={() => concluirEvento(evento)}
              onIgnorar={() => tirarPrazoDoEvento(evento)}
            />
          </li>
        );
      })}

      {itens.map((entrada) => (
        <li
          key={`${entrada.checklist.id}-${entrada.item.text}`}
          className="flex items-center gap-2 rounded-card border border-line bg-surface p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm text-ink">{entrada.item.text}</p>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
              style={{ backgroundColor: "var(--color-info)" }}
            >
              {formatarData(String(entrada.item.date))}
            </span>
          </div>
          <Acoes
            onFeito={() => atualizarItem(entrada, { status: "ok" })}
            onIgnorar={() => atualizarItem(entrada, { date: undefined })}
          />
        </li>
      ))}
    </ul>
  );
}
