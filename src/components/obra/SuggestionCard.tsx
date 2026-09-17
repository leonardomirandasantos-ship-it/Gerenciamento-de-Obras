"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { aplicarSugestao, ignorarSugestao } from "@/lib/aplicarSugestao";
import { CampoFavorecido } from "./CampoFavorecido";
import type { Sugestao } from "@/lib/suggestions";
import type { Evento } from "@/lib/types";

export function SuggestionCard({
  sugestao,
  evento,
  obraId,
}: {
  sugestao: Sugestao;
  evento: Evento;
  obraId: string;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [mostrarPorque, setMostrarPorque] = useState(false);
  const [valor, setValor] = useState(
    sugestao.dados.amount !== undefined ? String(sugestao.dados.amount) : "",
  );
  const [favorecido, setFavorecido] = useState(String(sugestao.dados.payeeName ?? ""));

  async function aceitar(opcao?: string) {
    setCarregando(true);
    await aplicarSugestao(sugestao, evento, obraId, opcao, {
      amount: valor ? parseFloat(valor.replace(",", ".")) : undefined,
      payeeName: favorecido || undefined,
    });
    setCarregando(false);
    router.refresh();
  }

  async function ignorar() {
    setCarregando(true);
    await ignorarSugestao(sugestao, obraId);
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="max-w-[85%] space-y-2 rounded-card bg-primary-soft p-4">
      <p className="text-micro text-ink-soft">{sugestao.gatilho}</p>
      <p className="font-display text-body font-semibold text-ink">{sugestao.proposta}</p>

      {sugestao.entradaPagamento && (
        <div className="flex gap-2">
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="R$"
            className="w-24 rounded-card border border-line bg-surface px-3 py-2 text-base text-ink outline-none focus:border-primary"
          />
          <div className="min-w-0 flex-1">
            <CampoFavorecido obraId={obraId} valor={favorecido} onChange={setFavorecido} />
          </div>
        </div>
      )}

      {sugestao.opcoes && (
        <div className="flex flex-wrap gap-2">
          {sugestao.opcoes.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => aceitar(opcao.valor)}
              disabled={carregando}
              className="rounded-full border border-primary bg-surface px-3 py-2 font-display text-caption font-semibold text-primary disabled:opacity-50"
            >
              {opcao.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        {!sugestao.opcoes && (
          <button
            type="button"
            onClick={() => aceitar(sugestao.acaoAlternativaLabel ? "prestador" : undefined)}
            disabled={carregando}
            className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {carregando ? "..." : sugestao.acaoLabel}
          </button>
        )}

        {sugestao.acaoAlternativaLabel && (
          <button
            type="button"
            onClick={() => aceitar("fornecedor")}
            disabled={carregando}
            className="rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
          >
            {sugestao.acaoAlternativaLabel}
          </button>
        )}

        <button
          type="button"
          onClick={ignorar}
          disabled={carregando}
          className="px-2 py-2 text-xs text-ink-soft"
        >
          agora não
        </button>

        <button
          type="button"
          onClick={() => setMostrarPorque((v) => !v)}
          className="ml-auto text-[11px] text-ink-soft underline"
        >
          por quê?
        </button>
      </div>

      {mostrarPorque && <p className="text-[11px] text-ink-soft">{sugestao.porque}</p>}
    </div>
  );
}
