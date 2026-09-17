"use client";

import { useRef, useState } from "react";

const LIMITE_EXCLUSAO = 96;

/**
 * Arrasta para o lado e exclui, como nas conversas do WhatsApp (mobile-first,
 * D58). Usa Pointer Events, então o mesmo código atende toque e mouse — o que
 * também deixa o gesto testável fora do celular.
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
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const inicioX = useRef<number | null>(null);

  async function excluir() {
    setExcluindo(true);
    await onExcluir();
    setExcluindo(false);
  }

  function encerrar() {
    if (Math.abs(deslocamento) >= LIMITE_EXCLUSAO) {
      excluir();
    }
    setDeslocamento(0);
    setArrastando(false);
    inicioX.current = null;
  }

  const progresso = Math.min(Math.abs(deslocamento) / LIMITE_EXCLUSAO, 1);

  return (
    <div className="relative overflow-hidden rounded-card">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-end px-4 text-sm font-semibold text-white"
        style={{ backgroundColor: "var(--color-alert)", opacity: progresso }}
      >
        🗑 {rotulo}
      </div>

      <div
        className={`relative touch-pan-y ${arrastando ? "select-none" : ""}`}
        style={{
          transform: `translateX(${deslocamento}px)`,
          transition: arrastando ? undefined : "transform 150ms ease-out",
          opacity: excluindo ? 0.5 : 1,
        }}
        onPointerDown={(e) => {
          inicioX.current = e.clientX;
          setArrastando(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (inicioX.current === null) return;
          const delta = e.clientX - inicioX.current;
          // só arrasta para a esquerda
          setDeslocamento(Math.min(0, delta));
        }}
        onPointerUp={encerrar}
        onPointerCancel={encerrar}
      >
        {children}
      </div>
    </div>
  );
}
