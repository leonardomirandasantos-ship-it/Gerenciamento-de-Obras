import { chaveSegura } from "./arquivos";
import type { createClient } from "./supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Onde a capa da obra mora no bucket privado (mesma raiz por usuário da RLS). */
export function caminhoDaCapa(userId: string, obraId: string, nomeArquivo: string): string {
  return `${userId}/obras/${obraId}/capa-${Date.now()}-${chaveSegura(nomeArquivo)}`;
}

/**
 * A capa fica no mesmo bucket privado dos anexos, então precisa de URL
 * assinada para ser exibida. Assina todas de uma vez — a home mostra a capa
 * de cada obra e uma chamada por obra deixaria a lista lenta.
 *
 * Tolera valor que já seja URL completa (dado antigo), devolvendo como está.
 */
export async function assinarCapas(
  supabase: ServerClient,
  caminhos: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const porCaminho = new Map<string, string>();
  const paraAssinar = caminhos.filter(
    (caminho): caminho is string => Boolean(caminho) && !caminho!.startsWith("http"),
  );

  if (paraAssinar.length === 0) return porCaminho;

  const { data } = await supabase.storage
    .from("anexos")
    .createSignedUrls([...new Set(paraAssinar)], 60 * 60);

  for (const item of data ?? []) {
    if (item.path && item.signedUrl) porCaminho.set(item.path, item.signedUrl);
  }

  return porCaminho;
}

/** URL exibível da capa: assinada, já-URL, ou nada (aí entra o mascote). */
export function urlDaCapa(
  photoUrl: string | null | undefined,
  assinadas: Map<string, string>,
): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  return assinadas.get(photoUrl) ?? null;
}
