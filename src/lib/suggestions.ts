import { compararComChecklist, extrairItensDeLista, pareceMesmaLista } from "./checklist";
import { extrairDataMencionada, formatarData } from "./datas";
import { detectarAmbientes } from "./ambientes";
import type {
  CasoSugestao,
  ChecklistPayload,
  DecisaoPayload,
  Evento,
  ListaPayload,
  SugestaoRegistro,
} from "./types";

export type Sugestao = {
  caso: CasoSugestao;
  eventoId: string;
  gatilho: string;
  proposta: string;
  porque: string;
  acaoLabel: string;
  /** Segunda ação de 1 toque, quando a escolha é binária (ex.: prestador/fornecedor). */
  acaoAlternativaLabel?: string;
  /** Chips de 1 toque, quando a escolha é entre várias opções simples. */
  opcoes?: { label: string; valor: string }[];
  /** Pede valor/favorecido direto no cartão (pagamento sem dados). */
  entradaPagamento?: boolean;
  dados: Record<string, unknown>;
};

const REGEX_TITULO_VALOR = /^(.{3,40}?)\s*[:–—-]\s*(.+)$/;

export function extrairTituloEValor(texto: string): { title: string; value: string } {
  const primeiraLinha = texto.split("\n")[0].trim();
  const achou = primeiraLinha.match(REGEX_TITULO_VALOR);

  if (achou) {
    return { title: achou[1].trim(), value: achou[2].trim() };
  }

  return {
    title: primeiraLinha.slice(0, 40),
    value: texto.trim(),
  };
}

/**
 * Quando há muitas sugestões, o que aparece primeiro importa. Fusão de status
 * e prazo vêm na frente porque fecham loop que a vida real deixou aberto.
 * A_checklist não é mais emitida (ver detectarSugestoes), mas o caso continua
 * no mapa porque existem registros antigos no banco.
 */
const PRIORIDADE: Record<CasoSugestao, number> = {
  B_status: 0,
  C_data: 1,
  H_pagamento_incompleto: 2,
  E_prestador: 3,
  D_decisao: 4,
  F_classificar: 5,
  G_fechar_dia: 6,
  A_checklist: 7,
};

export function ordenarPorPrioridade(sugestoes: Sugestao[]): Sugestao[] {
  return [...sugestoes].sort((a, b) => PRIORIDADE[a.caso] - PRIORIDADE[b.caso]);
}

function casoSilenciado(caso: CasoSugestao, registros: SugestaoRegistro[]): boolean {
  const ignoradas = registros.filter((r) => r.caso === caso && r.estado === "ignored").length;
  return ignoradas >= 2;
}

function jaResolvida(
  caso: CasoSugestao,
  eventoId: string,
  registros: SugestaoRegistro[],
): boolean {
  return registros.some(
    (r) =>
      r.caso === caso &&
      r.evento_id === eventoId &&
      (r.estado === "accepted" || r.estado === "ignored" || r.estado === "silenced"),
  );
}

/**
 * Engine única de detecção (Fluxo 2). Observa eventos já capturados — nunca a
 * captura — e devolve os "loops abertos" que valem uma ação de 1 toque.
 */
