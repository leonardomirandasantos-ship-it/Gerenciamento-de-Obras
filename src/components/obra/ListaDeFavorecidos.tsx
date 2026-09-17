"use client";

import { useState } from "react";
import Link from "next/link";
import { formatarReais } from "@/lib/pagamento";

export type LinhaDeFavorecido = {
  nome: string;
  tipo: "prestador" | "fornecedor" | null;
  total: number;
  pagamentos: number;
};

const FILTROS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "prestador", rotulo: "Prestadores" },
  { valor: "fornecedor", rotulo: "Fornecedores" },
] as const;

export function ListaDeFavorecidos({
  obraId,
  pessoas,
}: {
  obraId: string;
  pessoas: LinhaDeFavorecido[];
}) {
  const [filtro, setFiltro] = useState<string>("todos");

  // O seletor só aparece quando há o que separar: com todo mundo sem tipo (ou
  // todo mundo do mesmo tipo) ele seria um controle que não muda nada.
  const tipos = new Set(pessoas.map((pessoa) => pessoa.tipo).filter(Boolean));
  const vale0Filtrar = tipos.size > 1 || (tipos.size === 1 && pessoas.some((p) => !p.tipo));

  const filtradas = pessoas.filter(
    (pessoa) => filtro === "todos" || pessoa.tipo === filtro,
  );
  const maiorGasto = pessoas[0]?.total ?? 0;

  return (
    <div className="space-y-3">
      {vale0Filtrar && (
        <div className="flex gap-2">
          {FILTROS.map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              onClick={() => setFiltro(opcao.valor)}
              className={`rounded-full border px-3 py-1.5 font-display text-caption font-semibold ${
                filtro === opcao.valor
                  ? "border-primary bg-primary text-white"
                  : "border-line text-ink-soft"
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      )}

      {filtradas.length === 0 ? (
        <p className="text-caption text-ink-soft">
          Ninguém marcado como {filtro} ainda. Abra a pessoa e defina o tipo.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {filtradas.map((pessoa) => (
            <li key={pessoa.nome}>
              {/* Linha inteira clicável com inicial e chevron: antes parecia
                  só um gráfico, e ninguém descobria que abria o histórico. */}
              <Link
                href={`/obras/${obraId}/prestador/${encodeURIComponent(pessoa.nome)}`}
                className="flex items-center gap-3 py-3 active:bg-surface-alt"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary">
                  {pessoa.nome.charAt(0).toUpperCase()}
                </span>

                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-display text-body font-bold text-ink">
                      {pessoa.nome}
                    </span>
                    <span className="shrink-0 font-display text-body font-bold text-ink">
                      {formatarReais(pessoa.total)}
                    </span>
                  </span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-alt">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{
                        width: maiorGasto > 0 ? `${(pessoa.total / maiorGasto) * 100}%` : "0%",
                      }}
                    />
                  </span>
                  <span className="block text-micro text-ink-soft">
                    {pessoa.pagamentos} {pessoa.pagamentos === 1 ? "pagamento" : "pagamentos"}
                    {pessoa.tipo ? ` · ${pessoa.tipo}` : " · sem tipo"}
                  </span>
                </span>

                <span aria-hidden className="shrink-0 text-lg text-ink-soft">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
