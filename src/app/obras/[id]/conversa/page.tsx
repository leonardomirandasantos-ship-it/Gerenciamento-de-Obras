import { createClient } from "@/lib/supabase/server";
import { ConversaClient } from "@/components/obra/ConversaClient";
import type { Anexo, Evento } from "@/lib/types";

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: eventos }, { data: fases }] = await Promise.all([
    supabase
      .from("eventos")
      .select("*, anexos(*)")
      .eq("obra_id", id)
      .eq("deleted", false)
      .order("received_at", { ascending: true }),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
  ]);

  const eventosComUrls: Evento[] = await Promise.all(
    (eventos ?? []).map(async (evento) => {
      const anexos: Anexo[] = await Promise.all(
        ((evento.anexos ?? []) as Anexo[]).map(async (anexo) => {
          const { data } = await supabase.storage.from("anexos").createSignedUrl(anexo.url, 60 * 60);
          return { ...anexo, url: data?.signedUrl ?? anexo.url };
        }),
      );
      return { ...evento, anexos } as Evento;
    }),
  );

  return <ConversaClient obraId={id} eventos={eventosComUrls} fases={fases ?? []} />;
}
