import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { agruparPorFavorecido, formatarReais, totalPago, type Favorecido } from "@/lib/pagamento";
import { RoscaPorFase, type FatiaFase } from "@/components/obra/RoscaPorFase";
import { PagamentosEditaveis } from "@/components/obra/PagamentosEditaveis";
import type { ChecklistPayload, Fase } from "@/lib/types";

export default async function DashPage({ params }: { params: Promise<{ id: string }> }) {
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

  const aComprar = eventos
    .filter((evento) => evento.kind === "E2_checklist")
    .flatMap((evento) => (evento.payload as ChecklistPayload).items ?? [])
    .filter((item) => item.status === "falta").length;

  const orcamentos = eventos.filter((evento) => evento.kind === "E8_orcamento").length;

  const fotosRecentes = eventos
    .flatMap((evento) => (evento.anexos ?? []).filter((anexo) => anexo.tipo === "foto"))
    .slice(-6)
    .reverse();

  const maiorGasto = porPessoa[0]?.total ?? 0;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
      <section className="space-y-3 rounded-card bg-surface shadow-card p-4">
        <div>
          <p className="text-xs text-ink-soft">Gasto total da obra</p>
          <p className="font-display text-2xl font-bold text-ink">{formatarReais(total)}</p>
        </div>
        <RoscaPorFase fatias={fatias} />
      </section>

      <section className="space-y-3 rounded-card bg-surface shadow-card p-4">
        <h2 className="text-sm font-semibold text-ink">Gasto por prestador/fornecedor</h2>

        {porPessoa.length === 0 ? (
          <p className="text-xs text-ink-soft">
            Quando você registrar um pagamento, ele aparece agrupado aqui — sem precisar cadastrar
            ninguém.
          </p>
        ) : (
          <ul className="space-y-3">
            {porPessoa.map((pessoa) => (
              <li key={pessoa.nome}>
                <Link
                  href={`/obras/${id}/prestador/${encodeURIComponent(pessoa.nome)}`}
                  className="block space-y-1"
                >
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink">
                      {pessoa.nome}
                      {pessoa.tipo && (
                        <span className="ml-1 text-[11px] text-ink-soft">· {pessoa.tipo}</span>
                      )}
                    </span>
                    <span className="shrink-0 font-medium text-ink">
                      {formatarReais(pessoa.total)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: maiorGasto > 0 ? `${(pessoa.total / maiorGasto) * 100}%` : "0%" }}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pagamentos.length > 0 && (
        <section className="space-y-3 rounded-card bg-surface shadow-card p-4">
          <h2 className="text-sm font-semibold text-ink">Pagamentos registrados</h2>
          <PagamentosEditaveis obraId={id} pagamentos={pagamentos} fases={(fases ?? []) as Fase[]} />
        </section>
      )}

      <div className="flex gap-3">
        <section className="flex flex-1 items-center justify-between rounded-card bg-surface shadow-card p-4">
          <div>
            <p className="text-xs text-ink-soft">A comprar</p>
            <p className="font-display text-xl font-bold text-pending">{aComprar}</p>
          </div>
          <Link href={`/obras/${id}/pendencias`} className="text-xs text-primary underline">
            ver
          </Link>
        </section>

        <section className="flex flex-1 items-center justify-between rounded-card bg-surface shadow-card p-4">
          <div>
            <p className="text-xs text-ink-soft">Orçamentos</p>
            <p className="font-display text-xl font-bold text-ink">{orcamentos}</p>
          </div>
          <Link href={`/obras/${id}/orcamentos`} className="text-xs text-primary underline">
            ver
          </Link>
        </section>
      </div>

      {fotosRecentes.length > 0 && (
        <section className="space-y-3 rounded-card bg-surface shadow-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Fotos recentes</h2>
            <Link href={`/obras/${id}/documentacao`} className="text-xs text-primary underline">
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
    </div>
  );
}
