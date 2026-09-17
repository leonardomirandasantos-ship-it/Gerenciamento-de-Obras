/**
 * O Storage recusa chave com acento, "º", "#" e afins — e em português isso é
 * a regra, não a exceção ("Orçamento nº 335396.pdf" era rejeitado em silêncio).
 * O nome de verdade continua em `payload.fileName` para exibição; só a CHAVE
 * do arquivo é higienizada.
 */
export function chaveSegura(nome: string): string {
  const semAcento = nome.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return (
    semAcento
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(-120) || "arquivo"
  );
}
