"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { criarFase } from "@/lib/fases";
import { BotaoEncaminhar } from "./BotaoEncaminhar";
import { EditarFase } from "./EditarFase";
import type { Evento, Fase } from "@/lib/types";

type FotoItem = {
  evento: Evento;
  url: string;
  anexoId: string;
};

function VisorFoto({
  foto,
  fotos,
  fases,
  obraId,
  onFechar,
  onTrocar,
}: {
  foto: FotoItem;
  fotos: FotoItem[];
  fases: Fase[];
  obraId: string;
  onFechar: () => void;
  onTrocar: (item: FotoItem) => void;
}) {
  const router = useRouter();
  const [legenda, setLegenda] = useState(foto.evento.caption ?? "");
  const [faseId, setFaseId] = useState(foto.evento.phase_id ?? "");
  const [salvando, setSalvando] = useState(false);
  const [criandoFase, setCriandoFase] = useState(false);
  const [nomeDaFase, setNomeDaFase] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  // Fase salva no toque: era um <select> embaixo da legenda e o usuário
  // acabava escrevendo o nome da fase na legenda por engano.
  // `null` tira a foto de qualquer fase (D142) — antes, uma vez posta numa
  // fase, a foto não voltava mais para "sem fase".
  async function salvarFase(novaFase: string | null) {
    setFaseId(novaFase ?? "");
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ phase_id: novaFase, edited: true })
      .eq("id", foto.evento.id);
    router.refresh();
  }

  /** Cria a fase e já põe a foto nela: se ela criou ali, é para esta foto. */
  async function criarFaseEAtribuir() {
    const criada = await criarFase(obraId, nomeDaFase, fases.length);
    setCriandoFase(false);
    setNomeDaFase("");
    if (criada) await salvarFase(criada.id);
  }

  /**
   * Excluir direto do visor (D144): antes era abrir a conversa, achar a
   * mensagem, abrir o editar e excluir. Duas etapas para não apagar por um
   * toque errado — e é exclusão lógica, como no resto do app (D53).
   */
  async function excluir() {
    const supabase = createClient();
    await supabase.from("eventos").update({ deleted: true }).eq("id", foto.evento.id);
    onFechar();
    router.refresh();
  }

  async function salvarLegenda() {
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ caption: legenda || null, edited: true })
      .eq("id", foto.evento.id);
    setSalvando(false);
    router.refresh();
  }

  const indice = fotos.findIndex((item) => item.anexoId === foto.anexoId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <button type="button" onClick={onFechar} aria-label="Fechar">
          ✕
        </button>
        <span className="text-xs opacity-80">
          {new Date(foto.evento.received_at).toLocaleString("pt-BR")}
        </span>
        {/* Mandar a foto da obra para o cliente é o mesmo gesto do
            comprovante para o pedreiro (D137). */}
        <span className="[&_button]:text-white [&_button]:opacity-80">
          <BotaoEncaminhar
            anexos={foto.evento.anexos ?? []}
            descricao={foto.evento.caption ?? undefined}
            rotulo="mandar"
          />
        </span>
        <Link
          href={`/obras/${obraId}/conversa#evento-${foto.evento.id}`}
          className="text-xs underline opacity-80"
        >
          ver no chat
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-hidden px-2">
        {indice > 0 && (
          <button
            type="button"
            onClick={() => onTrocar(fotos[indice - 1])}
            className="p-3 text-2xl text-white/70"
            aria-label="Anterior"
          >
            ‹
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={foto.url}
          alt={legenda}
          className="max-h-full max-w-full object-contain"
        />
        {indice < fotos.length - 1 && (
          <button
            type="button"
            onClick={() => onTrocar(fotos[indice + 1])}
            className="p-3 text-2xl text-white/70"
            aria-label="Próxima"
          >
            ›
          </button>
        )}
      </div>

      {/* safe-bottom: o visor ocupa a tela inteira, e sem isso o último botão
          ficava embaixo da barra do iPhone — "muito no canto" (D146). */}
      <div className="safe-bottom space-y-3 bg-surface px-4 pt-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-soft">
            Fase {faseId ? "· toque de novo para tirar" : "· opcional"}
          </label>
          <div className="flex flex-wrap gap-2">
            {fases.map((fase) => (
              <button
                key={fase.id}
                type="button"
                // Tocar na fase que já está marcada desmarca — mesmo gesto
                // de qualquer seleção, e o jeito mais rápido de desfazer.
                onClick={() => salvarFase(fase.id === faseId ? null : fase.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  fase.id === faseId
                    ? "border-primary bg-primary text-white"
                    : "border-line text-ink-soft"
                }`}
              >
                {fase.name}
              </button>
            ))}

            {!criandoFase && (
              <button
                type="button"
                onClick={() => setCriandoFase(true)}
                className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs font-medium text-ink-soft"
              >
                + nova fase
              </button>
            )}
          </div>

          {criandoFase && (
            <div className="flex gap-2 pt-1">
              <input
                autoFocus
                value={nomeDaFase}
                onChange={(e) => setNomeDaFase(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    criarFaseEAtribuir();
                  }
                }}
                placeholder="Ex.: Paisagismo"
                className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={criarFaseEAtribuir}
                disabled={!nomeDaFase.trim()}
                className="shrink-0 rounded-card bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                Criar
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-soft">
            Legenda (opcional)
          </label>
          <div className="flex gap-2">
            <input
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Ex.: hidráulica da cozinha antes de fechar a parede"
              className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={salvarLegenda}
              disabled={salvando}
              className="shrink-0 rounded-card bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {salvando ? "..." : "Salvar"}
            </button>
          </div>
        </div>

        {fotos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pt-1">
            {fotos.map((item) => (
              <button
                key={item.anexoId}
                type="button"
                onClick={() => onTrocar(item)}
                className={`shrink-0 overflow-hidden rounded ${
                  item.anexoId === foto.anexoId ? "ring-2 ring-primary" : ""
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="h-12 w-12 object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Excluir por último e em largura cheia: longe do canto, alcançável
            com o polegar, e depois de tudo que é navegação. */}
        {confirmandoExclusao ? (
          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-center text-micro text-ink-soft">
              A foto some daqui e da conversa.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="flex-1 rounded-card border border-line py-3 font-display text-caption font-semibold text-ink-soft"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={excluir}
                className="flex-1 rounded-card bg-alert py-3 font-display text-caption font-semibold text-white"
              >
                Excluir foto
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="w-full rounded-card border border-line py-3 font-display text-caption font-semibold text-alert"
          >
            🗑 Excluir foto
          </button>
        )}
      </div>
    </div>
  );
}

export function GaleriaDocumentacao({
  obraId,
  eventos,
  fases,
}: {
  obraId: string;
  eventos: Evento[];
  fases: Fase[];
}) {
  const router = useRouter();
  const [faseFiltro, setFaseFiltro] = useState<string>("todas");
  const [aberta, setAberta] = useState<FotoItem | null>(null);
  const [criandoFase, setCriandoFase] = useState(false);
  const [nomeDaFase, setNomeDaFase] = useState("");
  const [editandoFase, setEditandoFase] = useState(false);

  const faseSelecionada = fases.find((fase) => fase.id === faseFiltro) ?? null;

  async function adicionarFase() {
    const criada = await criarFase(obraId, nomeDaFase, fases.length);
    setCriandoFase(false);
    setNomeDaFase("");
    if (criada) {
      setFaseFiltro(criada.id);
      router.refresh();
    }
  }

  const fotos: FotoItem[] = eventos.flatMap((evento) =>
    (evento.anexos ?? [])
      .filter((anexo) => anexo.tipo === "foto")
      .map((anexo) => ({ evento, url: anexo.url, anexoId: anexo.id })),
  );

  const visiveis =
    faseFiltro === "todas"
      ? fotos
      : fotos.filter((foto) => foto.evento.phase_id === faseFiltro);

  if (fotos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-ink-soft">
          As fotos que você mandar aparecem organizadas aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* "+" antes de "Todas" (D143): no fim da barra, com muitas fases, ele
            sumiria para fora da tela e ninguém acharia. */}
        <button
          type="button"
          onClick={() => setCriandoFase((aberto) => !aberto)}
          className="shrink-0 rounded-full border border-dashed border-line px-3 py-1 text-xs font-medium text-ink-soft"
          aria-label="Criar fase"
        >
          +
        </button>
        {[
          { id: "todas", name: "Todas" },
          ...fases.map((fase) => ({ id: fase.id, name: fase.name })),
        ].map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            onClick={() => setFaseFiltro(opcao.id)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              faseFiltro === opcao.id
                ? "border-primary bg-primary text-white"
                : "border-line text-ink-soft"
            }`}
          >
            {opcao.name}
          </button>
        ))}
      </div>

      {criandoFase && (
        <div className="flex gap-2">
          <input
            autoFocus
            value={nomeDaFase}
            onChange={(e) => setNomeDaFase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                adicionarFase();
              }
            }}
            placeholder="Nome da fase — ex.: Paisagismo"
            className="min-w-0 flex-1 rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={adicionarFase}
            disabled={!nomeDaFase.trim()}
            className="shrink-0 rounded-card bg-primary px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Criar
          </button>
        </div>
      )}

      {/* Com uma fase selecionada, o "editar" aparece ali mesmo (D147): é onde
          ela percebe que a fase está errada, e não nas Configurações. */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-soft">
          {visiveis.length} {visiveis.length === 1 ? "foto" : "fotos"}
          {faseSelecionada ? ` em ${faseSelecionada.name}` : ""}
        </p>
        {faseSelecionada && (
          <button
            type="button"
            onClick={() => setEditandoFase(true)}
            className="shrink-0 text-micro font-semibold text-primary underline"
          >
            editar fase
          </button>
        )}
      </div>

      {editandoFase && faseSelecionada && (
        <EditarFase
          fase={faseSelecionada}
          fotosNaFase={visiveis.length}
          onFechar={() => setEditandoFase(false)}
          onExcluida={() => {
            setEditandoFase(false);
            setFaseFiltro("todas");
          }}
        />
      )}

      <div className="grid grid-cols-3 gap-2">
        {visiveis.map((foto) => (
          <button
            key={foto.anexoId}
            type="button"
            onClick={() => setAberta(foto)}
            className="relative aspect-square overflow-hidden rounded-card bg-surface-alt"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={foto.evento.caption ?? ""}
              className="h-full w-full object-cover"
            />
            {foto.evento.caption && (
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1 py-0.5 text-left text-[10px] text-white">
                {foto.evento.caption}
              </span>
            )}
          </button>
        ))}
      </div>

      {aberta && (
        <VisorFoto
          key={aberta.anexoId}
          foto={aberta}
          fotos={visiveis}
          fases={fases}
          obraId={obraId}
          onFechar={() => setAberta(null)}
          onTrocar={setAberta}
        />
      )}
    </div>
  );
}
