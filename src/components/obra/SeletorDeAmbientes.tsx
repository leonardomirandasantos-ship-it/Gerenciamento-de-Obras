"use client";

import { useState } from "react";
import { AMBIENTES } from "@/lib/ambientes";

/**
 * Escolha de ambiente da decisão, com chips e criação livre (D98).
 * O "+ outro" fica aqui, junto da decisão — e não na barra de filtro da aba:
 * filtro para uma tag que nenhuma decisão usa só devolveria tela vazia. A
 * barra de filtro cresce sozinha conforme as tags passam a ser usadas.
 */
export function SeletorDeAmbientes({
  selecionados,
  onChange,
  conhecidos = AMBIENTES,
}: {
  selecionados: string[];
  onChange: (ambientes: string[]) => void;
  conhecidos?: string[];
}) {
  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState("");

  // Os criados por ela entram na lista mesmo não estando entre os conhecidos.
  const opcoes = [...conhecidos, ...selecionados.filter((a) => !conhecidos.includes(a))];

  function alternar(ambiente: string) {
    onChange(
      selecionados.includes(ambiente)
        ? selecionados.filter((atual) => atual !== ambiente)
        : [...selecionados, ambiente],
    );
  }

  function adicionar() {
    const nome = novo.trim();
    if (!nome) return;
    if (!selecionados.includes(nome)) onChange([...selecionados, nome]);
    setNovo("");
    setCriando(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {opcoes.map((ambiente) => {
          const ativo = selecionados.includes(ambiente);
          return (
            <button
              key={ambiente}
              type="button"
              onClick={() => alternar(ambiente)}
              className={`rounded-full border px-3 py-1.5 font-display text-caption font-semibold ${
                ativo ? "border-primary bg-primary text-white" : "border-line text-ink-soft"
              }`}
            >
              {ambiente}
            </button>
          );
        })}

        {!criando && (
          <button
            type="button"
            onClick={() => setCriando(true)}
            className="rounded-full border border-dashed border-line px-3 py-1.5 font-display text-caption font-semibold text-ink-soft"
          >
            + outro
          </button>
        )}
      </div>

      {criando && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionar();
              }
            }}
            placeholder="Ex.: Canil, Adega, Ateliê"
            className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={adicionar}
            className="shrink-0 rounded-card border border-primary px-3 py-2 font-display text-caption font-semibold text-primary"
          >
            Criar
          </button>
        </div>
      )}
    </div>
  );
}
