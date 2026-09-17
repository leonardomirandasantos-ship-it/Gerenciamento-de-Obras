import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { detectarSugestoes } from "@/lib/suggestions";
import { formatarReais, totalPago } from "@/lib/pagamento";
import { RegistrosEditaveis } from "@/components/obra/RegistrosEditaveis";
import type { ChecklistPayload, Fase, SugestaoRegistro } from "@/lib/types";

export default async function ResumoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: registros }, { data: fases }] = await Promise.all([
    carregarEventosComAnexos(supabase, id),
    supabase.from("sugestoes").select("*").eq("obra_id", id),
    supabase
      .from("fases")
      .select("*")
      .eq("obra_id", id)
      .order("order", { ascending: true }),
  ]);

  const sugestoes = detectarSugestoes(
    eventos,
    (registros ?? []) as SugestaoRegistro[],
  );
  const pagamentos = eventos.filter((evento) => evento.kind === "E7_pagamento");
  const fotos = eventos.flatMap((evento) =>
    (evento.anexos ?? []).filter((anexo) => anexo.tipo === "foto"),
  );
  const aComprar = eventos
    .filter((evento) => evento.kind === "E2_checklist")
    .flatMap((evento) => (evento.payload as ChecklistPayload).items ?? [])
    .filter((item) => item.status === "falta").length;

  const ultimos = [...eventos].reverse().slice(0, 5);

  const cartoes = [
    {
      rotulo: "Gasto registrado",
      valor: formatarReais(totalPago(pagamentos)),
      href: `/obras/${id}/dash`,
    },
    {
      rotulo: "A comprar",
      valor: String(aComprar),
      href: `/obras/${id}/pendencias`,
    },
    {
      rotulo: "Fotos",
      valor: String(fotos.length),
      href: `/obras/${id}/documentacao`,
    },
    {
      rotulo: "Loops abertos",
      valor: String(sugestoes.length),
      href: `/obras/${id}/pendencias`,
    },
  ];

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-3">
        {cartoes.map((cartao) => (
          <Link
            key={cartao.rotulo}
            href={cartao.href}
            className="rounded-card border border-line bg-surface p-3"
          >
            <p className="text-xs text-ink-soft">{cartao.rotulo}</p>
            <p className="font-display text-lg font-bold text-ink">
              {cartao.valor}
            </p>
          </Link>
        ))}
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Últimos registros
          </h2>
          <Link
            href={`/obras/${id}/conversa`}
            className="text-xs text-primary underline"
          >
            abrir conversa
          </Link>
        </div>

        {ultimos.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Nada registrado ainda. Comece jogando algo na conversa.
          </p>
        ) : (
          <RegistrosEditaveis
            eventos={ultimos}
            fases={(fases ?? []) as Fase[]}
          />
        )}
      </section>

      <Link
        href={`/obras/${id}/configuracoes`}
        className="block rounded-card border border-line bg-surface p-3 text-sm text-primary underline"
      >
        Configurações da obra e fases
      </Link>
    </div>
  );
}
