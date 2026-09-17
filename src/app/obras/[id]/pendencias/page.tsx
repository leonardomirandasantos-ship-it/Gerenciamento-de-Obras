import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes, ordenarPorPrioridade } from "@/lib/suggestions";
import { CardDeLista } from "@/components/obra/CardDeLista";
import { PrazosLista } from "@/components/obra/PrazosLista";
import { SuggestionCard } from "@/components/obra/SuggestionCard";
import type { ChecklistPayload, Evento, ListaPayload, SugestaoRegistro } from "@/lib/types";

/** Data que ordena o card: o checklist herda a data da lista que o originou. */
function dataDaLista(evento: Evento): string {
  if (evento.kind === "E2_checklist") {
    return (evento.payload as ChecklistPayload).sourceListDate ?? evento.received_at;
  }
  return evento.received_at;
}

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
  const idsDeChecklists = new Set(checklists.map((checklist) => checklist.id));

  // Listas e checklists moram na MESMA seção: para quem usa é a mesma coisa,
  // e separá-los fazia o card "sumir" ao ser convertido (ia para o fim da
  // página). Uma lista só sai daqui quando é tirada explicitamente.
  const listasSoltas = eventos.filter((evento) => {
    if (evento.kind !== "E1_lista") return false;
    const payload = evento.payload as ListaPayload;
    if (payload.dismissed) return false;
    return !payload.linkedChecklistId || !idsDeChecklists.has(payload.linkedChecklistId);
  });

  const listas = [...checklists, ...listasSoltas].sort((a, b) =>
    dataDaLista(b).localeCompare(dataDaLista(a)),
  );

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

  // Limito a 3: com dados reais a engine detecta 10+ e vira ruído (D25).
  const sugestoes = ordenarPorPrioridade(
    detectarSugestoes(eventos, (registros ?? []) as SugestaoRegistro[]).filter(
      (sugestao) => sugestao.caso !== "A_checklist",
    ),
  ).slice(0, 3);
  const porEvento = new Map(eventos.map((evento) => [evento.id, evento]));

  if (listas.length === 0 && comPrazo.length === 0 && sugestoes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-ink-soft">
          Suas listas e prazos aparecem aqui — mande uma lista na conversa pra começar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-28">
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

      {listas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Listas
          </h2>
          {listas.map((lista) => (
            <CardDeLista key={lista.id} evento={lista} obraId={id} />
          ))}
        </section>
      )}

      <Link href={`/obras/${id}/conversa`} className="block pt-2 text-xs text-primary underline">
        voltar para a conversa
      </Link>
    </div>
  );
}
