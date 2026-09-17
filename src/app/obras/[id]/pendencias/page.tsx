import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes } from "@/lib/suggestions";
import { ChecklistCard } from "@/components/obra/ChecklistCard";
import { SuggestionCard } from "@/components/obra/SuggestionCard";
import type { SugestaoRegistro } from "@/lib/types";

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
  const sugestoes = detectarSugestoes(eventos, (registros ?? []) as SugestaoRegistro[]);
  const porEvento = new Map(eventos.map((evento) => [evento.id, evento]));

  return (
    <div className="flex-1 space-y-6 overflow-y-auto p-4">
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

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Checklists</h2>

        {checklists.length === 0 ? (
          <p className="text-sm text-ink-soft">Suas listas viram checklists aqui.</p>
        ) : (
          checklists.map((checklist) => <ChecklistCard key={checklist.id} evento={checklist} />)
        )}
      </section>
    </div>
  );
}
