import { COR_TIPO, RÓTULO_TIPO, type EventoKind } from "@/lib/types";

export function ChipTipo({ kind }: { kind: EventoKind }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
      style={{ backgroundColor: COR_TIPO[kind] }}
    >
      {RÓTULO_TIPO[kind]}
    </span>
  );
}
