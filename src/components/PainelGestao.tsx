"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lancamento } from "./FeedLancamentos";

function formatarValor(valor: number | null) {
  if (valor === null) return "—";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PainelGestao({ lancamentos }: { lancamentos: Lancamento[] }) {
  const router = useRouter();

  const pendencias = lancamentos.filter(
    (l) => l.tipo === "gasto_reembolsar" && l.status === "pendente",
  );
  const pagamentosFeitos = lancamentos.filter((l) => l.tipo === "pagamento_feito");

  const totalGasto = lancamentos
    .filter((l) => l.tipo === "gasto_reembolsar")
    .reduce((soma, l) => soma + (l.valor ?? 0), 0);
  const totalPendente = pendencias.reduce((soma, l) => soma + (l.valor ?? 0), 0);
  const totalPago = pagamentosFeitos.reduce((soma, l) => soma + (l.valor ?? 0), 0);

  async function marcarComoReembolsado(id: string) {
    const supabase = createClient();
    await supabase.from("lancamentos").update({ status: "reembolsado" }).eq("id", id);
    router.refresh();
  }

  return (
    <div className="space-y-6 overflow-y-auto p-4">
      <div className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-md border border-neutral-200 p-2">
          <p className="text-neutral-400">Gasto total</p>
          <p className="font-medium">{formatarValor(totalGasto)}</p>
        </div>
        <div className="rounded-md border border-neutral-200 p-2">
          <p className="text-neutral-400">Pendente</p>
          <p className="font-medium text-amber-600">{formatarValor(totalPendente)}</p>
        </div>
        <div className="rounded-md border border-neutral-200 p-2">
          <p className="text-neutral-400">Pago a terceiros</p>
          <p className="font-medium text-green-600">{formatarValor(totalPago)}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Pendências de reembolso</h3>
        {pendencias.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma pendência agora.</p>
        ) : (
          <ul className="space-y-2">
            {pendencias.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-md border border-neutral-200 p-3 text-sm"
              >
                <div>
                  <p>{l.descricao}</p>
                  <p className="text-xs text-neutral-500">
                    {formatarValor(l.valor)}
                    {l.pessoa_relacionada && ` · ${l.pessoa_relacionada}`}
                  </p>
                </div>
                <button
                  onClick={() => marcarComoReembolsado(l.id)}
                  className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  Marcar como reembolsado
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Pagamentos feitos por pessoa</h3>
        {pagamentosFeitos.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum pagamento registrado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {pagamentosFeitos.map((l) => (
              <li
                key={l.id}
                className="rounded-md border border-neutral-200 p-3 text-sm"
              >
                <p>{l.descricao}</p>
                <p className="text-xs text-neutral-500">
                  {formatarValor(l.valor)}
                  {l.pessoa_relacionada && ` · ${l.pessoa_relacionada}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
