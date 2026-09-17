"use client";

import { useState } from "react";
import { ChipTipo } from "./ChipTipo";
import { EditBottomSheet } from "./EditBottomSheet";
import { descricaoDoEvento } from "@/lib/descricao";
import type { Evento, Fase } from "@/lib/types";

/** Lista de registros tocável — abre o mesmo bottom sheet de edição (D46/D62). */
export function RegistrosEditaveis({
  eventos,
  fases,
  obraId,
}: {
  eventos: Evento[];
  fases: Fase[];
  obraId: string;
}) {
  const [editando, setEditando] = useState<Evento | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {eventos.map((evento) => (
          <li key={evento.id}>
            <button
              type="button"
              onClick={() => setEditando(evento)}
              className="flex w-full items-center gap-2 rounded-card bg-surface shadow-card p-3 text-left active:bg-surface-alt"
            >
              <ChipTipo kind={evento.kind} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {descricaoDoEvento(evento)}
              </span>
              <span className="shrink-0 text-[11px] text-ink-soft">
                {new Date(evento.received_at).toLocaleDateString("pt-BR")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {editando && (
        <EditBottomSheet
          evento={editando}
          fases={fases}
          obraId={obraId}
          onClose={() => setEditando(null)}
        />
      )}
    </>
  );
}
