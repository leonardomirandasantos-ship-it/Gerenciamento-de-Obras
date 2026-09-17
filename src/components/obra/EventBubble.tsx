"use client";

import { progressoChecklist } from "@/lib/checklist";
import { ChipTipo } from "./ChipTipo";
import type { ChecklistPayload, DecisaoPayload, Evento } from "@/lib/types";

function ConteudoChecklist({ evento }: { evento: Evento }) {
  const payload = evento.payload as ChecklistPayload;
  const itens = payload.items ?? [];
  const { feitos, total } = progressoChecklist(itens);

  return (
    <div className="space-y-1">
      <p className="font-display text-body font-bold text-ink">{payload.title ?? "Checklist"}</p>
      <p className="text-micro text-ink-soft">
        {feitos}/{total} itens · veja e marque na aba Pendências
      </p>
    </div>
  );
}

function ConteudoDecisao({ evento }: { evento: Evento }) {
  const payload = evento.payload as DecisaoPayload;
  if (!payload.title) {
    return <p className="whitespace-pre-wrap text-body text-ink">{evento.raw_text}</p>;
  }

  return (
    <div className="space-y-0.5">
      <p className="font-display text-body font-bold text-ink">{payload.title}</p>
      {payload.value && <p className="text-caption text-ink-soft">{payload.value}</p>}
    </div>
  );
}

export function EventBubble({ evento, onEditar }: { evento: Evento; onEditar: () => void }) {
  const prazo = (evento.payload as { date?: string }).date;

  return (
    <div className="flex max-w-[85%] flex-col gap-2 rounded-bubble rounded-tl-sm bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <ChipTipo kind={evento.kind} />
        <button type="button" onClick={onEditar} className="text-micro text-ink-soft underline">
          editar
        </button>
      </div>

      {evento.kind === "E2_checklist" ? (
        <ConteudoChecklist evento={evento} />
      ) : evento.kind === "E3_decisao" ? (
        <ConteudoDecisao evento={evento} />
      ) : (
        evento.raw_text && <p className="whitespace-pre-wrap text-body text-ink">{evento.raw_text}</p>
      )}

      {evento.anexos && evento.anexos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {evento.anexos.map((anexo) =>
            anexo.tipo === "foto" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={anexo.id}
                src={anexo.url}
                alt={evento.caption ?? ""}
                className="h-32 w-32 rounded-card object-cover"
              />
            ) : anexo.tipo === "video" ? (
              <video key={anexo.id} src={anexo.url} controls className="h-32 rounded-card" />
            ) : (
              <a
                key={anexo.id}
                href={anexo.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-card border border-line px-3 py-2 text-caption text-primary underline"
              >
                📄 abrir arquivo
              </a>
            ),
          )}
        </div>
      )}

      {evento.caption && <p className="text-micro text-ink-soft">{evento.caption}</p>}

      <div className="flex items-center gap-2 text-micro text-ink-soft">
        <span>{new Date(evento.received_at).toLocaleString("pt-BR")}</span>
        {prazo && (
          <span className="chip" style={{ "--chip": "var(--info)" } as React.CSSProperties}>
            📅 {new Date(`${prazo}T00:00:00`).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </div>
  );
}
