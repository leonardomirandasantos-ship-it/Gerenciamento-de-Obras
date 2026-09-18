import { createClient } from "@/lib/supabase/server";
import { carregarEventosComAnexos } from "@/lib/carregarEventos";
import { Documentacao } from "@/components/obra/Documentacao";
import {
  eventosDaGaleria,
  eventosDeArquivos,
  filtroDoParametro,
  vistaDoParametro,
} from "@/lib/documentacao";

export default async function DocumentacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string; filtro?: string }>;
}) {
  const [{ id }, { ver, filtro }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const [eventos, { data: fases }] = await Promise.all([
    carregarEventosComAnexos(supabase, id),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
  ]);

  // Tudo que ela mandou que não é pagamento (D148): fotos da obra de um lado,
  // orçamentos e demais arquivos do outro. Comprovante segue fora (D105).
  return (
    <Documentacao
      obraId={id}
      fotos={eventosDaGaleria(eventos)}
      arquivos={eventosDeArquivos(eventos)}
      fases={fases ?? []}
      vistaInicial={vistaDoParametro(ver)}
      filtroInicial={filtroDoParametro(filtro)}
    />
  );
}
