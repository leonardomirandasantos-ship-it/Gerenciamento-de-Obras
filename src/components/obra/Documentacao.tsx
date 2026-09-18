"use client";

import { useState } from "react";
import { GaleriaDocumentacao } from "./GaleriaDocumentacao";
import { ListaArquivos } from "./ListaArquivos";
import type { FiltroDeArquivos, VistaDaDocumentacao } from "@/lib/documentacao";
import type { Evento, Fase } from "@/lib/types";

/**
 * Documentação = tudo o que ela mandou que não é pagamento (D148), numa aba
 * só, com duas metades. A troca é estado local — instantânea, sem ida ao
 * servidor — e o endereço acompanha via `replaceState`, para o "+" do layout
 * saber o que oferecer e para o card do Resumo abrir direto nos orçamentos.
 */
export function Documentacao({
  obraId,
  fotos,
  arquivos,
  fases,
  vistaInicial,
  filtroInicial,
}: {
  obraId: string;
  fotos: Evento[];
  arquivos: Evento[];
  fases: Fase[];
  vistaInicial: VistaDaDocumentacao;
  filtroInicial: FiltroDeArquivos;
}) {
  const [vista, setVista] = useState<VistaDaDocumentacao>(vistaInicial);
  const [filtro, setFiltro] = useState<FiltroDeArquivos>(filtroInicial);

  function atualizarEndereco(proximaVista: VistaDaDocumentacao, proximoFiltro: FiltroDeArquivos) {
    const params = new URLSearchParams();
    if (proximaVista === "arquivos") {
      params.set("ver", "arquivos");
      if (proximoFiltro !== "todos") params.set("filtro", proximoFiltro);
    }
    const busca = params.toString();
    window.history.replaceState(null, "", busca ? `?${busca}` : window.location.pathname);
  }

  const quantasFotos = fotos.reduce(
    (total, evento) => total + (evento.anexos ?? []).filter((a) => a.tipo === "foto").length,
    0,
  );

  const abas: { id: VistaDaDocumentacao; nome: string; total: number }[] = [
    { id: "fotos", nome: "Fotos", total: quantasFotos },
    { id: "arquivos", nome: "Arquivos", total: arquivos.length },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-4">
        <div className="flex rounded-card bg-surface-alt p-1" role="tablist">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={vista === aba.id}
              onClick={() => {
                setVista(aba.id);
                atualizarEndereco(aba.id, filtro);
              }}
              className={`flex-1 rounded-card py-2 text-sm font-semibold ${
                vista === aba.id ? "bg-surface text-ink shadow-card" : "text-ink-soft"
              }`}
            >
              {aba.nome} <span className="font-normal text-ink-soft">{aba.total}</span>
            </button>
          ))}
        </div>
      </div>

      {vista === "fotos" ? (
        <GaleriaDocumentacao obraId={obraId} eventos={fotos} fases={fases} />
      ) : (
        <ListaArquivos
          obraId={obraId}
          eventos={arquivos}
          filtroInicial={filtro}
          onFiltro={(proximo) => {
            setFiltro(proximo);
            atualizarEndereco("arquivos", proximo);
          }}
        />
      )}
    </div>
  );
}
