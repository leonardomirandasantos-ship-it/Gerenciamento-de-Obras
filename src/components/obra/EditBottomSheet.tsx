"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RÓTULO_TIPO, type Evento, type EventoKind, type Fase } from "@/lib/types";

const TIPOS_SELECIONAVEIS: EventoKind[] = [
  "E1_lista",
  "E2_checklist",
  "E3_decisao",
  "E4_documentacao",
  "E5_documento",
  "E6_comunicacao",
  "E7_pagamento",
  "E8_orcamento",
];

export function EditBottomSheet({
  evento,
  fases,
  onClose,
}: {
  evento: Evento;
  fases: Fase[];
  onClose: () => void;
}) {
  const router = useRouter();
  const pagamentoAtual = evento.payload as { amount?: number; payeeName?: string };
  const [kind, setKind] = useState<EventoKind>(evento.kind);
  const [phaseId, setPhaseId] = useState(evento.phase_id ?? "");
  const [valor, setValor] = useState(pagamentoAtual.amount?.toString() ?? "");
  const [favorecido, setFavorecido] = useState(pagamentoAtual.payeeName ?? "");
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    setCarregando(true);
    const supabase = createClient();

    const payload =
      kind === "E7_pagamento"
        ? {
            ...evento.payload,
            amount: valor ? parseFloat(valor.replace(",", ".")) : undefined,
            payeeName: favorecido || undefined,
          }
        : evento.payload;

    await supabase
      .from("eventos")
      .update({ kind, confidence: 1, phase_id: phaseId || null, payload, edited: true })
      .eq("id", evento.id);
    setCarregando(false);
    onClose();
    router.refresh();
  }

  async function excluir() {
    setCarregando(true);
    const supabase = createClient();
    await supabase.from("eventos").update({ deleted: true }).eq("id", evento.id);
    setCarregando(false);
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onClose}>
      <div
        className="w-full rounded-t-sheet bg-surface p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-4 font-display text-base font-bold text-ink">Editar registro</h2>

        {evento.raw_text && (
          <p className="mb-4 rounded-card bg-surface-alt p-3 text-sm text-ink-soft">
            {evento.raw_text}
          </p>
        )}

        <p className="mb-2 text-sm font-medium text-ink">Tipo</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {TIPOS_SELECIONAVEIS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setKind(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                kind === t ? "border-primary bg-primary-soft text-primary" : "border-line text-ink-soft"
              }`}
            >
              {RÓTULO_TIPO[t]}
            </button>
          ))}
        </div>

        {kind === "E7_pagamento" && (
          <div className="mb-4 flex gap-2">
            <div className="w-28 space-y-1">
              <label className="text-xs font-medium text-ink-soft">Valor (R$)</label>
              <input
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-ink-soft">Favorecido</label>
              <input
                value={favorecido}
                onChange={(e) => setFavorecido(e.target.value)}
                placeholder="Quem recebeu"
                className="w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
              />
            </div>
          </div>
        )}

        <p className="mb-2 text-sm font-medium text-ink">Fase</p>
        <select
          value={phaseId}
          onChange={(e) => setPhaseId(e.target.value)}
          className="mb-6 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">Sem fase</option>
          {fases.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <button
          onClick={salvar}
          disabled={carregando}
          className="mb-3 w-full rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {carregando ? "Salvando..." : "Salvar"}
        </button>

        <button
          onClick={excluir}
          disabled={carregando}
          className="w-full text-center text-sm font-medium text-alert"
        >
          🗑 Excluir registro
        </button>
      </div>
    </div>
  );
}
