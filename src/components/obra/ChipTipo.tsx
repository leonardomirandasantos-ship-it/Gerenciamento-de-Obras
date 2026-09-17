import { COR_TIPO, RÓTULO_TIPO, type EventoKind } from "@/lib/types";

/** Chip do styleguide: fundo tingido + texto na cor, nunca preenchimento sólido. */
export function ChipTipo({ kind }: { kind: EventoKind }) {
  return (
    <span className="chip" style={{ "--chip": COR_TIPO[kind] } as React.CSSProperties}>
      {RÓTULO_TIPO[kind]}
    </span>
  );
}
