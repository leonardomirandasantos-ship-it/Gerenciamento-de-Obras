import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes, ordenarPorPrioridade } from "@/lib/suggestions";
import { itensAComprar, pendenciasOrdenadas } from "@/lib/pendencias";
import { CardDeLista } from "@/components/obra/CardDeLista";
import { CardDePrazo } from "@/components/obra/CardDePrazo";
import { SugestoesParaOrganizar } from "@/components/obra/SugestoesParaOrganizar";
import { ResumoDasPendencias } from "@/components/obra/ResumoDasPendencias";
import type { SugestaoRegistro } from "@/lib/types";

export default async function PendenciasPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: registros }, { data: favorecidos }, { data: fases }] =
    await Promise.all([
      carregarEventosComAnexos(supabase, id, undefined, { assinar: false }),
      supabase.from("sugestoes").select("*").eq("obra_id", id),
      supabase.from("favorecidos").select("name, type").eq("obra_id", id),
      supabase.from("fases").select("id, name").eq("obra_id", id).order("order"),
    ]);

  // Uma fila só (D150): lista, checklist e registro com prazo no mesmo lugar,
  // na ordem de quem cobra primeiro. A seção "Com prazo" que existia aqui
  // repetia, em cima, itens que já apareciam dentro do card da lista embaixo —
  // dar o feito num lugar não mexia no outro.
  const pendencias = pendenciasOrdenadas(eventos);
  const abertas = pendencias.filter((pendencia) => !pendencia.concluida);
  const concluidas = pendencias.filter((pendencia) => pendencia.concluida);
  const aComprar = itensAComprar(eventos);
  const listas = abertas.filter((pendencia) => pendencia.tipo === "lista").length;

  // Limito a 5 aqui (o componente mostra 1 por vez): com dados reais a engine
  // detecta 10+ e vira ruído (D25/D122).
  const sugestoes = ordenarPorPrioridade(
    detectarSugestoes(
      eventos,
      (registros ?? []) as SugestaoRegistro[],
      favorecidos ?? [],
      fases ?? [],
    ),
  ).slice(0, 5);
  const porEvento = new Map(eventos.map((evento) => [evento.id, evento]));

  if (pendencias.length === 0 && sugestoes.length === 0) {
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
      {(pendencias.length > 0 || sugestoes.length > 0) && (
        <ResumoDasPendencias
          listas={listas}
          itensEmAberto={aComprar}
          organizar={sugestoes.length}
        />
      )}

      <div className="flex-1 space-y-6 overflow-y-auto p-4 pb-28">
        {abertas.length > 0 && (
          <ul id="secao-listas" className="scroll-mt-16 space-y-3">
            {abertas.map(({ tipo, evento }) =>
              tipo === "lista" ? (
                <li key={evento.id}>
                  <CardDeLista evento={evento} obraId={id} />
                </li>
              ) : (
                <CardDePrazo key={evento.id} evento={evento} obraId={id} />
              ),
            )}
          </ul>
        )}

        {abertas.length === 0 && concluidas.length > 0 && (
          <p className="pt-6 text-center text-caption text-ink-soft">
            Tudo marcado por aqui.
          </p>
        )}

        {sugestoes.length > 0 && (
          <SugestoesParaOrganizar
            sugestoes={sugestoes}
            eventos={porEvento}
            obraId={id}
          />
        )}

        {/* Concluídas no fim e recolhidas (D155): quem já marcou não precisa
          rolar por cima do trabalho feito para achar o que falta — mas o card
          continua a um toque, para desmarcar o que foi marcado sem querer. */}
        {concluidas.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer list-none py-2 text-micro font-semibold uppercase tracking-wide text-ink-soft">
              <span className="inline-block transition-transform group-open:rotate-90">›</span>{" "}
              Concluídas ({concluidas.length})
            </summary>
            <ul className="space-y-3 pt-2 opacity-75">
              {concluidas.map(({ evento }) => (
                <li key={evento.id}>
                  <CardDeLista evento={evento} obraId={id} />
                </li>
              ))}
            </ul>
          </details>
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
