"use client";

import { useState } from "react";
import { EventBubble } from "./EventBubble";
import { ComposerInput } from "./ComposerInput";
import { EditBottomSheet } from "./EditBottomSheet";
import { SuggestionCard } from "./SuggestionCard";
import type { Sugestao } from "@/lib/suggestions";
import type { Evento, Fase } from "@/lib/types";

export function ConversaClient({
  obraId,
  eventos,
  fases,
  sugestoes,
}: {
  obraId: string;
  eventos: Evento[];
  fases: Fase[];
  sugestoes: Sugestao[];
}) {
  const [editando, setEditando] = useState<Evento | null>(null);

  // Anti-irritação (D25): no máximo 1 destaque por superfície, nunca empilhar.
  const sugestaoAtiva = sugestoes.length > 0 ? sugestoes[sugestoes.length - 1] : null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {eventos.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-3xl">🏗️👋</div>
          <p className="font-display text-base font-bold text-ink">Comece jogando tudo aqui</p>
          <p className="max-w-xs text-sm text-ink-soft">
            Mande uma foto, uma lista de material ou um recado. A gente organiza pra você.
          </p>
          <div className="flex gap-2 text-xs text-ink-soft">
            <span className="rounded-full border border-line px-2 py-1">📷 Foto</span>
            <span className="rounded-full border border-line px-2 py-1">📝 Lista</span>
            <span className="rounded-full border border-line px-2 py-1">🎙️ Áudio</span>
          </div>
        </div>
      ) : (
        <ul className="flex-1 space-y-3 overflow-y-auto p-4">
          {eventos.map((evento) => (
            <li key={evento.id} id={`evento-${evento.id}`} className="space-y-2">
              <EventBubble evento={evento} onEditar={() => setEditando(evento)} />
              {sugestaoAtiva?.eventoId === evento.id && (
                <SuggestionCard sugestao={sugestaoAtiva} evento={evento} obraId={obraId} />
              )}
            </li>
          ))}
        </ul>
      )}

      <ComposerInput obraId={obraId} />

      {editando && (
        <EditBottomSheet evento={editando} fases={fases} onClose={() => setEditando(null)} />
      )}
    </div>
  );
}
