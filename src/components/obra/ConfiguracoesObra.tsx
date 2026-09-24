"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { caminhoDaCapa } from "@/lib/fotoObra";
import { prepararImagem } from "@/lib/imagem";
import { criarFase, excluirFase } from "@/lib/fases";
import type { Fase, Obra } from "@/lib/types";

export function ConfiguracoesObra({
  obra,
  fases,
  capa,
}: {
  obra: Obra;
  fases: Fase[];
  /** URL já assinada da capa atual (o bucket é privado). */
  capa: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(obra.name);
  const [location, setLocation] = useState(obra.location ?? "");
  const [startDate, setStartDate] = useState(obra.start_date ?? "");
  const [expectedEndDate, setExpectedEndDate] = useState(obra.expected_end_date ?? "");
  const [novaFase, setNovaFase] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [trocandoCapa, setTrocandoCapa] = useState(false);
  // Excluir fase era um toque só, sem volta — um esbarrão ao rolar a lista
  // bastava (D147). Agora a lixeira arma e um segundo toque confirma.
  const [faseParaExcluir, setFaseParaExcluir] = useState<string | null>(null);
  const capaInputRef = useRef<HTMLInputElement>(null);

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
    await excluirFase(fase.id);
    setFaseParaExcluir(null);
    router.refresh();
  }

  async function adicionarFase() {
    if (!novaFase.trim()) return;
    await criarFase(obra.id, novaFase, fases.length);
    setNovaFase("");
    router.refresh();
  }

  /** A capa vai para o mesmo bucket privado dos anexos, na pasta do usuário. */
  async function trocarCapa(file: File) {
    setTrocandoCapa(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTrocandoCapa(false);
      return;
    }

    // A capa nunca aparece maior que 48px: subir 4 MB para isso era o pior
    // negócio do app (D168). Vai a miniatura.
    const { cheia, miniatura } = await prepararImagem(file);
    const capa = miniatura ?? cheia;

    const caminho = caminhoDaCapa(user.id, obra.id, capa.name);
    const { error } = await supabase.storage.from("anexos").upload(caminho, capa);

    if (!error) {
      await supabase.from("obras").update({ photo_url: caminho }).eq("id", obra.id);
    }

    setTrocandoCapa(false);
    router.refresh();
  }

  async function removerCapa() {
    setTrocandoCapa(true);
    const supabase = createClient();
    await supabase.from("obras").update({ photo_url: null }).eq("id", obra.id);
    setTrocandoCapa(false);
    router.refresh();
  }

  async function arquivarObra() {
    const supabase = createClient();
    await supabase.from("obras").update({ status: "archived" }).eq("id", obra.id);
    router.push("/");
    router.refresh();
  }

  async function desarquivarObra() {
    const supabase = createClient();
    await supabase.from("obras").update({ status: "active" }).eq("id", obra.id);
    router.refresh();
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <h2 className="font-display text-section font-bold text-ink">Dados da obra</h2>

        {/* Capa da obra: sem foto, fica o mascote — que é padrão, não erro. */}
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
            {capa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capa} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image
                src="/assets/logo/mascote-192.png"
                alt=""
                width={192}
                height={192}
                className="h-11 w-11"
              />
            )}
          </div>

          <input
            ref={capaInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) trocarCapa(file);
              e.target.value = "";
            }}
          />

          <div className="flex min-w-0 flex-1 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => capaInputRef.current?.click()}
              disabled={trocandoCapa}
              className="rounded-card border border-primary px-3 py-2 font-display text-caption font-semibold text-primary disabled:opacity-50"
            >
              {trocandoCapa ? "Enviando..." : capa ? "Trocar foto" : "Escolher foto"}
            </button>
            {capa && (
              <button
                type="button"
                onClick={removerCapa}
                disabled={trocandoCapa}
                className="rounded-card border border-line px-3 py-2 font-display text-caption font-semibold text-ink-soft disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </div>
        </div>

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

      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <div>
          <h2 className="font-display text-section font-bold text-ink">Fases da obra</h2>
          <p className="text-micro text-ink-soft">Use as setas para reordenar.</p>
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

              {faseParaExcluir === fase.id ? (
                <span className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFaseParaExcluir(null)}
                    className="text-micro text-ink-soft"
                  >
                    não
                  </button>
                  <button
                    type="button"
                    onClick={() => removerFase(fase)}
                    className="rounded-card bg-alert px-2 py-1 text-micro font-semibold text-white"
                  >
                    excluir
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setFaseParaExcluir(fase.id)}
                  className="shrink-0 text-xs text-alert"
                  aria-label={`Remover ${fase.name}`}
                >
                  🗑
                </button>
              )}
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

      {obra.status === "archived" ? (
        <div className="space-y-2 rounded-card bg-surface p-4 shadow-card">
          <p className="text-caption text-ink-soft">
            Esta obra está arquivada. Ela sai da lista do dia a dia, mas o histórico continua
            inteiro e você pode reativar quando precisar.
          </p>
          <button
            type="button"
            onClick={desarquivarObra}
            className="w-full rounded-card border border-primary px-3 py-2.5 font-display text-caption font-semibold text-primary"
          >
            Reativar obra
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={arquivarObra}
          className="w-full py-2 font-display text-caption font-semibold text-alert"
        >
          Arquivar obra
        </button>
      )}
    </div>
  );
}
