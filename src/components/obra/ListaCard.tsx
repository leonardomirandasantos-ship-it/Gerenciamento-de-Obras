"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { criarChecklistDeLista } from "@/lib/aplicarSugestao";
import { extrairItensDeLista } from "@/lib/checklist";
import { createClient } from "@/lib/supabase/client";
import { SwipeParaExcluir } from "./SwipeParaExcluir";
import type { Evento } from "@/lib/types";

/**
 * Lista ainda não convertida em checklist. Cada item já é marcável: o primeiro
 * toque num item cria o checklist com aquele item feito, então ela nunca
 * precisa "converter" antes de começar a riscar.
 */
export function ListaCard({ evento, obraId }: { evento: Evento; obraId: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const itens = extrairItensDeLista(evento.raw_text ?? "");

  async function excluir() {
    const supabase = createClient();
    await supabase.from("eventos").update({ deleted: true }).eq("id", evento.id);
    router.refresh();
  }

  async function marcarItem(indice: number) {
    if (carregando) return;
    setCarregando(true);
    await criarChecklistDeLista(evento, obraId, indice);
    setCarregando(false);
    router.refresh();
  }

  async function virarChecklist() {
    setCarregando(true);
    await criarChecklistDeLista(evento, obraId);
    setCarregando(false);
    router.refresh();
  }

  return (
    <SwipeParaExcluir onExcluir={excluir}>
      <div className="space-y-3 rounded-card border border-dashed border-line bg-surface p-4">
        <div>
          <p className="font-display text-sm font-bold text-ink">
            Lista de {new Date(evento.received_at).toLocaleDateString("pt-BR")}
          </p>
          <p className="text-[11px] text-ink-soft">
            {itens.length} {itens.length === 1 ? "item" : "itens"} · toque para ir marcando
          </p>
        </div>

        <ul className="space-y-2">
          {itens.map((item, indice) => (
            <li key={`${item}-${indice}`}>
              <button
                type="button"
                onClick={() => marcarItem(indice)}
                disabled={carregando}
                className="flex w-full items-start gap-2 text-left disabled:opacity-60"
              >
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-pending text-[10px] text-transparent">
                  ✓
                </span>
                <span className="min-w-0 flex-1 text-sm text-ink">{item}</span>
              </button>
            </li>
          ))}
        </ul>

        {itens.length > 1 && (
          <button
            type="button"
            onClick={virarChecklist}
            disabled={carregando}
            className="w-full rounded-card border border-primary px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
          >
            {carregando ? "Criando..." : "Virar checklist"}
          </button>
        )}
      </div>
    </SwipeParaExcluir>
  );
}
