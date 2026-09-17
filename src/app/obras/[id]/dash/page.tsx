import { permanentRedirect } from "next/navigation";

/**
 * O Dash foi fundido no Resumo (D94). A rota fica como redirecionamento para
 * não quebrar link antigo que alguém tenha salvo ou mandado por mensagem.
 */
export default async function DashPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/obras/${id}/resumo`);
}
