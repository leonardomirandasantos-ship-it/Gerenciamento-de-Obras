"use client";

import { RÓTULO_TIPO, COR_TIPO, type Evento } from "@/lib/types";

export function EventBubble({
  evento,
  onEditar,
}: {
  evento: Evento;
  onEditar: () => void;
}) {
  const naoClassificado = evento.kind === "unclassified";

  return (
    <div className="group flex max-w-md flex-col gap-2 rounded-bubble rounded-tl-sm bg-surface p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          style={{ backgroundColor: naoClassificado ? "var(--color-unclassified)" : COR_TIPO[evento.kind] }}
        >
          {RÓTULO_TIPO[evento.kind]}
        </span>
        <button
          type="button"
          onClick={onEditar}
          className="text-[11px] text-ink-soft underline opacity-0 group-hover:opacity-100"
        >
          editar
        </button>
      </div>

      {evento.raw_text && <p className="whitespace-pre-wrap text-sm text-ink">{evento.raw_text}</p>}

      {evento.anexos && evento.anexos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {evento.anexos.map((a) =>
            a.tipo === "foto" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={a.id} src={a.url} alt="" className="h-32 w-32 rounded-card object-cover" />
            ) : a.tipo === "video" ? (
              <video key={a.id} src={a.url} controls className="h-32 rounded-card" />
            ) : (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-card border border-line px-3 py-2 text-xs text-primary underline"
              >
                📄 abrir arquivo
              </a>
            ),
          )}
        </div>
      )}

      <p className="text-[11px] text-ink-soft">
        {new Date(evento.received_at).toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
