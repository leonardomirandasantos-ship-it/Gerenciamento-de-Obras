import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { ListaOrcamentos } from "@/components/obra/ListaOrcamentos";

export default async function OrcamentosPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const eventos = await carregarEventosComAnexos(supabase, id, ["E8_orcamento"]);

  return <ListaOrcamentos obraId={id} eventos={eventos} />;
}
