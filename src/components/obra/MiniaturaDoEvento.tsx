import type { Evento } from "@/lib/types";

const ICONE: Record<string, string> = { pdf: "📄", video: "🎬", audio: "🎙️" };

/**
 * A carinha do registro que tem arquivo (D170).
 *
 * Fora da conversa, um registro com foto virava o nome do arquivo —
 * "IMG-20250219-WA0012.jpg" — e é nesse estado que ela precisa dizer em que
 * fase ele entra ou o que ele é. Decidir sobre uma coisa que não dá para ver
 * é adivinhação; a miniatura responde antes da pergunta.
 *
 * Usa a versão de 600px (D168), então custa ~45 KB mesmo aparecendo em lista.
 */
export function MiniaturaDoEvento({
  evento,
  tamanho = "h-10 w-10",
}: {
  evento: Evento;
  tamanho?: string;
}) {
  const anexo = (evento.anexos ?? [])[0];
  if (!anexo) return null;

  if (anexo.tipo !== "foto") {
    return (
      <span
        className={`flex ${tamanho} shrink-0 items-center justify-center rounded bg-surface-alt text-base`}
        aria-hidden
      >
        {ICONE[anexo.tipo] ?? "📎"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={anexo.thumbUrl ?? anexo.url}
      alt=""
      loading="lazy"
      className={`${tamanho} shrink-0 rounded object-cover`}
    />
  );
}
