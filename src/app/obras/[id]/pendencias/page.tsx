import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes, ordenarPorPrioridade } from "@/lib/suggestions";
import { ChecklistCard } from "@/components/obra/ChecklistCard";
import { ListaCard } from "@/components/obra/ListaCard";
import { SuggestionCard } from "@/components/obra/SuggestionCard";
import { PrazosLista } from "@/components/obra/PrazosLista";
import type {
  ChecklistPayload,
  ListaPayload,
  SugestaoRegistro,
} from "@/lib/types";

export default async function PendenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: registros }] = await Promise.all([
    carregarEventosComAnexos(supabase, id),
    supabase.from("sugestoes").select("*").eq("obra_id", id),
  ]);

  const checklists = eventos.filter((evento) => evento.kind === "E2_checklist");

  // Listas que ainda não viraram checklist continuam visíveis aqui — nada que
  // ela mandou pode "desaparecer" por não ter aceitado uma sugestão (D3).
  // O checklist vinculado também precisa existir de fato: se foi excluído, a
  // lista volta para cá em vez de sumir das duas seções.
  const idsDeChecklists = new Set(checklists.map((checklist) => checklist.id));
  const listasSoltas = eventos.filter((evento) => {
    if (evento.kind !== "E1_lista") return false;
    const vinculo = (evento.payload as ListaPayload).linkedChecklistId;
    return !vinculo || !idsDeChecklists.has(vinculo);
  });

  const comPrazo = eventos
    .filter((evento) => {
      const payload = evento.payload as { date?: string; done?: boolean };
      return Boolean(payload.date) && !payload.done;
    })
    .sort((a, b) =>
      String((a.payload as { date?: string }).date).localeCompare(
        String((b.payload as { date?: string }).date),
      ),
    );

  const itensComPrazo = checklists.flatMap((checklist) =>
    ((checklist.payload as ChecklistPayload).items ?? [])
      .filter((item) => item.date && item.status === "falta")
      .map((item) => ({ item, checklist })),
  );

  // O card da lista já oferece "virar checklist", então não repito o caso A
  // aqui. E limito a 3 sugestões: acumular dezenas viraria ruído (D25).
  const sugestoes = ordenarPorPrioridade(
    detectarSugestoes(eventos, (registros ?? []) as SugestaoRegistro[]).filter(
      (sugestao) => sugestao.caso !== "A_checklist",
    ),
  ).slice(0, 3);
  const porEvento = new Map(eventos.map((evento) => [evento.id, evento]));

  const vazio =
    checklists.length === 0 &&
    listasSoltas.length === 0 &&
    comPrazo.length === 0 &&
    sugestoes.length === 0;

  if (vazio) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-ink-soft">
          Suas listas e prazos aparecem aqui — mande uma lista na conversa pra
          começar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      {(comPrazo.length > 0 || itensComPrazo.length > 0) && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Com prazo
          </h2>

          <PrazosLista eventos={comPrazo} itens={itensComPrazo} />
        </section>
      )}

      {sugestoes.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Sugestões
          </h2>
          {sugestoes.map((sugestao) => {
            const evento = porEvento.get(sugestao.eventoId);
            if (!evento) return null;
            return (
              <SuggestionCard
                key={`${sugestao.caso}-${sugestao.eventoId}`}
                sugestao={sugestao}
                evento={evento}
                obraId={id}
              />
            );
          })}
        </section>
      )}

      {listasSoltas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Listas recebidas
          </h2>
          {listasSoltas.map((lista) => (
            <ListaCard key={lista.id} evento={lista} obraId={id} />
          ))}
        </section>
      )}

      {checklists.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Checklists
          </h2>
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist.id} evento={checklist} />
          ))}
        </section>
      )}

      <Link
        href={`/obras/${id}/conversa`}
        className="block pt-2 text-xs text-primary underline"
      >
        voltar para a conversa
      </Link>
    </div>
  );
}
