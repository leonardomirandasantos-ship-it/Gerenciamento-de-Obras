"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { EventBubble } from "./EventBubble";
import { ComposerInput } from "./ComposerInput";
import { EditBottomSheet } from "./EditBottomSheet";
import { SuggestionCard } from "./SuggestionCard";
import { ChipTipo } from "./ChipTipo";
import { SeletorFaseAtual } from "./SeletorFaseAtual";
import type { ContextoDaObra } from "@/lib/capturar";
import type { Sugestao } from "@/lib/suggestions";
import type { Evento, EventoKind, Fase } from "@/lib/types";

/** `nota` substitui o "enviando…" quando a espera tem outro motivo. */
export type Pendente = { id: string; texto: string; kind: EventoKind; nota?: string };

export function ConversaClient({
  obraId,
  eventos,
  fases,
  sugestoes,
  faseAtualId,
  contexto,
}: {
  obraId: string;
  eventos: Evento[];
  fases: Fase[];
  sugestoes: Sugestao[];
  faseAtualId: string | null;
  contexto: ContextoDaObra;
}) {
  const [editando, setEditando] = useState<Evento | null>(null);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [longeDoFim, setLongeDoFim] = useState(false);
  const feedRef = useRef<HTMLUListElement>(null);

  // Quando o servidor devolve os eventos já salvos, os otimistas saem de cena.
  // Ajuste durante o render (e não em efeito) para não disparar render em
  // cascata: a bolha "enviando…" sairia um quadro depois da real entrar.
  const [eventosVistos, setEventosVistos] = useState(eventos);
  if (eventos !== eventosVistos) {
    setEventosVistos(eventos);
    setPendentes([]);
  }

  // Anti-irritação (D25): no máximo 1 destaque por superfície, nunca empilhar.
  const sugestaoAtiva = sugestoes.length > 0 ? sugestoes[sugestoes.length - 1] : null;

  const irParaOFim = useCallback((comportamento: ScrollBehavior = "auto") => {
    const feed = feedRef.current;
    if (!feed) return;
    feed.scrollTo({ top: feed.scrollHeight, behavior: comportamento });
  }, []);

  // Conversa abre na mensagem mais recente, como qualquer chat (D97).
  // Exceção: chegando por "ver no chat", o alvo é a mensagem do link.
  useEffect(() => {
    const alvo = window.location.hash;
    if (alvo.startsWith("#evento-")) {
      document.querySelector(alvo)?.scrollIntoView({ block: "center" });
      return;
    }
    irParaOFim();
  }, [irParaOFim]);

  // Mensagem nova desce a conversa — a não ser que ela esteja lendo o
  // histórico mais acima, aí não tiro o texto de baixo dos olhos dela.
  useEffect(() => {
    if (!longeDoFim) irParaOFim();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventos, pendentes.length]);

  function aoRolar() {
    const feed = feedRef.current;
    if (!feed) return;
    const distanciaDoFim = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    setLongeDoFim(distanciaDoFim > 240);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <SeletorFaseAtual obraId={obraId} fases={fases} faseAtualId={faseAtualId} />

      {eventos.length === 0 && pendentes.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          {/* Mascote oficial — empty state (09_ASSETS) */}
          <Image
            src="/assets/logo/mascote-512.png"
            alt=""
            width={512}
            height={512}
            className="h-36 w-36"
          />
          <p className="font-display text-title font-bold text-ink">Comece jogando tudo aqui</p>
          <p className="max-w-xs text-caption text-ink-soft">
            Mande uma foto, uma lista de material ou um recado. A gente organiza pra você.
          </p>
          <div className="flex gap-2 text-micro text-ink-soft">
            <span className="rounded-full border border-line px-3 py-1.5">📷 Foto</span>
            <span className="rounded-full border border-line px-3 py-1.5">📝 Lista</span>
            <span className="rounded-full border border-line px-3 py-1.5">🎙️ Áudio</span>
          </div>
        </div>
      ) : (
        <ul ref={feedRef} onScroll={aoRolar} className="flex-1 space-y-3 overflow-y-auto p-4">
          {eventos.map((evento) => (
            <li key={evento.id} id={`evento-${evento.id}`} className="space-y-2">
              <EventBubble
                evento={evento}
                onEditar={() => setEditando(evento)}
                obraId={obraId}
                faseAtualId={faseAtualId}
                contexto={contexto}
              />
              {sugestaoAtiva?.eventoId === evento.id && (
                <SuggestionCard sugestao={sugestaoAtiva} evento={evento} obraId={obraId} />
              )}
            </li>
          ))}

          {/* "Recebido" imediato (D1): aparece antes de o banco confirmar. */}
          {pendentes.map((pendente) => (
            <li key={pendente.id}>
              <div className="flex max-w-[85%] flex-col gap-2 rounded-bubble rounded-tl-sm bg-surface p-3 opacity-60 shadow-card">
                <ChipTipo kind={pendente.kind} />
                <p className="whitespace-pre-wrap text-body text-ink">{pendente.texto}</p>
                <p className="text-micro text-ink-soft">{pendente.nota ?? "enviando…"}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {longeDoFim && (
        <div className="pointer-events-none relative">
          <button
            type="button"
            onClick={() => irParaOFim("smooth")}
            className="pointer-events-auto absolute bottom-2 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-surface text-lg text-primary shadow-card"
            aria-label="Ir para a mensagem mais recente"
          >
            ↓
          </button>
        </div>
      )}

      <ComposerInput
        obraId={obraId}
        faseAtualId={faseAtualId}
        contexto={contexto}
        onPendente={(pendente) => setPendentes((atuais) => [...atuais, pendente])}
      />

      {editando && (
        <EditBottomSheet
          evento={editando}
          fases={fases}
          obraId={obraId}
          onClose={() => setEditando(null)}
        />
      )}
    </div>
  );
}
