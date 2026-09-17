"use client";

import { useState } from "react";
import { ChipTipo } from "./ChipTipo";
import { EditBottomSheet } from "./EditBottomSheet";
import type { ChecklistPayload, Evento, Fase } from "@/lib/types";

function descricao(evento: Evento): string {
  if (evento.raw_text) return evento.raw_text;

  const checklist = (evento.payload as ChecklistPayload).title;
  if (checklist) return checklist;

  const arquivo = (evento.payload as { fileName?: string }).fileName;
  if (arquivo) return arquivo;

  if (evento.anexos?.length) return `${evento.anexos.length} anexo(s)`;
  return "Registro";
}

/** Lista de registros tocável — abre o mesmo bottom sheet de edição (D46/D62). */
export function RegistrosEditaveis({
  eventos,
  fases,
}: {
  eventos: Evento[];
  fases: Fase[];
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
              className="flex w-full items-center gap-2 rounded-card border border-line bg-surface p-3 text-left active:bg-surface-alt"
            >
              <ChipTipo kind={evento.kind} />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {descricao(evento)}
              </span>
              <span className="shrink-0 text-[11px] text-ink-soft">
                {new Date(evento.received_at).toLocaleDateString("pt-BR")}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {editando && (
        <EditBottomSheet evento={editando} fases={fases} onClose={() => setEditando(null)} />
      )}
    </>
  );
}
