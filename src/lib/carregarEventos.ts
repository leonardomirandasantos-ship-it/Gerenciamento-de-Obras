import type { createClient } from "./supabase/server";
import type { Anexo, Evento, EventoKind } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Carrega eventos da obra já com as URLs assinadas dos anexos (o bucket é
 * privado). Usado pela conversa e pelas lentes — nenhuma delas captura (D13).
 */
export async function carregarEventosComAnexos(
  supabase: ServerClient,
  obraId: string,
  kinds?: EventoKind[],
): Promise<Evento[]> {
  let query = supabase
    .from("eventos")
    .select("*, anexos(*)")
    .eq("obra_id", obraId)
    .eq("deleted", false);

  if (kinds && kinds.length > 0) {
    query = query.in("kind", kinds);
  }

  const { data } = await query.order("received_at", { ascending: true });

  return Promise.all(
    (data ?? []).map(async (evento) => {
      const anexos: Anexo[] = await Promise.all(
        ((evento.anexos ?? []) as Anexo[]).map(async (anexo) => {
          const { data: assinada } = await supabase.storage
            .from("anexos")
            .createSignedUrl(anexo.url, 60 * 60);
          return { ...anexo, url: assinada?.signedUrl ?? anexo.url };
        }),
      );

      return { ...evento, anexos } as Evento;
    }),
  );
}