export function detectarSugestoes(
  eventos: Evento[],
  registros: SugestaoRegistro[],
): Sugestao[] {
  const sugestoes: Sugestao[] = [];
  const checklists = eventos.filter((e) => e.kind === "E2_checklist");

  for (const evento of eventos) {
    const texto = evento.raw_text ?? "";

    if (evento.kind === "E1_lista" && texto.trim()) {
      const payload = evento.payload as ListaPayload;
      if (!payload.linkedChecklistId) {
        const itens = extrairItensDeLista(texto);

        const checklistParecido = checklists
          .filter((c) => new Date(c.received_at) < new Date(evento.received_at))
          .map((c) => ({
            checklist: c,
            similaridade: compararComChecklist(itens, (c.payload as ChecklistPayload).items ?? []),
          }))
          .filter((par) => pareceMesmaLista(par.similaridade))
          .sort((a, b) => b.similaridade.proporcao - a.similaridade.proporcao)[0];

        // Não existe mais sugestão "transformar em checklist" (era A_checklist):
        // desde o D74/D76 a lista JÁ é marcável item a item na aba de
        // pendências, e a conversão acontece no primeiro toque. Perguntar de
        // novo fazia o app pedir permissão para algo que já estava feito.
        let ofereceu = false;

        if (checklistParecido && !casoSilenciado("B_status", registros) && !jaResolvida("B_status", evento.id, registros)) {
          ofereceu = true;
          const titulo = (checklistParecido.checklist.payload as ChecklistPayload).title ?? "checklist";
          sugestoes.push({
            caso: "B_status",
            eventoId: evento.id,
            gatilho: "Você mandou uma lista muito parecida com uma de antes",
            proposta: `Atualizar o status de "${titulo}" com o que veio agora?`,
            porque: `${checklistParecido.similaridade.casados} itens batem com esse checklist.`,
            acaoLabel: "Atualizar status",
            dados: { checklistId: checklistParecido.checklist.id, rawText: texto },
          });
        }

        // Só encerra aqui se já ofereci algo pra essa lista; senão deixo seguir
        // para o caso da data ("comprar cimento até 20/09" precisa virar prazo).
        if (ofereceu) continue;
      }
    }

    if (evento.kind === "E3_decisao" && texto.trim()) {
      const payload = evento.payload as DecisaoPayload;
      if (
        !payload.title &&
        !casoSilenciado("D_decisao", registros) &&
        !jaResolvida("D_decisao", evento.id, registros)
      ) {
        const { title, value } = extrairTituloEValor(texto);
        const ambientes = detectarAmbientes(texto);
        sugestoes.push({
          caso: "D_decisao",
          eventoId: evento.id,
          gatilho: ambientes.length > 0
            ? `Parece decisão de acabamento (${ambientes.join(", ")})`
            : "Parece uma decisão de acabamento",
          proposta: `Fixar "${title}" nas decisões da obra?`,
          porque: "Fica fácil consultar depois, filtrando por ambiente.",
          acaoLabel: "Fixar decisão",
          dados: { title, value, environment: ambientes[0], environments: ambientes },
        });
        continue;
      }
    }

    if (evento.kind === "E7_pagamento") {
      const pagamento = evento.payload as { amount?: number; payeeName?: string };
      const faltaDado = pagamento.amount === undefined || !pagamento.payeeName;

      if (
        faltaDado &&
        !casoSilenciado("H_pagamento_incompleto", registros) &&
        !jaResolvida("H_pagamento_incompleto", evento.id, registros)
      ) {
        sugestoes.push({
          caso: "H_pagamento_incompleto",
          eventoId: evento.id,
          gatilho: "Vi que é um pagamento, mas faltou um dado",
          proposta: pagamento.amount === undefined
            ? "Quanto foi e pra quem?"
            : "Pra quem foi esse pagamento?",
          porque: "Com valor e favorecido, ele entra no total por pessoa do resumo.",
          acaoLabel: "Salvar",
          entradaPagamento: true,
          dados: { amount: pagamento.amount, payeeName: pagamento.payeeName },
        });
        continue;
      }
    }

    if (evento.kind === "E7_pagamento") {
      const payload = evento.payload as { payeeName?: string; payeeType?: string };
      if (
        payload.payeeName &&
        !payload.payeeType &&
        !evento.favorecido_id &&
        !casoSilenciado("E_prestador", registros) &&
        !jaResolvida("E_prestador", evento.id, registros)
      ) {
        sugestoes.push({
          caso: "E_prestador",
          eventoId: evento.id,
          gatilho: `Reconheci um pagamento para ${payload.payeeName}`,
          proposta: `Cadastrar ${payload.payeeName} como prestador ou fornecedor?`,
          porque: "O total por pessoa já funciona sem isso — categorizar só deixa o resumo mais rico.",
          acaoLabel: "Prestador",
          acaoAlternativaLabel: "Fornecedor",
          dados: { payeeName: payload.payeeName },
        });
        continue;
      }
    }

    // Nada é descartado (D3), mas também não fica órfão: ofereço classificar
    // em 1 toque o que a heurística não deu conta.
    if (
      evento.kind === "unclassified" &&
      !casoSilenciado("F_classificar", registros) &&
      !jaResolvida("F_classificar", evento.id, registros)
    ) {
      sugestoes.push({
        caso: "F_classificar",
        eventoId: evento.id,
        gatilho: "Não consegui identificar isso sozinho",
        proposta: "O que é esse registro?",
        porque: "Cada tipo alimenta uma aba: pendência vira lista, gasto entra no resumo.",
        acaoLabel: "Classificar",
        opcoes: [
          { label: "Pendência", valor: "E1_lista" },
          { label: "Gasto", valor: "E7_pagamento" },
          { label: "Decisão", valor: "E3_decisao" },
          { label: "Foto da obra", valor: "E4_documentacao" },
          { label: "Orçamento", valor: "E8_orcamento" },
        ],
        dados: {},
      });
      continue;
    }

    const data = extrairDataMencionada(texto);
    const jaTemData = Boolean((evento.payload as { date?: string }).date);
    if (
      data &&
      !jaTemData &&
      !casoSilenciado("C_data", registros) &&
      !jaResolvida("C_data", evento.id, registros)
    ) {
      sugestoes.push({
        caso: "C_data",
        eventoId: evento.id,
        gatilho: "Você citou uma data",
        proposta: `Marcar ${formatarData(data)} como prazo disso?`,
        porque: "Aparece no calendário da obra, sem você cadastrar tarefa.",
        acaoLabel: "Marcar prazo",
        dados: { date: data },
      });
    }
  }

  return sugestoes;
}
