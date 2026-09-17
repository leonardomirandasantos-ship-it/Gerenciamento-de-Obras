"use client";

import { useRef, useState } from "react";

const LARGURA_ABERTO = 104;
const LIMITE_ABRIR = 40;
const LIMITE_JOGAR_FORA = 180;
const FOLGA_ATE_VIRAR_ARRASTO = 8;

/**
 * Excluir arrastando, em duas etapas de propósito (mobile-first, D58):
 *
 * 1. arrasta um pouco e solta → o card trava aberto mostrando "Excluir",
 *    então é preciso confirmar no botão;
 * 2. arrasta até o fim ("joga fora") → exclui direto.
 *
 * Sem isso um arrasto acidental apagava registro, que é o pior erro possível
 * aqui. O ponteiro só é capturado depois que o gesto vira arrasto horizontal
 * de verdade — capturar no toque impedia clicar nos itens dentro do card.
 */
export function SwipeParaExcluir({
  children,
  onExcluir,
  rotulo = "Excluir",
}: {
  children: React.ReactNode;
  onExcluir: () => void | Promise<void>;
  rotulo?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const inicio = useRef<{ x: number; y: number } | null>(null);

  async function excluir() {
    setExcluindo(true);
    await onExcluir();
    setExcluindo(false);
  }

  function encerrar() {
    const total = deslocamento;
    const eraArrasto = arrastando;

    setArrastando(false);
    setDeslocamento(0);
    inicio.current = null;

    if (!eraArrasto) return;

    if (total <= -LIMITE_JOGAR_FORA) {
      excluir();
      return;
    }
    if (total <= -LIMITE_ABRIR) {
      setAberto(true);
      return;
    }
    if (total >= LIMITE_ABRIR) {
      setAberto(false);
    }
  }

  const base = aberto ? -LARGURA_ABERTO : 0;
  const posicao = arrastando ? Math.min(0, base + deslocamento) : base;
  const progresso = Math.min(Math.abs(posicao) / LARGURA_ABERTO, 1);

  return (
    <div className="relative overflow-hidden rounded-card">
      <button
        type="button"
        onClick={excluir}
        disabled={excluindo || !aberto}
        aria-label={rotulo}
        className="absolute inset-y-0 right-0 flex w-[104px] items-center justify-center text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-alert)", opacity: progresso }}
      >
        🗑 {rotulo}
      </button>

      <div
        className={`relative touch-pan-y ${arrastando ? "select-none" : ""}`}
        style={{
          transform: `translateX(${posicao}px)`,
          transition: arrastando ? undefined : "transform 180ms ease-out",
          opacity: excluindo ? 0.5 : 1,
        }}
        onPointerDown={(e) => {
          inicio.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!inicio.current) return;
          const dx = e.clientX - inicio.current.x;
          const dy = e.clientY - inicio.current.y;

          if (!arrastando) {
            // Só vira arrasto quando o movimento é claramente horizontal —
            // senão atrapalharia o scroll e os toques nos itens.
            if (Math.abs(dx) < FOLGA_ATE_VIRAR_ARRASTO || Math.abs(dx) <= Math.abs(dy)) return;
            setArrastando(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }

          setDeslocamento(dx);
        }}
        onPointerUp={encerrar}
        onPointerCancel={encerrar}
      >
        {children}
      </div>
    </div>
  );
}
