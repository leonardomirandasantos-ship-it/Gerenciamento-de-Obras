import { chaveSegura } from "./arquivos";
import type { createClient } from "./supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/** Onde a capa da obra mora no bucket privado (mesma raiz por usuário da RLS). */
export function caminhoDaCapa(userId: string, obraId: string, nomeArquivo: string): string {
  return `${userId}/obras/${obraId}/capa-${Date.now()}-${chaveSegura(nomeArquivo)}`;
}

const DIAS_DE_VALIDADE = 7;
const HORAS_DE_FOLGA = 12;

export type ObraComCapa = {
  id: string;
  photo_url: string | null;
  photo_signed_url?: string | null;
  photo_signed_until?: string | null;
};

/**
 * Assina as capas que precisam e GUARDA a assinatura (D168).
 *
 * Antes assinava todas a cada visita à tela inicial. Assinatura nova é URL
 * nova, e URL nova faz o navegador baixar a foto de novo — a lista de obras
 * rebaixava todas as capas a cada vez que ela voltava para ela.
 */
export async function assinarCapas(
  supabase: ServerClient,
  obras: ObraComCapa[],
): Promise<Map<string, string>> {
  const porCaminho = new Map<string, string>();
  const folga = Date.now() + HORAS_DE_FOLGA * 60 * 60 * 1000;

  const pendentes: ObraComCapa[] = [];

  for (const obra of obras) {
    const caminho = obra.photo_url;
    if (!caminho || caminho.startsWith("http")) continue;

    const valida =
      obra.photo_signed_url &&
      obra.photo_signed_until &&
      new Date(obra.photo_signed_until).getTime() > folga;

    if (valida) porCaminho.set(caminho, obra.photo_signed_url!);
    else pendentes.push(obra);
  }

  if (pendentes.length === 0) return porCaminho;

  const segundos = DIAS_DE_VALIDADE * 24 * 60 * 60;
  const { data } = await supabase.storage
    .from("anexos")
    .createSignedUrls([...new Set(pendentes.map((obra) => obra.photo_url!))], segundos);

  const assinadas = new Map((data ?? []).map((item) => [item.path ?? "", item.signedUrl]));
  const validoAte = new Date(Date.now() + segundos * 1000).toISOString();

  for (const obra of pendentes) {
    const url = assinadas.get(obra.photo_url!);
    if (!url) continue;

    porCaminho.set(obra.photo_url!, url);
    await supabase
      .from("obras")
      .update({ photo_signed_url: url, photo_signed_until: validoAte })
      .eq("id", obra.id);
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
