"use client";

import { useState } from "react";
import Link from "next/link";
import { AMBIENTES, detectarAmbientes } from "@/lib/ambientes";
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
  const decisoes = eventos.map((evento) => {
    const payload = evento.payload as DecisaoPayload;
    const ambientes =
      payload.environments ??
      (payload.environment
        ? [payload.environment]
        : detectarAmbientes(evento.raw_text ?? ""));
    return { evento, payload, ambientes };
  });

  const filtradas = decisoes.filter(({ evento, payload, ambientes }) => {
    const texto =
      `${payload.title ?? ""} ${payload.value ?? ""} ${evento.raw_text ?? ""} ${ambientes.join(" ")}`.toLowerCase();
    const casaBusca =
      busca.trim() === "" || texto.includes(busca.toLowerCase());
    const casaAmbiente =
      ambiente === "todos" || ambientes.includes(ambiente as never);
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
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por ambiente ou item"
        className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {["todos", ...AMBIENTES].map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => setAmbiente(opcao)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              ambiente === opcao
                ? "border-primary bg-primary text-white"
                : "border-line text-ink-soft"
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
            className="rounded-card border border-line bg-surface p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: "var(--color-primary)" }}
                >
                  decisão
                </span>
                <p className="font-medium text-ink">
                  {payload.title ?? evento.raw_text}
                </p>
                {payload.value && (
                  <p className="text-sm text-ink-soft">{payload.value}</p>
                )}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  {ambientes.map((nome) => (
                    <span
                      key={nome}
                      className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] text-ink-soft"
                    >
                      {nome}
                    </span>
                  ))}
                  <span className="text-[11px] text-ink-soft">
                    {new Date(evento.received_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
              <Link
                href={`/obras/${obraId}/conversa#evento-${evento.id}`}
                className="shrink-0 text-[11px] text-primary underline"
              >
                ver no chat
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {filtradas.length === 0 && (
        <p className="text-sm text-ink-soft">
          Nenhuma decisão encontrada com esse filtro.
        </p>
      )}
    </div>
  );
}
