import { createClient } from "@/lib/supabase/server";
import { ConversaClient } from "@/components/obra/ConversaClient";
import { detectarSugestoes } from "@/lib/suggestions";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import type { SugestaoRegistro } from "@/lib/types";

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: fases }, { data: registros }] = await Promise.all([
    carregarEventosComAnexos(supabase, id),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
    supabase.from("sugestoes").select("*").eq("obra_id", id),
  ]);

  const sugestoes = detectarSugestoes(eventos, (registros ?? []) as SugestaoRegistro[]);

  return (
    <ConversaClient
      obraId={id}
      eventos={eventos}
      fases={fases ?? []}
      sugestoes={sugestoes}
    />
  );
}
