import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes, ordenarPorPrioridade } from "@/lib/suggestions";
import { itensAComprar, listasAbertas } from "@/lib/pendencias";
import { CardDeLista } from "@/components/obra/CardDeLista";
import { PrazosLista } from "@/components/obra/PrazosLista";
import { SugestoesParaOrganizar } from "@/components/obra/SugestoesParaOrganizar";
import { ResumoDasPendencias } from "@/components/obra/ResumoDasPendencias";
import type { ChecklistPayload, SugestaoRegistro } from "@/lib/types";

export default async function PendenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: registros }] = await Promise.all([
    carregarEventosComAnexos(supabase, id, undefined, { assinar: false }),
    supabase.from("sugestoes").select("*").eq("obra_id", id),
  ]);

  // Listas e checklists moram na MESMA seção: para quem usa é a mesma coisa (D76).
  const listas = listasAbertas(eventos);
  const aComprar = itensAComprar(eventos);
  const checklists = eventos.filter((evento) => evento.kind === "E2_checklist");

  // Lista com prazo NÃO entra aqui: ela já sobe no topo da seção "Listas",
  // com a data no próprio card (D117). Repetir o card virava um segundo
  // registro "Registro", sem dizer do que se tratava.
  const comPrazo = eventos
    .filter((evento) => {
      if (evento.kind === "E1_lista" || evento.kind === "E2_checklist")
        return false;
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

  // Limito a 5 aqui (o componente mostra 1 por vez): com dados reais a engine
  // detecta 10+ e vira ruído (D25/D122).
  const sugestoes = ordenarPorPrioridade(
    detectarSugestoes(eventos, (registros ?? []) as SugestaoRegistro[]),
  ).slice(0, 5);
  const porEvento = new Map(eventos.map((evento) => [evento.id, evento]));

  if (listas.length === 0 && comPrazo.length === 0 && sugestoes.length === 0) {
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
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* As duas contas em uma linha, fora da área que rola (D123). */}
      {(listas.length > 0 || sugestoes.length > 0) && (
        <ResumoDasPendencias
          listas={listas.length}
          itensEmAberto={aComprar}
          organizar={sugestoes.length}
        />
      )}

      <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-28">
        {(comPrazo.length > 0 || itensComPrazo.length > 0) && (
          <section className="space-y-2">
            <h2 className="text-micro font-semibold uppercase tracking-wide text-ink-soft">
              Com prazo
            </h2>
            <PrazosLista eventos={comPrazo} itens={itensComPrazo} />
          </section>
        )}

        {/* Listas antes das sugestões (D122): lista é o que ela vem ver aqui;
          sugestão é o app pedindo ajuda, e pedido não passa na frente. */}
        {listas.length > 0 && (
          <section id="secao-listas" className="scroll-mt-16 space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-micro font-semibold uppercase tracking-wide text-ink-soft">
                Listas
              </h2>
              <span className="text-micro text-ink-soft">
                {aComprar}{" "}
                {aComprar === 1 ? "item em aberto" : "itens em aberto"}
              </span>
            </div>
            {listas.map((lista) => (
              <CardDeLista key={lista.id} evento={lista} obraId={id} />
            ))}
          </section>
        )}

        {sugestoes.length > 0 && (
          <SugestoesParaOrganizar
            sugestoes={sugestoes}
            eventos={porEvento}
            obraId={id}
          />
        )}

        <Link
          href={`/obras/${id}/conversa`}
          className="block pt-2 text-caption text-primary underline"
        >
          voltar para a conversa
        </Link>
      </div>
    </div>
  );
}
