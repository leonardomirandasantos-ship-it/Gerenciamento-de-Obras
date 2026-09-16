export type Lancamento = {
  id: string;
  tipo: "gasto_reembolsar" | "pagamento_feito" | "atualizacao";
  valor: number | null;
  descricao: string | null;
  pessoa_relacionada: string | null;
  status: "pendente" | "reembolsado" | "pago";
  criado_em: string;
  autor_id: string;
  autor?: { nome: string | null } | { nome: string | null }[] | null;
};

const RÓTULO_STATUS: Record<string, string> = {
  pendente: "aguardando reembolso",
  reembolsado: "reembolsado",
  pago: "pago",
};

function formatarValor(valor: number | null) {
  if (valor === null) return null;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function nomeAutor(autor: Lancamento["autor"]) {
  const item = Array.isArray(autor) ? autor[0] : autor;
  return item?.nome ?? "Alguém";
}

export function FeedLancamentos({ lancamentos }: { lancamentos: Lancamento[] }) {
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
        <li
          key={l.id}
          className="max-w-md rounded-2xl rounded-tl-sm bg-neutral-100 px-4 py-2"
        >
          <p className="text-xs font-medium text-neutral-500">
            {nomeAutor(l.autor)}
          </p>
          <p className="text-sm text-neutral-900">{l.descricao}</p>

          {l.valor !== null && (
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className="font-medium">{formatarValor(l.valor)}</span>
              {l.pessoa_relacionada && <span>· {l.pessoa_relacionada}</span>}
              {l.tipo === "gasto_reembolsar" && (
                <span
                  className={
                    l.status === "pendente" ? "text-amber-600" : "text-green-600"
                  }
                >
                  · {RÓTULO_STATUS[l.status]}
                </span>
              )}
            </div>
          )}

          <p className="mt-1 text-[11px] text-neutral-400">
            {new Date(l.criado_em).toLocaleString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  );
}
