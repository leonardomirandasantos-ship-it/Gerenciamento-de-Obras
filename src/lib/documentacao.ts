import type { Evento } from "./types";

/**
 * O que entra em cada metade da Documentação (D148). A regra é a do cliente:
 * "documentação é tudo que eu mandei que não é pagamento". Comprovante fica no
 * histórico da pessoa e no Resumo; o resto da obra fica aqui, separado em
 * Fotos (o álbum, com fases) e Arquivos (orçamento, contrato, projeto, nota).
 */

export type VistaDaDocumentacao = "fotos" | "arquivos";
export type FiltroDeArquivos = "todos" | "orcamentos" | "outros";

/** Álbum da obra: evolução, não arquivo financeiro (D105). */
export function eventosDaGaleria(eventos: Evento[]): Evento[] {
  return eventos.filter(
    (evento) => evento.kind !== "E7_pagamento" && evento.kind !== "E8_orcamento",
  );
}

/**
 * Todo orçamento (PDF, foto ou só texto com valor) e todo PDF ou vídeo que
 * não seja comprovante. Antes do D148 contrato e projeto em PDF não apareciam
 * em aba nenhuma: só existiam rolando a conversa.
 */
export function eventosDeArquivos(eventos: Evento[]): Evento[] {
  return eventos
    .filter((evento) => {
      if (evento.kind === "E7_pagamento") return false;
      if (evento.kind === "E8_orcamento") return true;
      return (evento.anexos ?? []).some((anexo) => anexo.tipo === "pdf" || anexo.tipo === "video");
    })
    .sort((a, b) => b.received_at.localeCompare(a.received_at));
}

export function filtrarArquivos(eventos: Evento[], filtro: FiltroDeArquivos): Evento[] {
  if (filtro === "todos") return eventos;
  if (filtro === "orcamentos") return eventos.filter((e) => e.kind === "E8_orcamento");
  return eventos.filter((e) => e.kind !== "E8_orcamento");
}

export function vistaDoParametro(valor: string | undefined): VistaDaDocumentacao {
  return valor === "arquivos" ? "arquivos" : "fotos";
}

export function filtroDoParametro(valor: string | undefined): FiltroDeArquivos {
  return valor === "orcamentos" || valor === "outros" ? valor : "todos";
}
