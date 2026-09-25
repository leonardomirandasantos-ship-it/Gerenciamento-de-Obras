import { createClient } from "@/lib/supabase/server";
import { ConversaClient } from "@/components/obra/ConversaClient";
import { detectarSugestoes } from "@/lib/suggestions";
import {
  carregarEventosComAnexos,
  contarEventos,
  MENSAGENS_POR_PAGINA,
} from "@/lib/carregarEventos";
import { ambientesDaObra } from "@/lib/ambientes";
import { eventosDaConversa, progressoDasListas } from "@/lib/conversa";
import type { Fase, SugestaoRegistro } from "@/lib/types";

export default async function ConversaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mensagens?: string }>;
}) {
  const [{ id }, { mensagens }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  // A conversa abre no fim, então carrega o fim (D169). A obra inteira só
  // chega se ela pedir — com mil mensagens, carregar tudo para mostrar as
  // últimas vinte é trabalho jogado fora a cada troca de aba.
  const limite = Math.max(MENSAGENS_POR_PAGINA, Number(mensagens) || 0);

  const [eventos, total, { data: fases }, { data: registros }, { data: obra }, { data: favorecidos }] =
    await Promise.all([
      carregarEventosComAnexos(supabase, id, undefined, { limite }),
      contarEventos(supabase, id),
      supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
      supabase.from("sugestoes").select("*").eq("obra_id", id),
      supabase.from("obras").select("current_phase_id").eq("id", id).single(),
      supabase.from("favorecidos").select("name, type").eq("obra_id", id),
    ]);

  // Sugestão olha só a janela carregada; a aba de Pendências continua olhando
  // a obra inteira, e é lá que elas moram de verdade (D122).
  const sugestoes = detectarSugestoes(
    eventos,
    (registros ?? []) as SugestaoRegistro[],
    favorecidos ?? [],
    (fases ?? []) as Fase[],
    obra?.current_phase_id ?? null,
  );

  // O que a obra já usa vai junto no pedido de transcrição: assim o modelo
  // devolve "José Costa" e "Banheiros" em vez de inventar variações (D125).
  const contexto = {
    fases: ((fases ?? []) as Fase[]).map((fase) => fase.name),
    favorecidos: (favorecidos ?? []).map((f) => f.name),
    ambientes: ambientesDaObra(eventos.filter((e) => e.kind === "E3_decisao")),
  };

  return (
    <ConversaClient
      obraId={id}
      eventos={eventosDaConversa(eventos)}
      progressos={progressoDasListas(eventos)}
      fases={fases ?? []}
      sugestoes={sugestoes}
      faseAtualId={obra?.current_phase_id ?? null}
      contexto={contexto}
      anteriores={Math.max(0, total - eventos.length)}
      proximaPagina={limite + MENSAGENS_POR_PAGINA}
    />
  );
}
