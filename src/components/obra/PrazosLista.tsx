"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/datas";
import { descricaoDoEvento } from "@/lib/descricao";
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
            className="flex items-center gap-2 rounded-card bg-surface p-3 shadow-card"
          >
            <div className="min-w-0 flex-1">
              <p className="text-body text-ink">{descricaoDoEvento(evento)}</p>
              <span className="chip mt-1" style={{ "--chip": "var(--info)" } as React.CSSProperties}>
                📅 {formatarData(prazo)}
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
          className="flex items-center gap-2 rounded-card bg-surface p-3 shadow-card"
        >
          <div className="min-w-0 flex-1">
            <p className="text-body text-ink">{entrada.item.text}</p>
            <span className="chip mt-1" style={{ "--chip": "var(--info)" } as React.CSSProperties}>
              📅 {formatarData(String(entrada.item.date))}
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
