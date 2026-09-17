"use client";

import { useState } from "react";
import { EditBottomSheet } from "./EditBottomSheet";
import { VerNoChat } from "./VerNoChat";
import { formatarReais, type PagamentoPayload } from "@/lib/pagamento";
import type { Evento, Fase } from "@/lib/types";

export function PagamentosEditaveis({
  obraId,
  pagamentos,
  fases,
}: {
  obraId: string;
  pagamentos: Evento[];
  fases: Fase[];
}) {
  const [editando, setEditando] = useState<Evento | null>(null);

  const ordenados = [...pagamentos].sort(
    (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime(),
  );

  return (
    <>
      <ul className="space-y-2">
        {ordenados.map((evento) => {
          const payload = evento.payload as PagamentoPayload;
          const fase = fases.find((f) => f.id === evento.phase_id);

          return (
            <li key={evento.id} className="space-y-1">
              <button
                type="button"
                onClick={() => setEditando(evento)}
                className="flex w-full items-start justify-between gap-2 rounded-card bg-surface shadow-card p-3 text-left active:bg-surface-alt"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-body font-bold text-ink">
                    {payload.payeeName ?? "Sem favorecido"}
                  </span>
                  <span className="block text-micro text-ink-soft">
                    {new Date(evento.received_at).toLocaleDateString("pt-BR")}
                    {fase ? ` · ${fase.name}` : ""}
                    {" · toque para editar"}
                  </span>
                </span>
                <span className="shrink-0 font-display text-body font-bold text-ink">
                  {payload.amount !== undefined ? formatarReais(payload.amount) : "—"}
                </span>
              </button>
              <div className="flex justify-end pr-1">
                <VerNoChat obraId={obraId} eventoId={evento.id} />
              </div>
            </li>
          );
        })}
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
