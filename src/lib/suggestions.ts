import { compararComChecklist, extrairItensDeLista, pareceMesmaLista } from "./checklist";
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
  dados: Record<string, unknown>;
};

const REGEX_DATA = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;
const REGEX_PALAVRA_DATA = /\bat[ée]\b|\bdia\b|\bprevis[ãa]o\b|\bprazo\b|\bamanh[ãa]\b/i;
const REGEX_TITULO_VALOR = /^(.{3,40}?)\s*[:–—-]\s*(.+)$/;

/** Data explícita no texto (Fluxo 2 caso C é oportunista: só quando ela cita data). */
export function extrairDataMencionada(texto: string): string | null {
  const achou = texto.match(REGEX_DATA);
  if (!achou) return null;

  const [, diaBruto, mesBruto, anoBruto] = achou;
  const dia = Number(diaBruto);
  const mes = Number(mesBruto);
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;

  // Evita falso positivo em fração de medida ("cotovelo 3/4", "cano 1 1/4"):
  // só aceita com dia de 2 dígitos, ano explícito ou palavra de tempo por perto.
  const pareceData =
    diaBruto.length === 2 || Boolean(anoBruto) || REGEX_PALAVRA_DATA.test(texto);
  if (!pareceData) return null;

  const ano = anoBruto
    ? anoBruto.length === 2
      ? `20${anoBruto}`
      : anoBruto
    : `${new Date().getFullYear()}`;

  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

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

        if (checklistParecido && !casoSilenciado("B_status", registros) && !jaResolvida("B_status", evento.id, registros)) {
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
        } else if (
          itens.length >= 2 &&
          !casoSilenciado("A_checklist", registros) &&
          !jaResolvida("A_checklist", evento.id, registros)
        ) {
          sugestoes.push({
            caso: "A_checklist",
            eventoId: evento.id,
            gatilho: `Lista com ${itens.length} itens`,
            proposta: "Transformar essa lista em checklist?",
            porque: "Dá pra ir marcando o que já resolveu sem digitar de novo.",
            acaoLabel: "Criar checklist",
            dados: { itens, rawText: texto },
          });
        }
        continue;
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
        sugestoes.push({
          caso: "D_decisao",
          eventoId: evento.id,
          gatilho: "Parece uma decisão de acabamento",
          proposta: `Fixar "${title}" nas decisões da obra?`,
          porque: "Fica fácil consultar depois, sem procurar na conversa.",
          acaoLabel: "Fixar decisão",
          dados: { title, value },
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
        proposta: `Marcar ${new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR")} como prazo disso?`,
        porque: "Aparece no calendário da obra, sem você cadastrar tarefa.",
        acaoLabel: "Marcar prazo",
        dados: { date: data },
      });
    }
  }

  return sugestoes;
}
