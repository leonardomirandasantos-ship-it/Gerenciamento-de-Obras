import { createClient } from "@/lib/supabase/server";
import { ConversaClient } from "@/components/obra/ConversaClient";
import { detectarSugestoes } from "@/lib/suggestions";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { ambientesDaObra } from "@/lib/ambientes";
import type { Fase, SugestaoRegistro } from "@/lib/types";

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: fases }, { data: registros }, { data: obra }, { data: favorecidos }] =
    await Promise.all([
      carregarEventosComAnexos(supabase, id),
      supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
      supabase.from("sugestoes").select("*").eq("obra_id", id),
      supabase.from("obras").select("current_phase_id").eq("id", id).single(),
      supabase.from("favorecidos").select("name, type").eq("obra_id", id),
    ]);

  const sugestoes = detectarSugestoes(
    eventos,
    (registros ?? []) as SugestaoRegistro[],
    favorecidos ?? [],
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
      eventos={eventos}
      fases={fases ?? []}
      sugestoes={sugestoes}
      faseAtualId={obra?.current_phase_id ?? null}
      contexto={contexto}
    />
  );
}
