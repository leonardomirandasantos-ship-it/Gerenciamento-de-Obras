"use client";

import { useState } from "react";
import Link from "next/link";
import { formatarReais } from "@/lib/pagamento";
import type { Evento } from "@/lib/types";

type OrcamentoPayload = {
  fileName?: string;
  supplier?: string;
  product?: string;
  amount?: number;
  category?: string;
};

export function ListaOrcamentos({ obraId, eventos }: { obraId: string; eventos: Evento[] }) {
  const [busca, setBusca] = useState("");

  const filtrados = eventos.filter((evento) => {
    if (busca.trim() === "") return true;
    const payload = evento.payload as OrcamentoPayload;
    const texto = [
      payload.fileName,
      payload.supplier,
      payload.product,
      payload.category,
      evento.raw_text,
      evento.caption,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return texto.includes(busca.toLowerCase());
  });

  if (eventos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-ink-soft">
          Mande orçamentos aqui para arquivar e achar depois.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4">
      <Link href={`/obras/${obraId}/dash`} className="text-xs text-ink-soft underline">
        ← voltar ao dash
      </Link>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por fornecedor ou produto"
        className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
      />

      <ul className="space-y-2">
        {filtrados.map((evento) => {
          const payload = evento.payload as OrcamentoPayload;
          const anexo = (evento.anexos ?? [])[0];
          const titulo =
            payload.product || payload.fileName || evento.raw_text?.slice(0, 60) || "Orçamento";

          return (
            <li key={evento.id} className="flex items-start gap-3 rounded-card border border-line bg-surface p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-alt text-lg">
                📄
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate font-medium text-ink">{titulo}</p>
                {payload.supplier && <p className="text-xs text-ink-soft">{payload.supplier}</p>}
                {payload.amount !== undefined && (
                  <p className="text-sm font-medium text-ink">{formatarReais(payload.amount)}</p>
                )}
                <div className="flex items-center gap-2 text-[11px] text-ink-soft">
                  <span>{new Date(evento.received_at).toLocaleDateString("pt-BR")}</span>
                  {payload.category && (
                    <span className="rounded-full bg-surface-alt px-1.5 py-0.5">{payload.category}</span>
                  )}
                  {anexo && (
                    <a href={anexo.url} target="_blank" rel="noreferrer" className="text-primary underline">
                      abrir anexo
                    </a>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {filtrados.length === 0 && (
        <p className="text-sm text-ink-soft">Nenhum orçamento encontrado com esse termo.</p>
      )}
    </div>
  );
}
