"use client";

import { useState } from "react";
import { EditBottomSheet } from "./EditBottomSheet";
import type { Evento, Fase } from "@/lib/types";

/**
 * "editar" avulso para listas montadas no servidor. Abre o mesmo bottom sheet
 * global (D46) — ninguém precisa voltar até a conversa para corrigir um valor.
 */
export function BotaoEditarRegistro({
  evento,
  fases,
  obraId,
}: {
  evento: Evento;
  fases: Fase[];
  obraId: string;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="shrink-0 text-micro text-primary underline"
      >
        editar
      </button>

      {aberto && (
        <EditBottomSheet
          evento={evento}
          fases={fases}
          obraId={obraId}
          onClose={() => setAberto(false)}
        />
      )}
    </>
  );
}
