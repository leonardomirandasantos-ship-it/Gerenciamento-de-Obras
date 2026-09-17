"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Fase, Obra } from "@/lib/types";

const CORES_DISPONIVEIS = [
  "#9B6A43",
  "#1F5C57",
  "#3A6EA5",
  "#E0913A",
  "#3E8E5A",
  "#C0553B",
  "#6B675E",
];

export function ConfiguracoesObra({ obra, fases }: { obra: Obra; fases: Fase[] }) {
  const router = useRouter();
  const [name, setName] = useState(obra.name);
  const [location, setLocation] = useState(obra.location ?? "");
  const [startDate, setStartDate] = useState(obra.start_date ?? "");
  const [expectedEndDate, setExpectedEndDate] = useState(obra.expected_end_date ?? "");
  const [novaFase, setNovaFase] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function salvarObra() {
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("obras")
      .update({
        name,
        location: location || null,
        start_date: startDate || null,
        expected_end_date: expectedEndDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", obra.id);
    setSalvando(false);
    router.refresh();
  }

  async function renomearFase(fase: Fase, nome: string) {
    const supabase = createClient();
    await supabase.from("fases").update({ name: nome }).eq("id", fase.id);
    router.refresh();
  }

  async function trocarCor(fase: Fase, cor: string) {
    const supabase = createClient();
    await supabase.from("fases").update({ color: cor }).eq("id", fase.id);
    router.refresh();
  }

  async function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= fases.length) return;

    const supabase = createClient();
    const atual = fases[indice];
    const outro = fases[destino];

    await Promise.all([
      supabase.from("fases").update({ order: outro.order }).eq("id", atual.id),
      supabase.from("fases").update({ order: atual.order }).eq("id", outro.id),
    ]);
    router.refresh();
  }

  async function removerFase(fase: Fase) {
    const supabase = createClient();
    await supabase.from("fases").delete().eq("id", fase.id);
    router.refresh();
  }

  async function adicionarFase() {
    const nome = novaFase.trim();
    if (!nome) return;

    const supabase = createClient();
    await supabase.from("fases").insert({
      obra_id: obra.id,
      name: nome,
      color: CORES_DISPONIVEIS[fases.length % CORES_DISPONIVEIS.length],
      order: fases.length,
    });
    setNovaFase("");
    router.refresh();
  }

  async function arquivarObra() {
    const supabase = createClient();
    await supabase.from("obras").update({ status: "archived" }).eq("id", obra.id);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      <section className="space-y-3 rounded-card border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold text-ink">Dados da obra</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-soft">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-2.5 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-soft">Localização</label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-2.5 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="flex gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <label className="text-xs font-medium text-ink-soft">Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-2.5 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <label className="text-xs font-medium text-ink-soft">Previsão</label>
            <input
              type="date"
              value={expectedEndDate}
              onChange={(e) => setExpectedEndDate(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-2.5 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={salvarObra}
          disabled={salvando}
          className="w-full rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </section>

      <section className="space-y-3 rounded-card border border-line bg-surface p-4">
        <div>
          <h2 className="text-sm font-semibold text-ink">Fases da obra</h2>
          <p className="text-xs text-ink-soft">Use as setas para reordenar.</p>
        </div>

        <ul className="space-y-2">
          {fases.map((fase, indice) => (
            <li key={fase.id} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => mover(indice, -1)}
                  disabled={indice === 0}
                  className="text-xs text-ink-soft disabled:opacity-30"
                  aria-label="Subir"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => mover(indice, 1)}
                  disabled={indice === fases.length - 1}
                  className="text-xs text-ink-soft disabled:opacity-30"
                  aria-label="Descer"
                >
                  ▼
                </button>
              </div>

              <input
                type="color"
                value={fase.color}
                onChange={(e) => trocarCor(fase, e.target.value)}
                className="h-7 w-7 shrink-0 cursor-pointer rounded-full border border-line bg-transparent"
                aria-label={`Cor da fase ${fase.name}`}
              />

              <input
                defaultValue={fase.name}
                onBlur={(e) => {
                  const valor = e.target.value.trim();
                  if (valor && valor !== fase.name) renomearFase(fase, valor);
                }}
                className="min-w-0 flex-1 rounded-card border border-line bg-surface px-2 py-2 text-base text-ink outline-none focus:border-primary"
              />

              <button
                type="button"
                onClick={() => removerFase(fase)}
                className="shrink-0 text-xs text-alert"
                aria-label={`Remover ${fase.name}`}
              >
                🗑
              </button>
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <input
            value={novaFase}
            onChange={(e) => setNovaFase(e.target.value)}
            placeholder="Nova fase"
            className="min-w-0 flex-1 rounded-card border border-dashed border-line bg-surface px-2.5 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={adicionarFase}
            className="shrink-0 rounded-card border border-primary px-3 py-2 text-sm font-medium text-primary"
          >
            + Adicionar
          </button>
        </div>
      </section>

      <button type="button" onClick={arquivarObra} className="w-full py-2 text-sm text-alert">
        Arquivar obra
      </button>
    </div>
  );
}
