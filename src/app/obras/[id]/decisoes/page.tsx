import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { ListaDecisoes } from "@/components/obra/ListaDecisoes";

export default async function DecisoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const eventos = await carregarEventosComAnexos(supabase, id, ["E3_decisao"]);

  return <ListaDecisoes obraId={id} eventos={eventos} />;
}
