"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatarData } from "@/lib/datas";
import { descricaoDoEvento } from "@/lib/descricao";
import { situacaoDoPrazo } from "@/lib/pendencias";
import { MiniaturaDoEvento } from "./MiniaturaDoEvento";
import { VerNoChat } from "./VerNoChat";
import type { Evento } from "@/lib/types";

/**
 * Registro solto com data — "pagar o Vilmar dia 30". Não é lista, então não
 * tem itens para marcar: resolve inteiro ou perde o prazo.
 *
 * O toque some com o card na hora e a gravação acontece por baixo (D152).
 * Esperar o banco para só então apagar a linha fazia o check parecer travado.
 */
export function CardDePrazo({ evento, obraId }: { evento: Evento; obraId: string }) {
  const router = useRouter();
  const [sumiu, setSumiu] = useState(false);

  const prazo = String((evento.payload as { date?: string }).date);
  const situacao = situacaoDoPrazo(prazo);
  const cobrando = situacao !== "futuro";

  async function resolver(mudanca: { done: true } | { date: null }) {
    setSumiu(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("eventos")
      .update({ payload: { ...evento.payload, ...mudanca } })
      .eq("id", evento.id);

    if (error) {
      setSumiu(false);
      return;
    }
    router.refresh();
  }

  if (sumiu) return null;

  return (
    <li className="flex items-center gap-2 rounded-card bg-surface p-3 shadow-card">
      <MiniaturaDoEvento evento={evento} />

      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-body text-ink">{descricaoDoEvento(evento)}</p>
        <div className="flex items-center gap-3">
          <span
            className="chip"
            style={{ "--chip": cobrando ? "var(--alert)" : "var(--info)" } as React.CSSProperties}
          >
            📅 {situacao === "atrasado" ? "atrasado · " : situacao === "hoje" ? "hoje · " : ""}
            {formatarData(prazo)}
          </span>
          <VerNoChat obraId={obraId} eventoId={evento.id} />
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => resolver({ done: true })}
          aria-label="Marcar como feito"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-done text-xs text-done active:bg-primary-soft"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => resolver({ date: null })}
          aria-label="Tirar o prazo"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-xs text-ink-soft active:bg-surface-alt"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
