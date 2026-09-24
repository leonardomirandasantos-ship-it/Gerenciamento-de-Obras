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

  const [eventos, { data: registros }, { data: favorecidos }] = await Promise.all([
    carregarEventosComAnexos(supabase, id, undefined, { assinar: false }),
    supabase.from("sugestoes").select("*").eq("obra_id", id),
    supabase.from("favorecidos").select("name, type").eq("obra_id", id),
  ]);

  // Uma fila só (D150): lista, checklist e registro com prazo no mesmo lugar,
  // na ordem de quem cobra primeiro. A seção "Com prazo" que existia aqui
  // repetia, em cima, itens que já apareciam dentro do card da lista embaixo —
  // dar o feito num lugar não mexia no outro.
  const pendencias = pendenciasOrdenadas(eventos);
  const aComprar = itensAComprar(eventos);
  const listas = pendencias.filter((pendencia) => pendencia.tipo === "lista").length;

  // Limito a 5 aqui (o componente mostra 1 por vez): com dados reais a engine
  // detecta 10+ e vira ruído (D25/D122).
  const sugestoes = ordenarPorPrioridade(
    detectarSugestoes(eventos, (registros ?? []) as SugestaoRegistro[], favorecidos ?? []),
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
        {pendencias.length > 0 && (
          <ul id="secao-listas" className="scroll-mt-16 space-y-3">
            {pendencias.map(({ tipo, evento }) =>
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
