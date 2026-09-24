"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { progressoChecklist } from "@/lib/checklist";
import { voltarParaPendencias } from "@/lib/tirarLista";
import { formatarDuracao } from "@/lib/audio";
import { ChipTipo } from "./ChipTipo";
import { BotaoEncaminhar } from "./BotaoEncaminhar";
import { BotaoReentenderAudio } from "./BotaoReentenderAudio";
import type { ContextoDaObra } from "@/lib/capturar";
import type { AudioPayload, ChecklistPayload, DecisaoPayload, Evento, ListaPayload } from "@/lib/types";

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

/**
 * O áudio guarda o original E o que foi entendido (D124). O play fica porque
 * transcrição de canteiro erra — com barulho, jargão e nome próprio — e aí o
 * áudio é a fonte para conferir. Os registros derivados ficam listados junto,
 * senão ela não saberia que aquele áudio virou três coisas.
 */
function ConteudoAudio({
  evento,
  obraId,
  faseAtualId,
  contexto,
}: {
  evento: Evento;
  obraId?: string;
  faseAtualId?: string | null;
  contexto?: ContextoDaObra;
}) {
  const payload = evento.payload as AudioPayload;
  const audio = (evento.anexos ?? []).find((anexo) => anexo.tipo === "audio");
  const derivados = payload.derivedEventIds?.length ?? 0;

  return (
    <div className="space-y-2">
      {audio && (
        <audio controls preload="none" src={audio.url} className="h-10 w-full max-w-xs">
          <track kind="captions" />
        </audio>
      )}

      {payload.transcript ? (
        <p className="whitespace-pre-wrap text-body text-ink">{payload.transcript}</p>
      ) : (
        <p className="text-caption italic text-ink-soft">
          {payload.durationSeconds
            ? `Áudio de ${formatarDuracao(payload.durationSeconds)} — sem transcrição`
            : "Áudio sem transcrição"}
        </p>
      )}

      {derivados > 0 && (
        <p className="text-micro text-ink-soft">
          ✓ virou {derivados} {derivados === 1 ? "registro" : "registros"} aqui embaixo
        </p>
      )}

      {/* Sem transcrição, o entendimento falhou — e falha de modelo é comum. */}
      {!payload.transcript && audio && obraId && contexto && (
        <BotaoReentenderAudio
          obraId={obraId}
          eventoAudioId={evento.id}
          urlDoAudio={audio.url}
          faseAtualId={faseAtualId ?? null}
          segundos={payload.durationSeconds ?? 0}
          contexto={contexto}
        />
      )}
    </div>
  );
}

/**
 * A lista que saiu das pendências continua aqui, inteira, e a volta mora na
 * própria mensagem (D165): recriar mandando de novo deixaria duas mensagens
 * iguais na conversa, e o app com duas verdades sobre a mesma lista. O que
 * estava marcado volta junto — o checklist é reaproveitado, não recriado.
 */
function VoltarParaPendencias({ evento }: { evento: Evento }) {
  const router = useRouter();
  const [voltando, setVoltando] = useState(false);

  async function voltar() {
    setVoltando(true);
    const deuCerto = await voltarParaPendencias(evento);
    if (!deuCerto) setVoltando(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={voltar}
      disabled={voltando}
      className="font-display text-micro font-semibold text-primary underline disabled:opacity-50"
    >
      {voltando ? "voltando…" : "voltar para pendências"}
    </button>
  );
}

export function EventBubble({
  evento,
  onEditar,
  obraId,
  faseAtualId,
  contexto,
  progresso,
}: {
  evento: Evento;
  onEditar: () => void;
  obraId?: string;
  faseAtualId?: string | null;
  contexto?: ContextoDaObra;
  /** Quanto já foi marcado da lista que esta mensagem originou (D158). */
  progresso?: { feitos: number; total: number };
}) {
  const prazo = (evento.payload as { date?: string }).date;
  const foraDasPendencias =
    evento.kind === "E1_lista" && Boolean((evento.payload as ListaPayload).dismissed);
  const vindoDeAudio = Boolean(
    (evento.payload as { sourceCaptureEventId?: string; sourceAudioEventId?: string })
      .sourceCaptureEventId ??
      (evento.payload as { sourceAudioEventId?: string }).sourceAudioEventId,
  );

  // Áudio não se encaminha: o valor está na transcrição, que já está no texto.
  const temAnexo = (evento.anexos ?? []).some((anexo) => anexo.tipo !== "audio");

  // Legenda pronta para o WhatsApp: poupa ela de digitar o valor de novo.
  const pagamento = evento.payload as { amount?: number; payeeName?: string };
  const legendaParaEncaminhar =
    evento.kind === "E7_pagamento" && pagamento.amount !== undefined
      ? `Comprovante — ${pagamento.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}${pagamento.payeeName ? ` para ${pagamento.payeeName}` : ""}`
      : (evento.caption ?? undefined);

  return (
    <div className="flex max-w-[85%] flex-col gap-2 rounded-bubble rounded-tl-sm bg-surface p-3 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <ChipTipo kind={evento.kind} />
        <span className="flex shrink-0 items-center gap-3">
          {temAnexo && (
            <BotaoEncaminhar evento={evento} descricao={legendaParaEncaminhar} />
          )}
          <button type="button" onClick={onEditar} className="text-micro text-ink-soft underline">
            editar
          </button>
        </span>
      </div>

      {evento.kind === "E9_audio" ? (
        <ConteudoAudio
          evento={evento}
          obraId={obraId}
          faseAtualId={faseAtualId}
          contexto={contexto}
        />
      ) : evento.kind === "E2_checklist" ? (
        <ConteudoChecklist evento={evento} />
      ) : evento.kind === "E3_decisao" ? (
        <ConteudoDecisao evento={evento} />
      ) : (
        evento.raw_text && <p className="whitespace-pre-wrap text-body text-ink">{evento.raw_text}</p>
      )}

      {evento.anexos && evento.anexos.length > 0 && evento.kind !== "E9_audio" && (
        <div className="flex flex-wrap gap-2">
          {evento.anexos.map((anexo) =>
            anexo.tipo === "foto" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={anexo.id}
                src={anexo.thumbUrl ?? anexo.url}
                alt={evento.caption ?? ""}
                loading="lazy"
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

      <div className="flex flex-wrap items-center gap-2 text-micro text-ink-soft">
        <span>{new Date(evento.received_at).toLocaleString("pt-BR")}</span>
        {vindoDeAudio && <span>· 🎙️ do áudio</span>}
        {/* O estado volta para a mensagem que ela mandou, em vez de virar uma
          segunda mensagem no feed (D158). */}
        {foraDasPendencias && (
          <>
            <span>· fora das pendências</span>
            <VoltarParaPendencias evento={evento} />
          </>
        )}
        {progresso && progresso.total > 0 && (
          <span
            className="chip"
            style={
              {
                "--chip":
                  progresso.feitos === progresso.total ? "var(--done)" : "var(--pending)",
              } as React.CSSProperties
            }
          >
            {progresso.feitos === progresso.total
              ? "✓ tudo feito"
              : `✓ ${progresso.feitos} de ${progresso.total}`}
          </span>
        )}
        {prazo && (
          <span className="chip" style={{ "--chip": "var(--info)" } as React.CSSProperties}>
            📅 {new Date(`${prazo}T00:00:00`).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
    </div>
  );
}
