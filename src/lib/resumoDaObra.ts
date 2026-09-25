import { detectarSugestoes } from "./suggestions";
import { hojeIso, itensAComprar, prazosAbertos } from "./pendencias";
import type { createClient } from "./supabase/server";
import type { Evento, SugestaoRegistro } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type ResumoDaObra = {
  atrasados: number;
  vencemHoje: number;
  /** O que vence primeiro, pelo nome — "massa corrida" diz mais que "1 prazo". */
  primeiro?: string;
  itensEmAberto: number;
  paraOrganizar: number;
};

export type TomDoAviso = "atrasado" | "hoje" | "organizar" | "calmo";

export type AvisoDaObra = {
  texto: string;
  /** Quantas outras coisas cobram junto — vira "+2", e nunca é cortado. */
  resto?: number;
  tom: TomDoAviso;
};

const LIMITE_DO_NOME = 28;

function curto(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim();
  return limpo.length <= LIMITE_DO_NOME ? limpo : `${limpo.slice(0, LIMITE_DO_NOME).trimEnd()}…`;
}

export function resumoDaObra(
  eventos: Evento[],
  registros: SugestaoRegistro[],
  favorecidos: { name: string; type: string | null }[],
  fases: { id: string; name: string }[] = [],
  faseAtualId: string | null = null,
  hoje = hojeIso(),
): ResumoDaObra {
  const prazos = prazosAbertos(eventos, hoje);
  const cobrando = prazos.filter((prazo) => prazo.situacao !== "futuro");

  return {
    atrasados: prazos.filter((prazo) => prazo.situacao === "atrasado").length,
    vencemHoje: prazos.filter((prazo) => prazo.situacao === "hoje").length,
    primeiro: cobrando[0]?.texto,
    itensEmAberto: itensAComprar(eventos),
    paraOrganizar: detectarSugestoes(eventos, registros, favorecidos, fases, faseAtualId).length,
  };
}

/**
 * A segunda linha do card da obra (D151): UMA frase, a mais urgente, e só
 * quando há o que dizer. Dois contadores fixos em toda obra viravam parede de
 * número — com cinco obras, nada chamava atenção. O silêncio é o sinal.
 *
 * A escada é: atrasado > vence hoje > a IA está na dúvida > volume em aberto.
 * O nome da coisa vem junto porque é ele que faz sair de casa; o número
 * sozinho só diz que existe algo.
 */
export function avisoDaObra(resumo: ResumoDaObra): AvisoDaObra | null {
  const nome = resumo.primeiro ? curto(resumo.primeiro) : undefined;
  // O "+2" conta tudo que cobra hoje, atrasado ou não: quem lê quer saber
  // quantas coisas ainda faltam, não de qual balde cada uma veio.
  const resto = resumo.atrasados + resumo.vencemHoje - 1;

  if (resumo.atrasados > 0) {
    return nome
      ? { tom: "atrasado", texto: `Atrasado: ${nome}`, resto }
      : { tom: "atrasado", texto: `${resumo.atrasados} atrasados` };
  }

  if (resumo.vencemHoje > 0) {
    return nome
      ? { tom: "hoje", texto: `Hoje: ${nome}`, resto }
      : { tom: "hoje", texto: `${resumo.vencemHoje} para hoje` };
  }

  if (resumo.paraOrganizar > 0) {
    return {
      tom: "organizar",
      texto: `${resumo.paraOrganizar} ${resumo.paraOrganizar === 1 ? "coisa" : "coisas"} para organizar`,
    };
  }

  if (resumo.itensEmAberto > 0) {
    return {
      tom: "calmo",
      texto: `${resumo.itensEmAberto} ${resumo.itensEmAberto === 1 ? "item" : "itens"} em aberto`,
    };
  }

  return null;
}

/**
 * Os resumos de VÁRIAS obras de uma vez. São três consultas planas (um `in`
 * na lista de ids), nunca uma por obra — e sem anexo, que a tela inicial não
 * mostra foto de evento nenhum.
 *
 * Quando isso começar a pesar, o caminho é guardar o contador pronto no banco;
 * na escala de hoje (poucas obras, centenas de eventos) não vale a complexidade.
 */
export async function carregarResumos(
  supabase: ServerClient,
  obraIds: string[],
): Promise<Map<string, ResumoDaObra>> {
  const resumos = new Map<string, ResumoDaObra>();
  if (obraIds.length === 0) return resumos;

  const [
    { data: eventos },
    { data: registros },
    { data: favorecidos },
    { data: fases },
    { data: obrasComFase },
  ] = await Promise.all([
    supabase.from("eventos").select("*").in("obra_id", obraIds).eq("deleted", false),
    supabase.from("sugestoes").select("*").in("obra_id", obraIds),
    supabase.from("favorecidos").select("obra_id, name, type").in("obra_id", obraIds),
    supabase.from("fases").select("obra_id, id, name").in("obra_id", obraIds).order("order"),
    supabase.from("obras").select("id, current_phase_id").in("id", obraIds),
  ]);

  const faseAtualPorObra = new Map(
    ((obrasComFase ?? []) as { id: string; current_phase_id: string | null }[]).map((obra) => [
      obra.id,
      obra.current_phase_id,
    ]),
  );

  const hoje = hojeIso();

  for (const obraId of obraIds) {
    resumos.set(
      obraId,
      resumoDaObra(
        ((eventos ?? []) as Evento[]).filter((evento) => evento.obra_id === obraId),
        ((registros ?? []) as SugestaoRegistro[]).filter((r) => r.obra_id === obraId),
        ((favorecidos ?? []) as { obra_id: string; name: string; type: string | null }[]).filter(
          (f) => f.obra_id === obraId,
        ),
        ((fases ?? []) as { obra_id: string; id: string; name: string }[]).filter(
          (f) => f.obra_id === obraId,
        ),
        faseAtualPorObra.get(obraId) ?? null,
        hoje,
      ),
    );
  }

  return resumos;
}
