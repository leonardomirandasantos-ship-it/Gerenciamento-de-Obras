"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

const LIMITE_FECHAR = 100;

/**
 * Bottom sheet global (D46). Fecha tocando fora ou **arrastando para baixo**
 * pela alça — comportamento esperado em app de celular (D58). O arraste fica
 * só na alça/título para não brigar com o scroll do conteúdo.
 *
 * Vai por portal no <body> de propósito (D116): dentro de um ancestral com
 * `transform` — o card com arraste para excluir, por exemplo — o `fixed`
 * passa a se posicionar em relação AO CARD, e o sheet abria do tamanho do
 * card, crescendo para cima. Portal tira o sheet de qualquer contexto.
 */
export function BottomSheet({
  titulo,
  children,
  onFechar,
}: {
  titulo: string;
  children: React.ReactNode;
  onFechar: () => void;
}) {
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicioY = useRef<number | null>(null);

  function encerrar() {
    if (deslocamento > LIMITE_FECHAR) {
      onFechar();
      return;
    }
    setDeslocamento(0);
    setArrastando(false);
    inicioY.current = null;
  }

  const sheet = (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30" onClick={onFechar}>
      <div
        className="safe-bottom flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-surface shadow-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: `translateY(${deslocamento}px)`,
          transition: arrastando ? undefined : "transform 180ms ease-out",
        }}
      >
        <div
          className="shrink-0 touch-none select-none px-4 pb-1 pt-3"
          onPointerDown={(e) => {
            inicioY.current = e.clientY;
            setArrastando(true);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (inicioY.current === null) return;
            setDeslocamento(Math.max(0, e.clientY - inicioY.current));
          }}
          onPointerUp={encerrar}
          onPointerCancel={encerrar}
        >
          <div className="mx-auto h-1.5 w-12 rounded-full bg-line" />
          <div className="mt-3 flex items-center justify-between">
            <h2 className="font-display text-base font-bold text-ink">{titulo}</h2>
            <button
              type="button"
              onClick={onFechar}
              aria-label="Fechar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft"
            >
              ✕
            </button>
          </div>
        </div>

        {/* O conteúdo rola por dentro: com muitos itens a lista precisa de
            scroll próprio, senão o sheet estoura a tela. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );

  // Sem estado de "montado": o sheet só é renderizado depois de um toque, e
  // por isso nunca aparece no HTML do servidor — a guarda basta.
  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
}
