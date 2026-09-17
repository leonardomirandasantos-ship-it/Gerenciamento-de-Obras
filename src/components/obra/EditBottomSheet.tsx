"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ambientesDoEvento } from "@/lib/ambientes";
import { BottomSheet } from "./BottomSheet";
import { SeletorDeAmbientes } from "./SeletorDeAmbientes";
import { CampoFavorecido } from "./CampoFavorecido";
import {
  RÓTULO_TIPO,
  type Evento,
  type EventoKind,
  type Fase,
} from "@/lib/types";

const TIPOS_SELECIONAVEIS: EventoKind[] = [
  "E1_lista",
  "E2_checklist",
  "E3_decisao",
  "E4_documentacao",
  "E5_documento",
  "E6_comunicacao",
  "E7_pagamento",
  "E8_orcamento",
];

export function EditBottomSheet({
  evento,
  fases,
  obraId,
  onClose,
}: {
  evento: Evento;
  fases: Fase[];
  /** Necessário para gravar o tipo do favorecido, que é da obra, não do evento. */
  obraId?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const pagamentoAtual = evento.payload as {
    amount?: number;
    payeeName?: string;
    payeeType?: "prestador" | "fornecedor";
  };
  const [kind, setKind] = useState<EventoKind>(evento.kind);
  const [phaseId, setPhaseId] = useState(evento.phase_id ?? "");
  const [valor, setValor] = useState(pagamentoAtual.amount?.toString() ?? "");
  const [favorecido, setFavorecido] = useState(pagamentoAtual.payeeName ?? "");
  const [tipoFavorecido, setTipoFavorecido] = useState<"prestador" | "fornecedor" | "">(
    pagamentoAtual.payeeType ?? "",
  );
  const [ambientes, setAmbientes] = useState<string[]>(
    evento.kind === "E3_decisao" ? ambientesDoEvento(evento) : [],
  );
  const [texto, setTexto] = useState(evento.raw_text ?? "");
  const [legenda, setLegenda] = useState(evento.caption ?? "");
  const [carregando, setCarregando] = useState(false);

  async function salvar() {
    setCarregando(true);
    const supabase = createClient();

    let payload: Record<string, unknown> = evento.payload;

    if (kind === "E7_pagamento") {
      payload = {
        ...payload,
        amount: valor ? parseFloat(valor.replace(",", ".")) : undefined,
        payeeName: favorecido || undefined,
        payeeType: tipoFavorecido || undefined,
      };
    }

    if (kind === "E3_decisao") {
      payload = {
        ...payload,
        environments: ambientes,
        environment: ambientes[0],
      };
    }

    // O tipo (prestador/fornecedor) é da PESSOA, não deste pagamento: vai
    // para `favorecidos` e passa a valer para tudo o que ela já recebeu.
    let favorecidoId = evento.favorecido_id;
    if (kind === "E7_pagamento" && obraId && favorecido.trim() && tipoFavorecido) {
      const { data: cadastro } = await supabase
        .from("favorecidos")
        .upsert(
          { obra_id: obraId, name: favorecido.trim(), type: tipoFavorecido },
          { onConflict: "obra_id,name" },
        )
        .select("id")
        .single();
      favorecidoId = cadastro?.id ?? favorecidoId;
    }

    await supabase
      .from("eventos")
      .update({
        kind,
        confidence: 1,
        phase_id: phaseId || null,
        favorecido_id: favorecidoId,
        // O texto é editável (D104): erro de digitação não deveria obrigar a
        // apagar e remandar. O tipo escolhido continua valendo — não
        // reclassifico por trás, senão a correção mudaria a aba sem avisar.
        raw_text: evento.raw_text !== null ? texto : null,
        caption: legenda || null,
        payload,
        edited: true,
      })
      .eq("id", evento.id);
    setCarregando(false);
    onClose();
    router.refresh();
  }

  async function excluir() {
    setCarregando(true);
    const supabase = createClient();
    await supabase
      .from("eventos")
      .update({ deleted: true })
      .eq("id", evento.id);
    setCarregando(false);
    onClose();
    router.refresh();
  }

  return (
    <BottomSheet titulo="Editar registro" onFechar={onClose}>
      <>
        {evento.raw_text !== null && (
          <div className="mb-4 space-y-1">
            <label className="text-caption font-semibold text-ink">Texto</label>
            <textarea
              rows={Math.min(8, Math.max(2, texto.split("\n").length))}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full resize-none rounded-card border border-line bg-surface px-3 py-2.5 text-base leading-snug text-ink outline-none focus:border-primary"
            />
          </div>
        )}

        {(evento.anexos?.length ?? 0) > 0 && (
          <div className="mb-4 space-y-1">
            <label className="text-caption font-semibold text-ink">Legenda</label>
            <input
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="O que é esse arquivo?"
              className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>
        )}

        {/* Áudio não vira outro tipo: ele é o registro original, e o que foi
            entendido dele já são os registros derivados. */}
        {evento.kind !== "E9_audio" && (
          <>
        <p className="mb-2 text-sm font-medium text-ink">Tipo</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {TIPOS_SELECIONAVEIS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setKind(t)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                kind === t
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-line text-ink-soft"
              }`}
            >
              {RÓTULO_TIPO[t]}
            </button>
          ))}
        </div>
          </>
        )}

        {kind === "E3_decisao" && (
          <div className="mb-4 space-y-2">
            <p className="text-caption font-semibold text-ink">Onde é essa decisão?</p>
            <SeletorDeAmbientes selecionados={ambientes} onChange={setAmbientes} />
          </div>
        )}

        {kind === "E7_pagamento" && (
          <div className="mb-4 flex gap-2">
            <div className="w-28 space-y-1">
              <label className="text-xs font-medium text-ink-soft">
                Valor (R$)
              </label>
              <input
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-xs font-medium text-ink-soft">
                Favorecido
              </label>
              {obraId ? (
                <CampoFavorecido obraId={obraId} valor={favorecido} onChange={setFavorecido} />
              ) : (
                <input
                  value={favorecido}
                  onChange={(e) => setFavorecido(e.target.value)}
                  placeholder="Quem recebeu"
                  className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                />
              )}
            </div>
          </div>
        )}

        {kind === "E7_pagamento" && favorecido.trim() && (
          <div className="mb-4 space-y-2">
            <p className="text-caption font-semibold text-ink">
              {favorecido.trim()} é prestador ou fornecedor?
            </p>
            <div className="flex gap-2">
              {(["prestador", "fornecedor"] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoFavorecido(tipoFavorecido === tipo ? "" : tipo)}
                  className={`flex-1 rounded-full border px-3 py-2 font-display text-caption font-semibold capitalize ${
                    tipoFavorecido === tipo
                      ? "border-primary bg-primary text-white"
                      : "border-line text-ink-soft"
                  }`}
                >
                  {tipo}
                </button>
              ))}
            </div>
            <p className="text-micro text-ink-soft">
              Vale para todos os pagamentos dessa pessoa, não só para este.
            </p>
          </div>
        )}

        <p className="mb-2 text-sm font-medium text-ink">Fase</p>
        <select
          value={phaseId}
          onChange={(e) => setPhaseId(e.target.value)}
          className="mb-6 w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink"
        >
          <option value="">Sem fase</option>
          {fases.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <button
          onClick={salvar}
          disabled={carregando}
          className="mb-3 w-full rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {carregando ? "Salvando..." : "Salvar"}
        </button>

        <button
          onClick={excluir}
          disabled={carregando}
          className="w-full py-2 text-center text-sm font-medium text-alert"
        >
          🗑 Excluir registro
        </button>
      </>
    </BottomSheet>
  );
}
