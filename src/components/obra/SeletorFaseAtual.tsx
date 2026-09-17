"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Fase } from "@/lib/types";

/**
 * Faixa "Fase atual" da conversa (Tela 4). Serve de contexto de captura: o que
 * ela mandar daqui pra frente já nasce com essa fase, sem ela taguear nada.
 */
export function SeletorFaseAtual({
  obraId,
  fases,
  faseAtualId,
}: {
  obraId: string;
  fases: Fase[];
  faseAtualId: string | null;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const faseAtual = fases.find((fase) => fase.id === faseAtualId);

  async function trocar(id: string) {
    const supabase = createClient();
    await supabase
      .from("obras")
      .update({ current_phase_id: id || null })
      .eq("id", obraId);
    setAberto(false);
    router.refresh();
  }

  if (fases.length === 0) return null;

  return (
    <div className="border-b border-line bg-surface-alt px-4 py-2">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-xs"
      >
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: faseAtual?.color ?? "var(--color-unclassified)" }}
        />
        <span className="text-ink-soft">Fase atual:</span>
        <span className="font-medium text-ink">{faseAtual?.name ?? "não definida"}</span>
        <span className="ml-auto text-ink-soft">{aberto ? "▲" : "▼"}</span>
      </button>

      {aberto && (
        <div className="mt-2 flex flex-wrap gap-2">
          {fases.map((fase) => (
            <button
              key={fase.id}
              type="button"
              onClick={() => trocar(fase.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                fase.id === faseAtualId
                  ? "border-primary bg-primary text-white"
                  : "border-line text-ink-soft"
              }`}
            >
              {fase.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
