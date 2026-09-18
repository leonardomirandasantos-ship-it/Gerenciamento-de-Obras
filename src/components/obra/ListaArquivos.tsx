"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatarReais } from "@/lib/pagamento";
import { filtrarArquivos, type FiltroDeArquivos } from "@/lib/documentacao";
import { fornecedorDoOrcamento, marcarFechado, type OrcamentoPayload } from "@/lib/orcamentos";
import { paraBusca, textoDeBuscaDoArquivo, tituloDoArquivo } from "@/lib/nomeDoArquivo";
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

/**
 * A busca olha tudo — legenda dela, leitura da IA, nome original do arquivo,
 * fornecedor e itens orçados — mesmo que o cartão mostre um nome só (D149).
 * "box" acha a proposta da vidraçaria sem que "box" apareça na tela.
 */
function textoDeBusca(evento: Evento): string {
  const payload = evento.payload as OrcamentoPayload;
  return textoDeBuscaDoArquivo(evento, [
    payload.product,
    payload.category,
    ...(payload.items ?? []),
  ]);
}

function CartaoDeArquivo({ obraId, evento }: { obraId: string; evento: Evento }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);

  const payload = evento.payload as OrcamentoPayload;
  const ehOrcamento = evento.kind === "E8_orcamento";
  const emDuvida = evento.kind === "unclassified";
  const anexo = (evento.anexos ?? [])[0];
  const fornecedor = fornecedorDoOrcamento(payload);
  const titulo = tituloDoArquivo(evento);
  const valor = payload.amount !== undefined ? formatarReais(payload.amount) : undefined;

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
          <p className="line-clamp-2 break-words font-medium text-ink">{titulo}</p>
          {(fornecedor || valor) && (
            // Nome comprido corta; o valor nunca — é o que ela procura com o olho.
            <p className="flex gap-1 text-sm text-ink-soft">
              {fornecedor && <span className="truncate">{fornecedor}</span>}
              {fornecedor && valor && <span aria-hidden>·</span>}
              {valor && <span className="shrink-0 font-medium text-ink">{valor}</span>}
            </p>
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-2">
        {anexo && (
          <a href={anexo.url} target="_blank" rel="noreferrer" className="text-micro text-primary underline">
            abrir
          </a>
        )}
        {anexo && <BotaoEncaminhar evento={evento} descricao={titulo} />}
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

  const termo = paraBusca(busca.trim());
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
