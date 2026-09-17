"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizarFavorecido, type PagamentoPayload } from "@/lib/pagamento";
import { BottomSheet } from "./BottomSheet";
import type { Evento } from "@/lib/types";

/**
 * Editar a PESSOA, não um pagamento dela (D99). São duas coisas diferentes:
 * valor e data são de cada pagamento (bottom sheet de registro); nome e tipo
 * valem para tudo o que ela já recebeu — trocar aqui reescreve o histórico
 * inteiro, que é o que "esse não é prestador, é fornecedor" quer dizer.
 */
export function EditarFavorecido({
  obraId,
  nomeAtual,
  tipoAtual,
  eventos,
}: {
  obraId: string;
  nomeAtual: string;
  tipoAtual: "prestador" | "fornecedor" | null;
  eventos: Evento[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState(nomeAtual);
  const [tipo, setTipo] = useState<"prestador" | "fornecedor" | "">(tipoAtual ?? "");
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const novoNome = nome.trim();
    if (!novoNome || salvando) return;

    setSalvando(true);
    const supabase = createClient();

    const { data: cadastro } = await supabase
      .from("favorecidos")
      .upsert(
        { obra_id: obraId, name: novoNome, type: tipo || null },
        { onConflict: "obra_id,name" },
      )
      .select("id")
      .single();

    // Renomear tem que reescrever o payeeName de cada pagamento: o agrupamento
    // do resumo é feito pelo nome que está no evento, não pelo cadastro.
    const mudouNome = normalizarFavorecido(novoNome) !== normalizarFavorecido(nomeAtual);

    await Promise.all(
      eventos.map((evento) =>
        supabase
          .from("eventos")
          .update({
            favorecido_id: cadastro?.id ?? evento.favorecido_id,
            payload: {
              ...(evento.payload as PagamentoPayload),
              payeeName: novoNome,
              payeeType: tipo || undefined,
            },
            edited: true,
          })
          .eq("id", evento.id),
      ),
    );

    setSalvando(false);
    setAberto(false);

    if (mudouNome) {
      router.replace(`/obras/${obraId}/prestador/${encodeURIComponent(novoNome)}`);
    }
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="shrink-0 rounded-full border border-line px-3 py-1.5 font-display text-caption font-semibold text-primary"
      >
        editar
      </button>

      {aberto && (
        <BottomSheet titulo="Editar pessoa" onFechar={() => setAberto(false)}>
          <>
            <div className="mb-4 space-y-1">
              <label className="text-caption font-semibold text-ink">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
              />
              <p className="text-micro text-ink-soft">
                Renomear corrige o nome em todos os {eventos.length}{" "}
                {eventos.length === 1 ? "pagamento" : "pagamentos"} dela.
              </p>
            </div>

            <div className="mb-6 space-y-2">
              <label className="text-caption font-semibold text-ink">Tipo</label>
              <div className="flex gap-2">
                {(["prestador", "fornecedor"] as const).map((opcao) => (
                  <button
                    key={opcao}
                    type="button"
                    onClick={() => setTipo(tipo === opcao ? "" : opcao)}
                    className={`flex-1 rounded-full border px-3 py-2.5 font-display text-caption font-semibold capitalize ${
                      tipo === opcao
                        ? "border-primary bg-primary text-white"
                        : "border-line text-ink-soft"
                    }`}
                  >
                    {opcao}
                  </button>
                ))}
              </div>
              <p className="text-micro text-ink-soft">
                Serve para separar mão de obra de material no resumo. Dá pra deixar sem tipo.
              </p>
            </div>

            <button
              type="button"
              onClick={salvar}
              disabled={salvando || !nome.trim()}
              className="w-full rounded-card bg-primary px-3 py-3 font-display text-body font-semibold text-white disabled:opacity-40"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </>
        </BottomSheet>
      )}
    </>
  );
}
