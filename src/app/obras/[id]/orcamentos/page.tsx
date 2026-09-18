import { permanentRedirect } from "next/navigation";

/**
 * Orçamentos moraram numa página própria até o D148; agora são a metade
 * "Arquivos" da Documentação. O endereço antigo continua valendo.
 */
export default async function OrcamentosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  permanentRedirect(`/obras/${id}/documentacao?ver=arquivos&filtro=orcamentos`);
}
