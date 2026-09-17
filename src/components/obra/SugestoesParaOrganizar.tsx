"use client";

import { useState } from "react";
import { SuggestionCard } from "./SuggestionCard";
import type { Sugestao } from "@/lib/suggestions";
import type { Evento } from "@/lib/types";

/**
 * Sugestões da aba de pendências, uma por vez (D122).
 *
 * Três empilhadas enchiam a tela de cartão verde e empurravam as listas para
 * baixo do scroll — e lista é o que ela vem ver aqui. Além disso o D25 já
 * dizia "no máximo 1 destaque por superfície, nunca empilhar"; a aba não
 * estava cumprindo. As outras continuam a um toque, com a conta na cara.
 */
export function SugestoesParaOrganizar({
  sugestoes,
  eventos,
  obraId,
}: {
  sugestoes: Sugestao[];
  eventos: Map<string, Evento>;
  obraId: string;
}) {
  const [tudo, setTudo] = useState(false);

  const visiveis = tudo ? sugestoes : sugestoes.slice(0, 1);
  const restantes = sugestoes.length - visiveis.length;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-micro font-semibold uppercase tracking-wide text-ink-soft">
          Pra organizar
        </h2>
        <span className="text-micro text-ink-soft">
          {sugestoes.length} {sugestoes.length === 1 ? "item" : "itens"}
        </span>
      </div>

      {visiveis.map((sugestao) => {
        const evento = eventos.get(sugestao.eventoId);
        if (!evento) return null;
        return (
          <SuggestionCard
            key={`${sugestao.caso}-${sugestao.eventoId}`}
            sugestao={sugestao}
            evento={evento}
            obraId={obraId}
            citarMensagem
          />
        );
      })}

      {restantes > 0 && (
        <button
          type="button"
          onClick={() => setTudo(true)}
          className="w-full rounded-card border border-dashed border-line py-2.5 font-display text-caption font-semibold text-ink-soft"
        >
          ver mais {restantes} {restantes === 1 ? "sugestão" : "sugestões"}
        </button>
      )}

      {tudo && sugestoes.length > 1 && (
        <button
          type="button"
          onClick={() => setTudo(false)}
          className="w-full py-2 text-micro text-ink-soft underline"
        >
          mostrar só uma
        </button>
      )}
    </section>
  );
}
