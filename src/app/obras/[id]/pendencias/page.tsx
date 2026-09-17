import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes, ordenarPorPrioridade } from "@/lib/suggestions";
import { ChecklistCard } from "@/components/obra/ChecklistCard";
import { ListaCard } from "@/components/obra/ListaCard";
import { SuggestionCard } from "@/components/obra/SuggestionCard";
import type { ChecklistPayload, ListaPayload, SugestaoRegistro } from "@/lib/types";

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
  const listasSoltas = eventos.filter(
    (evento) =>
      evento.kind === "E1_lista" && !(evento.payload as ListaPayload).linkedChecklistId,
  );

  const comPrazo = eventos
    .filter((evento) => Boolean((evento.payload as { date?: string }).date))
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

          <ul className="space-y-2">
            {comPrazo.map((evento) => {
              const prazo = String((evento.payload as { date?: string }).date);
              return (
                <li
                  key={evento.id}
                  className="flex items-start justify-between gap-2 rounded-card border border-line bg-surface p-3"
                >
                  <span className="min-w-0 flex-1 text-sm text-ink">
                    {evento.raw_text ?? "Registro"}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                    style={{ backgroundColor: "var(--color-info)" }}
                  >
                    {new Date(`${prazo}T00:00:00`).toLocaleDateString("pt-BR")}
                  </span>
                </li>
              );
            })}

            {itensComPrazo.map(({ item, checklist }) => (
              <li
                key={`${checklist.id}-${item.text}`}
                className="flex items-start justify-between gap-2 rounded-card border border-line bg-surface p-3"
              >
                <span className="min-w-0 flex-1 text-sm text-ink">{item.text}</span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                  style={{ backgroundColor: "var(--color-info)" }}
                >
                  {new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
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

      <Link href={`/obras/${id}/conversa`} className="block pt-2 text-xs text-primary underline">
        voltar para a conversa
      </Link>
    </div>
  );
}
