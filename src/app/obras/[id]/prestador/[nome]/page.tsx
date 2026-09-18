import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import {
  agruparPorFavorecido,
  formatarReais,
  normalizarFavorecido,
  type Favorecido,
  type PagamentoPayload,
} from "@/lib/pagamento";
import { EditarFavorecido } from "@/components/obra/EditarFavorecido";
import { BotaoEditarRegistro } from "@/components/obra/BotaoEditarRegistro";
import { BotaoEncaminhar } from "@/components/obra/BotaoEncaminhar";
import type { Fase } from "@/lib/types";

export default async function PrestadorPage({
  params,
}: {
  params: Promise<{ id: string; nome: string }>;
}) {
  const { id, nome } = await params;
  const nomeDecodificado = decodeURIComponent(nome);
  const supabase = await createClient();

  const [eventos, { data: fases }, { data: favorecidos }] = await Promise.all([
    carregarEventosComAnexos(supabase, id, ["E7_pagamento"]),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
    supabase.from("favorecidos").select("*").eq("obra_id", id),
  ]);

  const grupos = agruparPorFavorecido(eventos, (favorecidos ?? []) as Favorecido[]);
  const pessoa = grupos.find(
    (grupo) => normalizarFavorecido(grupo.nome) === normalizarFavorecido(nomeDecodificado),
  );

  if (!pessoa) {
    notFound();
  }

  const nomeFase = (faseId: string | null) =>
    ((fases ?? []) as Fase[]).find((fase) => fase.id === faseId)?.name ?? null;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
      <Link href={`/obras/${id}/resumo`} className="text-caption text-ink-soft underline">
        ← voltar ao resumo
      </Link>

      <section className="space-y-2 rounded-card bg-surface p-4 shadow-card">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display text-lg font-bold text-primary">
            {pessoa.nome.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-section font-bold text-ink">{pessoa.nome}</p>
            {pessoa.tipo ? (
              <span className="chip" style={{ "--chip": "var(--primary)" } as React.CSSProperties}>
                {pessoa.tipo}
              </span>
            ) : (
              <p className="text-micro text-ink-soft">sem tipo definido</p>
            )}
          </div>
          <EditarFavorecido
            obraId={id}
            nomeAtual={pessoa.nome}
            tipoAtual={pessoa.tipo}
            eventos={pessoa.eventos}
          />
        </div>

        <div className="flex gap-4 pt-1">
          <div>
            <p className="text-micro text-ink-soft">Total pago</p>
            <p className="font-display font-bold text-ink">{formatarReais(pessoa.total)}</p>
          </div>
          <div>
            <p className="text-micro text-ink-soft">Pagamentos</p>
            <p className="font-display font-bold text-ink">{pessoa.pagamentos}</p>
          </div>
          {pessoa.desde && (
            <div>
              <p className="text-micro text-ink-soft">Desde</p>
              <p className="font-display font-bold text-ink">
                {new Date(pessoa.desde).toLocaleDateString("pt-BR")}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Histórico de pagamentos
        </h2>

        <ul className="space-y-2">
          {[...pessoa.eventos]
            .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
            .map((evento) => {
              const payload = evento.payload as PagamentoPayload;
              const comprovante = (evento.anexos ?? []).find((anexo) => anexo.tipo === "foto");
              const fase = nomeFase(evento.phase_id);

              return (
                <li
                  key={evento.id}
                  className="flex items-start gap-3 rounded-card bg-surface p-3 shadow-card"
                >
                  {comprovante ? (
                    <a href={comprovante.url} target="_blank" rel="noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={comprovante.url}
                        alt="comprovante"
                        className="h-14 w-14 rounded object-cover"
                      />
                    </a>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-surface-alt text-lg">
                      💸
                    </div>
                  )}

                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="font-display text-body font-bold text-ink">
                        {formatarReais(payload.amount ?? 0)}
                      </p>
                      <BotaoEditarRegistro
                        evento={evento}
                        fases={(fases ?? []) as Fase[]}
                        obraId={id}
                      />
                    </div>
                    {evento.raw_text && (
                      <p className="truncate text-micro text-ink-soft">{evento.raw_text}</p>
                    )}
                    <div className="flex items-center gap-2 text-micro text-ink-soft">
                      <span>{new Date(evento.received_at).toLocaleDateString("pt-BR")}</span>
                      {fase && (
                        <span className="rounded-full bg-surface-alt px-1.5 py-0.5">{fase}</span>
                      )}
                      <Link
                        href={`/obras/${id}/conversa#evento-${evento.id}`}
                        className="text-primary underline"
                      >
                        ver no chat
                      </Link>
                      {/* Encaminhar o comprovante é o motivo mais comum de
                          voltar nesta tela (D137). */}
                      {(evento.anexos ?? []).length > 0 && (
                        <BotaoEncaminhar
                          evento={evento}
                          descricao={`Comprovante — ${formatarReais(payload.amount ?? 0)} para ${pessoa.nome}`}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
        </ul>

        <p className="pt-2 text-[11px] text-ink-soft">
          Pagamentos agrupados pelo nome do favorecido. Edite ou organize quando quiser.
        </p>
      </section>
    </div>
  );
}
