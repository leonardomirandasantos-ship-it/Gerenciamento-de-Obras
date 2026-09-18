"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarReais } from "@/lib/pagamento";
import { filtrarArquivos, type FiltroDeArquivos } from "@/lib/documentacao";
import { fornecedorDoOrcamento, marcarFechado, type OrcamentoPayload } from "@/lib/orcamentos";
import { BotaoEncaminhar } from "./BotaoEncaminhar";
import { VerNoChat } from "./VerNoChat";
import type { Evento } from "@/lib/types";

const FILTROS: { id: FiltroDeArquivos; nome: string }[] = [
  { id: "todos", nome: "Todos" },
  { id: "orcamentos", nome: "Orçamentos" },
  { id: "outros", nome: "Outros" },
];

function iconeDo(evento: Evento): string {
  const anexo = (evento.anexos ?? [])[0];
  if (anexo?.tipo === "video") return "🎬";
  if (anexo?.tipo === "foto") return "🖼️";
  if (anexo?.tipo === "pdf") return "📄";
  return "💬";
}

function textoDeBusca(evento: Evento): string {
  const payload = evento.payload as OrcamentoPayload;
  return [
    payload.fileName,
    fornecedorDoOrcamento(payload),
    payload.product,
    payload.category,
    ...(payload.items ?? []),
    evento.raw_text,
    evento.caption,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function CartaoDeArquivo({ obraId, evento }: { obraId: string; evento: Evento }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const payload = evento.payload as OrcamentoPayload;
  const ehOrcamento = evento.kind === "E8_orcamento";
  const emDuvida = evento.kind === "unclassified";
  const anexo = (evento.anexos ?? [])[0];
  const fornecedor = fornecedorDoOrcamento(payload);
  const titulo =
    evento.caption ||
    payload.product ||
    payload.fileName ||
    evento.raw_text?.slice(0, 60) ||
    (ehOrcamento ? "Orçamento" : "Arquivo");

  async function alternarFechado() {
    setSalvando(true);
    await marcarFechado(evento, !payload.closed);
    setSalvando(false);
    router.refresh();
  }

  return (
    <li className="space-y-2 rounded-card bg-surface p-3 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-surface-alt text-lg">
          {iconeDo(evento)}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="line-clamp-2 font-medium text-ink">{titulo}</p>
          {fornecedor && <p className="text-xs text-ink-soft">{fornecedor}</p>}
          {payload.amount !== undefined && (
            <p className="text-sm font-medium text-ink">{formatarReais(payload.amount)}</p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-micro text-ink-soft">
            <span>{new Date(evento.received_at).toLocaleDateString("pt-BR")}</span>
            {ehOrcamento && (
              <span
                className="chip"
                style={{ "--chip": payload.closed ? "var(--done)" : "var(--info)" } as React.CSSProperties}
              >
                {payload.closed ? "✓ fechado" : "orçamento"}
              </span>
            )}
            {emDuvida && (
              <span className="chip" style={{ "--chip": "var(--unclassified)" } as React.CSSProperties}>
                orçamento ou gasto?
              </span>
            )}
          </div>
        </div>
      </div>

      {payload.items && payload.items.length > 0 && (
        <p className="line-clamp-2 text-micro text-ink-soft">{payload.items.join(" · ")}</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2">
        {anexo && (
          <a href={anexo.url} target="_blank" rel="noreferrer" className="text-micro text-primary underline">
            abrir
          </a>
        )}
        {anexo && <BotaoEncaminhar anexos={evento.anexos ?? []} descricao={titulo} />}
        <VerNoChat obraId={obraId} eventoId={evento.id} />
        {ehOrcamento && (
          <button
            type="button"
            onClick={alternarFechado}
            disabled={salvando}
            className="ml-auto shrink-0 text-micro font-semibold text-primary underline disabled:opacity-50"
          >
            {salvando ? "salvando…" : payload.closed ? "desfazer fechado" : "fechei com esse"}
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * A metade "Arquivos" da Documentação (D148): orçamentos, contratos, projetos,
 * notas. Substitui a antiga página de Orçamentos, que só se achava pelo card
 * do Resumo — o cliente procurou na Documentação e não achou.
 */
export function ListaArquivos({
  obraId,
  eventos,
  filtroInicial,
  onFiltro,
}: {
  obraId: string;
  eventos: Evento[];
  filtroInicial: FiltroDeArquivos;
  onFiltro: (filtro: FiltroDeArquivos) => void;
}) {
  const [filtro, setFiltro] = useState<FiltroDeArquivos>(filtroInicial);
  const [busca, setBusca] = useState("");

  if (eventos.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-center text-sm text-ink-soft">
          Orçamentos, contratos, projetos e outros PDFs que você mandar na conversa
          ficam guardados aqui.
        </p>
      </div>
    );
  }

  const termo = busca.trim().toLowerCase();
  const doFiltro = filtrarArquivos(eventos, filtro);
  const visiveis = termo ? doFiltro.filter((e) => textoDeBusca(e).includes(termo)) : doFiltro;

  return (
    <div className="flex-1 space-y-4 overflow-y-auto p-4 pb-28">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTROS.map((opcao) => (
          <button
            key={opcao.id}
            type="button"
            onClick={() => {
              setFiltro(opcao.id);
              onFiltro(opcao.id);
            }}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
              filtro === opcao.id ? "border-primary bg-primary text-white" : "border-line text-ink-soft"
            }`}
          >
            {opcao.nome} · {filtrarArquivos(eventos, opcao.id).length}
          </button>
        ))}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por fornecedor, produto ou nome"
        className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
      />

      <ul className="space-y-2">
        {visiveis.map((evento) => (
          <CartaoDeArquivo key={evento.id} obraId={obraId} evento={evento} />
        ))}
      </ul>

      {visiveis.length === 0 && (
        <p className="text-sm text-ink-soft">
          {termo ? "Nada encontrado com esse termo." : "Nada aqui ainda."}
        </p>
      )}
    </div>
  );
}
