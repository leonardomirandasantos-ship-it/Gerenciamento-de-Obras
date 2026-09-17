"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarChecklistDeLista } from "@/lib/aplicarSugestao";
import { extrairItensDeLista } from "@/lib/checklist";
import type { Evento } from "@/lib/types";

export function ListaCard({ evento, obraId }: { evento: Evento; obraId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const itens = extrairItensDeLista(evento.raw_text ?? "");

  async function virarChecklist() {
    setCarregando(true);
    await criarChecklistDeLista(evento, obraId);
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-card border border-dashed border-line bg-surface p-4">
      <div>
        <p className="font-display text-sm font-bold text-ink">
          Lista de {new Date(evento.received_at).toLocaleDateString("pt-BR")}
        </p>
        <p className="text-[11px] text-ink-soft">{itens.length} itens · ainda não é checklist</p>
      </div>

      <ul className="space-y-1">
        {itens.slice(0, 6).map((item, indice) => (
          <li key={`${item}-${indice}`} className="text-sm text-ink-soft">
            {item}
          </li>
        ))}
        {itens.length > 6 && (
          <li className="text-xs text-ink-soft">+{itens.length - 6} itens</li>
        )}
      </ul>

      <button
        type="button"
        onClick={virarChecklist}
        disabled={carregando}
        className="w-full rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {carregando ? "Criando..." : "Virar checklist"}
      </button>
    </div>
  );
}
