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

  // Documentação é o álbum da OBRA, não o arquivo financeiro (D105).
  // Comprovante de pagamento e orçamento têm casa própria — o histórico da
  // pessoa e a aba de orçamentos — e aqui só poluiriam a evolução da obra.
  const daObra = eventos.filter(
    (evento) => evento.kind !== "E7_pagamento" && evento.kind !== "E8_orcamento",
  );

  return <GaleriaDocumentacao obraId={id} eventos={daObra} fases={fases ?? []} />;
}
