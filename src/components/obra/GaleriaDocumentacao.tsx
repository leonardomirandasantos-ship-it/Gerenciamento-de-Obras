"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

  async function salvar() {
    setSalvando(true);
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ caption: legenda || null, phase_id: faseId || null, edited: true })
      .eq("id", foto.evento.id);
    setSalvando(false);
    router.refresh();
  }

  const indice = fotos.findIndex((item) => item.anexoId === foto.anexoId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      <div className="flex items-center justify-between p-4 text-white">
        <button type="button" onClick={onFechar} aria-label="Fechar">
          ✕
        </button>
        <span className="text-xs opacity-80">
          {new Date(foto.evento.received_at).toLocaleString("pt-BR")}
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
        <img src={foto.url} alt={legenda} className="max-h-full max-w-full object-contain" />
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

      <div className="space-y-3 bg-surface p-4">
        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-soft">Legenda (opcional)</label>
          <input
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            placeholder="Ex.: hidráulica da cozinha antes de fechar a parede"
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-ink-soft">Fase</label>
          <select
            value={faseId}
            onChange={(e) => setFaseId(e.target.value)}
            className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink"
          >
            <option value="">Sem fase</option>
            {fases.map((fase) => (
              <option key={fase.id} value={fase.id}>
                {fase.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="w-full rounded-card bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>

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
  const [faseFiltro, setFaseFiltro] = useState<string>("todas");
  const [aberta, setAberta] = useState<FotoItem | null>(null);

  const fotos: FotoItem[] = eventos.flatMap((evento) =>
    (evento.anexos ?? [])
      .filter((anexo) => anexo.tipo === "foto")
      .map((anexo) => ({ evento, url: anexo.url, anexoId: anexo.id })),
  );

  const visiveis =
    faseFiltro === "todas"
      ? fotos
      : faseFiltro === "sem-fase"
        ? fotos.filter((foto) => !foto.evento.phase_id)
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
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "todas", name: "Todas" },
          ...fases.map((fase) => ({ id: fase.id, name: fase.name })),
          { id: "sem-fase", name: "Sem fase" },
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

      <p className="text-xs text-ink-soft">
        {visiveis.length} {visiveis.length === 1 ? "foto" : "fotos"}
      </p>

      <div className="grid grid-cols-3 gap-2">
        {visiveis.map((foto) => (
          <button
            key={foto.anexoId}
            type="button"
            onClick={() => setAberta(foto)}
            className="relative aspect-square overflow-hidden rounded-card bg-surface-alt"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt={foto.evento.caption ?? ""} className="h-full w-full object-cover" />
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
