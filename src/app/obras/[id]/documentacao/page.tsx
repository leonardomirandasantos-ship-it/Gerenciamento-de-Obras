import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { GaleriaDocumentacao } from "@/components/obra/GaleriaDocumentacao";

export default async function DocumentacaoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [eventos, { data: fases }] = await Promise.all([
    carregarEventosComAnexos(supabase, id),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
  ]);

  return <GaleriaDocumentacao obraId={id} eventos={eventos} fases={fases ?? []} />;
}
