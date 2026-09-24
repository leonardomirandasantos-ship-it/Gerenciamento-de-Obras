import type { createClient } from "./supabase/server";
import type { Anexo, Evento, EventoKind } from "./types";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

type AnexoDoBanco = Anexo & {
  thumb_url: string | null;
  signed_url: string | null;
  thumb_signed_url: string | null;
  signed_until: string | null;
};

/**
 * Validade da assinatura (D168). Sete dias pega quase todo o ganho de cache do
 * navegador; mais que isso só alonga a janela em que um link vazado continua
 * abrindo a foto sem login — e tem comprovante de PIX com nome e valor aqui.
 */
const DIAS_DE_VALIDADE = 7;
/** Renova antes de vencer, para ninguém receber URL que expira no caminho. */
const HORAS_DE_FOLGA = 12;

function precisaAssinar(anexo: AnexoDoBanco): boolean {
  if (!anexo.signed_url || !anexo.signed_until) return true;
  const folga = Date.now() + HORAS_DE_FOLGA * 60 * 60 * 1000;
  return new Date(anexo.signed_until).getTime() < folga;
}

/**
 * Assina o que precisa e GUARDA a assinatura (D168).
 *
 * Antes isto assinava tudo a cada render. A URL assinada muda a cada chamada,
 * e URL diferente é arquivo novo para o navegador — então trocar de aba
 * rebaixava todas as fotos da obra. Foi assim que 45 MB guardados viraram
 * 7,4 GB de saída num mês.
 */
async function assinarEGuardar(
  supabase: ServerClient,
  anexos: AnexoDoBanco[],
): Promise<Map<string, { url: string; thumbUrl?: string }>> {
  const assinadas = new Map<string, { url: string; thumbUrl?: string }>();

  for (const anexo of anexos) {
    if (!precisaAssinar(anexo)) {
      assinadas.set(anexo.id, {
        url: anexo.signed_url!,
        thumbUrl: anexo.thumb_signed_url ?? undefined,
      });
    }
  }

  const pendentes = anexos.filter(precisaAssinar);
  if (pendentes.length === 0) return assinadas;

  const caminhos = pendentes.flatMap((anexo) =>
    anexo.thumb_url ? [anexo.url, anexo.thumb_url] : [anexo.url],
  );

  const segundos = DIAS_DE_VALIDADE * 24 * 60 * 60;
  const { data } = await supabase.storage.from("anexos").createSignedUrls(caminhos, segundos);

  const porCaminho = new Map((data ?? []).map((item) => [item.path ?? "", item.signedUrl]));
  const validoAte = new Date(Date.now() + segundos * 1000).toISOString();

  for (const anexo of pendentes) {
    const url = porCaminho.get(anexo.url);
    if (!url) continue;
    const thumbUrl = anexo.thumb_url ? (porCaminho.get(anexo.thumb_url) ?? undefined) : undefined;

    assinadas.set(anexo.id, { url, thumbUrl });

    await supabase
      .from("anexos")
      .update({ signed_url: url, thumb_signed_url: thumbUrl ?? null, signed_until: validoAte })
      .eq("id", anexo.id);
  }

  return assinadas;
}

/**
 * Carrega eventos da obra já com as URLs dos anexos (o bucket é privado).
 * Usado pela conversa e pelas lentes — nenhuma delas captura (D13).
 *
 * `assinar: false` pula a assinatura inteira — a aba de pendências, por
 * exemplo, não mostra nenhuma imagem.
 *
 * `limite` traz só as últimas N mensagens (D169): a conversa não precisa
 * carregar a obra inteira para mostrar o fim dela.
 */
export async function carregarEventosComAnexos(
  supabase: ServerClient,
  obraId: string,
  kinds?: EventoKind[],
  opcoes: { assinar?: boolean; limite?: number } = {},
): Promise<Evento[]> {
  let query = supabase
    .from("eventos")
    .select("*, anexos(*)")
    .eq("obra_id", obraId)
    .eq("deleted", false);

  if (kinds && kinds.length > 0) {
    query = query.in("kind", kinds);
  }

  // Com limite, pega as mais NOVAS (desc) e devolve na ordem da conversa.
  const { data } = opcoes.limite
    ? await query.order("received_at", { ascending: false }).limit(opcoes.limite)
    : await query.order("received_at", { ascending: true });

  const eventos = ((data ?? []) as (Evento & { anexos?: AnexoDoBanco[] })[]).map((evento) => ({
    ...evento,
    anexos: evento.anexos ?? [],
  }));

  if (opcoes.limite) eventos.reverse();

  const todosOsAnexos = eventos.flatMap((evento) => evento.anexos as AnexoDoBanco[]);

  if (opcoes.assinar === false || todosOsAnexos.length === 0) {
    return eventos.map((evento) => ({ ...evento, anexos: evento.anexos ?? [] }));
  }

  const assinadas = await assinarEGuardar(supabase, todosOsAnexos);

  return eventos.map((evento) => ({
    ...evento,
    anexos: (evento.anexos ?? []).map((anexo) => {
      const assinada = assinadas.get(anexo.id);
      return {
        ...anexo,
        url: assinada?.url ?? anexo.url,
        // A lista usa a miniatura; o visor e o encaminhar usam a cheia.
        thumbUrl: assinada?.thumbUrl,
      };
    }),
  }));
}

/** Quantas mensagens a conversa carrega de uma vez (D169). */
export const MENSAGENS_POR_PAGINA = 60;

/** Total de mensagens da obra, para a conversa saber se há mais para trás. */
export async function contarEventos(supabase: ServerClient, obraId: string): Promise<number> {
  const { count } = await supabase
    .from("eventos")
    .select("*", { count: "exact", head: true })
    .eq("obra_id", obraId)
    .eq("deleted", false);
  return count ?? 0;
}
