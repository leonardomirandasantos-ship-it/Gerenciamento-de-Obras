import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { agruparPorFavorecido, formatarReais, totalPago, type Favorecido } from "@/lib/pagamento";
import { itensAComprar } from "@/lib/pendencias";
import { RoscaPorFase, type FatiaFase } from "@/components/obra/RoscaPorFase";
import { PagamentosEditaveis } from "@/components/obra/PagamentosEditaveis";
import { RegistrosEditaveis } from "@/components/obra/RegistrosEditaveis";
import { ListaDeFavorecidos } from "@/components/obra/ListaDeFavorecidos";
import type { Fase } from "@/lib/types";

/**
 * Visão geral da obra. Era o Dash; o Resumo antigo era uma versão pior disso
 * (contadores que só levavam para outras abas, que já estão a um toque nas
 * abas do topo). Fundidos numa aba só — ver D94.
 */
export default async function ResumoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: fases }, { data: favorecidos }] = await Promise.all([
    carregarEventosComAnexos(supabase, id),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
    supabase.from("favorecidos").select("*").eq("obra_id", id),
  ]);

  const pagamentos = eventos.filter((evento) => evento.kind === "E7_pagamento");
  const total = totalPago(pagamentos);
  const porPessoa = agruparPorFavorecido(pagamentos, (favorecidos ?? []) as Favorecido[]);

  const fatias: FatiaFase[] = [
    ...((fases ?? []) as Fase[]).map((fase) => ({
      nome: fase.name,
      cor: fase.color,
      valor: totalPago(pagamentos.filter((evento) => evento.phase_id === fase.id)),
    })),
    {
      nome: "Sem fase",
      cor: "var(--color-unclassified)",
      valor: totalPago(pagamentos.filter((evento) => !evento.phase_id)),
    },
  ];

  const aComprar = itensAComprar(eventos);

  const orcamentos = eventos.filter((evento) => evento.kind === "E8_orcamento").length;

  // Mesmo corte da aba Documentação (D105): comprovante não é foto de obra.
  const fotosRecentes = eventos
    .filter((evento) => evento.kind !== "E7_pagamento" && evento.kind !== "E8_orcamento")
    .flatMap((evento) => (evento.anexos ?? []).filter((anexo) => anexo.tipo === "foto"))
    .slice(-6)
    .reverse();

  const ultimos = [...eventos].reverse().slice(0, 5);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <div>
          <p className="text-micro text-ink-soft">Gasto total da obra</p>
          <p className="font-display text-2xl font-bold text-ink">{formatarReais(total)}</p>
        </div>
        <RoscaPorFase fatias={fatias} />
      </section>

      <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
        <div>
          <h2 className="font-display text-section font-bold text-ink">
            Gasto por prestador/fornecedor
          </h2>
          {porPessoa.length > 0 && (
            <p className="text-micro text-ink-soft">
              Toque no nome para ver o histórico de pagamentos da pessoa
            </p>
          )}
        </div>

        {porPessoa.length === 0 ? (
          <p className="text-caption text-ink-soft">
            Quando você registrar um pagamento, ele aparece agrupado aqui — sem precisar cadastrar
            ninguém.
          </p>
        ) : (
          <ListaDeFavorecidos
            obraId={id}
            pessoas={porPessoa.map((pessoa) => ({
              nome: pessoa.nome,
              tipo: pessoa.tipo,
              total: pessoa.total,
              pagamentos: pessoa.pagamentos,
            }))}
          />
        )}
      </section>

      {pagamentos.length > 0 && (
        <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
          <h2 className="font-display text-section font-bold text-ink">Pagamentos registrados</h2>
          <PagamentosEditaveis obraId={id} pagamentos={pagamentos} fases={(fases ?? []) as Fase[]} />
        </section>
      )}

      <div className="flex gap-3">
        <Link
          href={`/obras/${id}/pendencias`}
          className="flex flex-1 items-center justify-between rounded-card bg-surface p-4 shadow-card active:bg-surface-alt"
        >
          <span>
            <span className="block text-micro text-ink-soft">A comprar</span>
            <span className="block font-display text-title font-bold text-pending">{aComprar}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">
            ›
          </span>
        </Link>

        <Link
          href={`/obras/${id}/orcamentos`}
          className="flex flex-1 items-center justify-between rounded-card bg-surface p-4 shadow-card active:bg-surface-alt"
        >
          <span>
            <span className="block text-micro text-ink-soft">Orçamentos</span>
            <span className="block font-display text-title font-bold text-ink">{orcamentos}</span>
          </span>
          <span aria-hidden className="text-lg text-ink-soft">
            ›
          </span>
        </Link>
      </div>

      {fotosRecentes.length > 0 && (
        <section className="space-y-3 rounded-card bg-surface p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-section font-bold text-ink">Fotos recentes</h2>
            <Link href={`/obras/${id}/documentacao`} className="text-caption text-primary underline">
              ver todas
            </Link>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {fotosRecentes.map((anexo) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={anexo.id}
                src={anexo.url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-card object-cover"
              />
            ))}
          </div>
        </section>
      )}

      {ultimos.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-micro font-semibold uppercase tracking-wide text-ink-soft">
              Últimos registros
            </h2>
            <Link href={`/obras/${id}/conversa`} className="text-caption text-primary underline">
              abrir conversa
            </Link>
          </div>
          <RegistrosEditaveis eventos={ultimos} fases={(fases ?? []) as Fase[]} obraId={id} />
        </section>
      )}

      <Link
        href={`/obras/${id}/configuracoes`}
        className="block rounded-card bg-surface p-3 text-caption text-primary shadow-card"
      >
        Configurações da obra e fases
      </Link>
    </div>
  );
}
