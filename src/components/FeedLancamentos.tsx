import { LancamentoItem } from "./LancamentoItem";
import type { TipoLancamento } from "@/lib/parseLancamento";

export type Lancamento = {
  id: string;
  tipo: TipoLancamento;
  valor: number | null;
  descricao: string | null;
  pessoa_relacionada: string | null;
  data_lembrete: string | null;
  status: "pendente" | "reembolsado" | "pago" | "concluido";
  criado_em: string;
  autor_id: string;
  autor?: { nome: string | null } | { nome: string | null }[] | null;
};

export function FeedLancamentos({
  lancamentos,
  usuarioAtualId,
  podeEditarTudo,
}: {
  lancamentos: Lancamento[];
  usuarioAtualId: string;
  podeEditarTudo: boolean;
}) {
  if (lancamentos.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-neutral-400">
        Ainda não tem nenhum registro nessa obra. Manda a primeira mensagem
        aqui embaixo.
      </p>
    );
  }

  return (
    <ul className="flex-1 space-y-3 overflow-y-auto p-4">
      {lancamentos.map((l) => (
        <LancamentoItem
          key={l.id}
          lancamento={l}
          podeEditar={podeEditarTudo || l.autor_id === usuarioAtualId}
        />
      ))}
    </ul>
  );
}
