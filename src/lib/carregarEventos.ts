import type { createClient } from "./supabase/server";
import type { Anexo, Evento, EventoKind } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Carrega eventos da obra já com as URLs assinadas dos anexos (o bucket é
 * privado). Usado pela conversa e pelas lentes — nenhuma delas captura (D13).
 *
 * As URLs são assinadas em UMA chamada para todos os anexos: uma chamada por
 * anexo deixava a obra visivelmente lenta quando havia muitas fotos.
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
  const eventos = (data ?? []) as (Evento & { anexos?: Anexo[] })[];

  const caminhos = eventos.flatMap((evento) =>
    (evento.anexos ?? []).map((anexo) => anexo.url),
  );

  if (caminhos.length === 0) {
    return eventos.map((evento) => ({ ...evento, anexos: evento.anexos ?? [] }));
  }

  const { data: assinadas } = await supabase.storage
    .from("anexos")
    .createSignedUrls(caminhos, 60 * 60);

  const porCaminho = new Map(
    (assinadas ?? []).map((item) => [item.path ?? "", item.signedUrl]),
  );

  return eventos.map((evento) => ({
    ...evento,
    anexos: (evento.anexos ?? []).map((anexo) => ({
      ...anexo,
      url: porCaminho.get(anexo.url) ?? anexo.url,
    })),
  }));
}
