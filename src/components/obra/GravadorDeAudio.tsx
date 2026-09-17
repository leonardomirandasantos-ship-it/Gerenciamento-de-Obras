"use client";

import { useEffect, useRef, useState } from "react";
import { formatarDuracao, formatoSuportado } from "@/lib/audio";

const LIMITE_SEGUNDOS = 180;

/**
 * Gravação de áudio no composer (D124). Enquanto grava, o composer inteiro dá
 * lugar à barra de gravação — no celular não sobra espaço para os dois, e o
 * gesto fica inequívoco: ou você está escrevendo, ou está falando.
 *
 * Corta em 3 minutos: áudio de obra é recado, não podcast, e arquivo grande
 * demora a subir no 4G do canteiro.
 */
export function GravadorDeAudio({
  onPronto,
  onErro,
  onGravandoChange,
  desabilitado,
}: {
  onPronto: (blob: Blob, mimeType: string, segundos: number) => void;
  onErro: (mensagem: string) => void;
  /** Avisa o composer para sair de cena enquanto ela fala (D130). */
  onGravandoChange?: (gravando: boolean) => void;
  desabilitado?: boolean;
}) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const pedacosRef = useRef<Blob[]>([]);
  const cancelouRef = useRef(false);
  // A duração vai num ref porque `onstop` é registrado uma vez e leria o
  // estado congelado do momento em que a gravação começou (sempre 0).
  const segundosRef = useRef(0);

  useEffect(() => {
    if (!gravando) return;

    const relogio = window.setInterval(() => {
      setSegundos((atual) => {
        const proximo = atual + 1;
        segundosRef.current = proximo;
        if (proximo >= LIMITE_SEGUNDOS) gravadorRef.current?.stop();
        return proximo;
      });
    }, 1000);

    return () => window.clearInterval(relogio);
  }, [gravando]);

  async function comecar() {
    const formato = formatoSuportado();
    if (!formato) {
      onErro("Este navegador não grava áudio. Manda por texto ou foto.");
      return;
    }

    let trilha: MediaStream;
    try {
      trilha = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onErro("Preciso da permissão do microfone para gravar.");
      return;
    }

    const gravador = new MediaRecorder(
      trilha,
      formato.mimeType ? { mimeType: formato.mimeType } : undefined,
    );

    pedacosRef.current = [];
    cancelouRef.current = false;

    gravador.ondataavailable = (evento) => {
      if (evento.data.size > 0) pedacosRef.current.push(evento.data);
    };

    gravador.onstop = () => {
      trilha.getTracks().forEach((t) => t.stop());
      setGravando(false);
      onGravandoChange?.(false);

      const duracao = segundosRef.current;
      setSegundos(0);

      if (cancelouRef.current) return;

      const tipo = gravador.mimeType || formato.mimeType || "audio/webm";
      const blob = new Blob(pedacosRef.current, { type: tipo });
      if (blob.size === 0) {
        onErro("Não saiu áudio nenhum. Tenta de novo?");
        return;
      }
      onPronto(blob, tipo, Math.max(1, duracao));
    };

    gravadorRef.current = gravador;
    gravador.start();
    segundosRef.current = 0;
    setSegundos(0);
    setGravando(true);
    onGravandoChange?.(true);
  }

  function cancelar() {
    cancelouRef.current = true;
    gravadorRef.current?.stop();
  }

  if (!gravando) {
    return (
      <button
        type="button"
        onClick={comecar}
        disabled={desabilitado}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-soft active:bg-surface-alt disabled:opacity-40"
        aria-label="Gravar áudio"
      >
        🎙️
      </button>
    );
  }

  return (
    <div className="flex flex-1 items-center gap-3 rounded-bubble bg-surface-alt px-4 py-2.5">
      <span aria-hidden className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-alert" />
      <span className="font-display text-body font-bold text-ink" aria-live="polite">
        {formatarDuracao(segundos)}
      </span>
      <span className="min-w-0 flex-1 truncate text-micro text-ink-soft">gravando…</span>

      <button
        type="button"
        onClick={cancelar}
        className="shrink-0 px-2 text-caption text-ink-soft"
      >
        cancelar
      </button>
      <button
        type="button"
        onClick={() => gravadorRef.current?.stop()}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-white"
        aria-label="Mandar o áudio"
      >
        ➤
      </button>
    </div>
  );
}
