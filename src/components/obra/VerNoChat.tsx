import Link from "next/link";

/**
 * Da lente de volta para a mensagem que originou o registro. Sem isso a lente
 * vira um beco sem saída: você vê o dado e não acha onde ele nasceu.
 */
export function VerNoChat({ obraId, eventoId }: { obraId: string; eventoId: string }) {
  return (
    <Link
      href={`/obras/${obraId}/conversa#evento-${eventoId}`}
      className="shrink-0 text-micro text-primary underline"
    >
      ver no chat
    </Link>
  );
}
