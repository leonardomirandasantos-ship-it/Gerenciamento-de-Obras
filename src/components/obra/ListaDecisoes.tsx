"use client";

import { useState } from "react";
import { ambientesDaObra, ambientesDoEvento } from "@/lib/ambientes";
import { VerNoChat } from "./VerNoChat";
import type { DecisaoPayload, Evento } from "@/lib/types";

export function ListaDecisoes({
  obraId,
  eventos,
}: {
  obraId: string;
  eventos: Evento[];
}) {
  const [busca, setBusca] = useState("");
  const [ambiente, setAmbiente] = useState("todos");

  // O ambiente funciona sozinho: se a decisão ainda não foi "fixada", detecto
  // na hora a partir do texto — fixar só enriquece o que já estava lá.
  const decisoes = eventos.map((evento) => ({
    evento,
    payload: evento.payload as DecisaoPayload,
    ambientes: ambientesDoEvento(evento),
  }));

  // A barra de filtro cresce com a obra: os 7 conhecidos mais os que ela
  // criou. Nenhum filtro aparece sem ter decisão por trás (D98).
  const opcoesDeAmbiente = ambientesDaObra(eventos);

  const filtradas = decisoes.filter(({ evento, payload, ambientes }) => {
    const texto =
      `${payload.title ?? ""} ${payload.value ?? ""} ${evento.raw_text ?? ""} ${ambientes.join(" ")}`.toLowerCase();
    const casaBusca =
      busca.trim() === "" || texto.includes(busca.toLowerCase());
    const casaAmbiente = ambiente === "todos" || ambientes.includes(ambiente);
    return casaBusca && casaAmbiente;
  });

  if (decisoes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-ink-soft">
          Decisões de acabamento fixadas aqui viram consulta rápida.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por ambiente ou item"
        className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["todos", ...opcoesDeAmbiente].map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setAmbiente(opcao)}
            className={`shrink-0 rounded-full border px-4 py-1.5 font-display text-caption font-semibold ${
              ambiente === opcao
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink-soft"
            }`}
          >
            {opcao === "todos" ? "Todas" : opcao}
          </button>
        ))}
      </div>

      <ul className="space-y-2">
        {filtradas.map(({ evento, payload, ambientes }) => (
          <li
            key={evento.id}
            className="rounded-card bg-surface shadow-card p-3"
          >
            <div className="flex items-start gap-3">
              {/* Miniatura só quando a decisão veio com foto: o mockup mostra
                  imagem em toda decisão, mas na prática a maioria é texto —
                  melhor sem miniatura do que com um quadrado cinza. */}
              {(() => {
                const foto = (evento.anexos ?? []).find((anexo) => anexo.tipo === "foto");
                if (!foto) return null;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={foto.thumbUrl ?? foto.url}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-card object-cover"
                  />
                );
              })()}

              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="chip" style={{ "--chip": "var(--primary)" } as React.CSSProperties}>
                  ✓ decisão
                </span>
                <p className="font-display text-body font-bold text-ink">
                  {payload.title ?? evento.raw_text}
                </p>
                {payload.value && <p className="text-caption text-ink-soft">{payload.value}</p>}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {ambientes.map((nome) => (
                    <span
                      key={nome}
                      className="rounded-full bg-surface-alt px-2 py-0.5 text-micro text-ink-soft"
                    >
                      {nome}
                    </span>
                  ))}
                  <span className="text-micro text-ink-soft">
                    {new Date(evento.received_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <VerNoChat obraId={obraId} eventoId={evento.id} />
            </div>
          </li>
        ))}
      </ul>

      {filtradas.length === 0 && (
        <p className="text-caption text-ink-soft">Nenhuma decisão encontrada com esse filtro.</p>
      )}
    </div>
  );
}
