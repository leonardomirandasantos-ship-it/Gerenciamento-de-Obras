"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reentenderAudio, type ContextoDaObra } from "@/lib/capturar";

/**
 * "Tentar entender de novo" na bolha do áudio (D139).
 *
 * O 503 "high demand" do modelo é frequente — apareceu várias vezes nos testes.
 * Sem repetir, a única saída era apagar o áudio e regravar no canteiro, o que é
 * absurdo: o arquivo nunca se perdeu, só o entendimento. O áudio continua sendo
 * o registro original (D3) e a transcrição é derivada; derivado se refaz.
 */
export function BotaoReentenderAudio({
  obraId,
  eventoAudioId,
  urlDoAudio,
  faseAtualId,
  segundos,
  contexto,
}: {
  obraId: string;
  eventoAudioId: string;
  urlDoAudio: string;
  faseAtualId: string | null;
  segundos: number;
  contexto: ContextoDaObra;
}) {
  const router = useRouter();
  const [estado, setEstado] = useState<"parado" | "tentando">("parado");
  const [aviso, setAviso] = useState<string | null>(null);

  async function tentar() {
    setEstado("tentando");
    setAviso(null);

    const resultado = await reentenderAudio({
      obraId,
      eventoAudioId,
      urlDoAudio,
      faseAtualId,
      segundos,
      contexto,
    });

    setEstado("parado");
    if (resultado.aviso) {
      setAviso(resultado.aviso);
      setTimeout(() => setAviso(null), 5000);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={tentar}
        disabled={estado === "tentando"}
        className="rounded-card border border-primary px-3 py-1.5 font-display text-micro font-semibold text-primary disabled:opacity-50"
      >
        {estado === "tentando" ? "entendendo…" : "↻ tentar entender de novo"}
      </button>
      {aviso && <p className="text-micro text-alert">{aviso}</p>}
    </div>
  );
}
