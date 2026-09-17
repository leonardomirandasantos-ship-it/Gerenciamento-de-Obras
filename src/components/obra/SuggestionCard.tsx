"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aplicarSugestao, ignorarSugestao } from "@/lib/aplicarSugestao";
import type { Sugestao } from "@/lib/suggestions";
import type { Evento } from "@/lib/types";

export function SuggestionCard({
  sugestao,
  evento,
  obraId,
}: {
  sugestao: Sugestao;
  evento: Evento;
  obraId: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [mostrarPorque, setMostrarPorque] = useState(false);

  async function aceitar(variante?: "prestador" | "fornecedor") {
    setCarregando(true);
    await aplicarSugestao(sugestao, evento, obraId, variante);
    setCarregando(false);
    router.refresh();
  }

  async function ignorar() {
    setCarregando(true);
    await ignorarSugestao(sugestao, obraId);
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="max-w-md space-y-2 rounded-card bg-primary-soft p-3">
      <p className="text-[11px] text-ink-soft">{sugestao.gatilho}</p>
      <p className="text-sm font-medium text-ink">{sugestao.proposta}</p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => aceitar(sugestao.acaoAlternativaLabel ? "prestador" : undefined)}
          disabled={carregando}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {carregando ? "..." : sugestao.acaoLabel}
        </button>

        {sugestao.acaoAlternativaLabel && (
          <button
            type="button"
            onClick={() => aceitar("fornecedor")}
            disabled={carregando}
            className="rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary disabled:opacity-50"
          >
            {sugestao.acaoAlternativaLabel}
          </button>
        )}
        <button
          type="button"
          onClick={ignorar}
          disabled={carregando}
          className="px-2 py-1.5 text-xs text-ink-soft"
        >
          agora não
        </button>
        <button
          type="button"
          onClick={() => setMostrarPorque((v) => !v)}
          className="ml-auto text-[11px] text-ink-soft underline"
        >
          por quê?
        </button>
      </div>

      {mostrarPorque && <p className="text-[11px] text-ink-soft">{sugestao.porque}</p>}
    </div>
  );
}
