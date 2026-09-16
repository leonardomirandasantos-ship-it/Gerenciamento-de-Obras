"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Lancamento } from "./FeedLancamentos";
import type { TipoLancamento } from "@/lib/parseLancamento";

const RÓTULOS_TIPO: Record<TipoLancamento, string> = {
  gasto_reembolsar: "Gasto a reembolsar",
  pagamento_feito: "Pagamento que eu fiz",
  lembrete: "Lembrete",
  atualizacao: "Só atualização",
};

const RÓTULO_STATUS: Record<string, string> = {
  pendente: "aguardando reembolso",
  reembolsado: "reembolsado",
  pago: "pago",
  concluido: "concluído",
};

function formatarValor(valor: number | null) {
  if (valor === null) return null;
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(data: string | null) {
  if (!data) return null;
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function nomeAutor(autor: Lancamento["autor"]) {
  const item = Array.isArray(autor) ? autor[0] : autor;
  return item?.nome ?? "Alguém";
}

export function LancamentoItem({
  lancamento,
  podeEditar,
}: {
  lancamento: Lancamento;
  podeEditar: boolean;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [descricao, setDescricao] = useState(lancamento.descricao ?? "");
  const [tipo, setTipo] = useState<TipoLancamento>(lancamento.tipo);
  const [valor, setValor] = useState<number | null>(lancamento.valor);
  const [pessoa, setPessoa] = useState(lancamento.pessoa_relacionada ?? "");
  const [dataLembrete, setDataLembrete] = useState(lancamento.data_lembrete ?? "");

  async function salvar() {
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase
      .from("lancamentos")
      .update({
        descricao,
        tipo,
        valor: tipo === "atualizacao" || tipo === "lembrete" ? null : valor,
        pessoa_relacionada: pessoa || null,
        data_lembrete: tipo === "lembrete" ? dataLembrete || null : null,
      })
      .eq("id", lancamento.id);

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setEditando(false);
    router.refresh();
  }

  if (editando) {
    return (
      <li className="max-w-md space-y-2 rounded-2xl rounded-tl-sm border border-neutral-300 bg-white px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {(Object.keys(RÓTULOS_TIPO) as TipoLancamento[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTipo(t)}
              className={`rounded-full border px-2 py-0.5 text-xs ${
                tipo === t
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600"
              }`}
            >
              {RÓTULOS_TIPO[t]}
            </button>
          ))}
        </div>

        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          rows={2}
        />

        {(tipo === "gasto_reembolsar" || tipo === "pagamento_feito") && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">R$</label>
            <input
              type="number"
              step="0.01"
              value={valor ?? ""}
              onChange={(e) =>
                setValor(e.target.value ? parseFloat(e.target.value) : null)
              }
              className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
            <input
              placeholder="Pessoa (opcional)"
              value={pessoa}
              onChange={(e) => setPessoa(e.target.value)}
              className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
        )}

        {tipo === "lembrete" && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-neutral-500">Data</label>
            <input
              type="date"
              value={dataLembrete}
              onChange={(e) => setDataLembrete(e.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </div>
        )}

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditando(false)}
            className="rounded-md px-3 py-1 text-xs text-neutral-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={carregando}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {carregando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group max-w-md rounded-2xl rounded-tl-sm bg-neutral-100 px-4 py-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-neutral-500">
          {nomeAutor(lancamento.autor)}
        </p>
        {podeEditar && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-xs text-neutral-400 underline opacity-0 group-hover:opacity-100"
          >
            editar
          </button>
        )}
      </div>

      <p className="text-sm text-neutral-900">{lancamento.descricao}</p>

      {lancamento.valor !== null && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium">{formatarValor(lancamento.valor)}</span>
          {lancamento.pessoa_relacionada && <span>· {lancamento.pessoa_relacionada}</span>}
          {lancamento.tipo === "gasto_reembolsar" && (
            <span
              className={
                lancamento.status === "pendente" ? "text-amber-600" : "text-green-600"
              }
            >
              · {RÓTULO_STATUS[lancamento.status]}
            </span>
          )}
        </div>
      )}

      {lancamento.tipo === "lembrete" && (
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          {lancamento.data_lembrete && <span>Até {formatarData(lancamento.data_lembrete)}</span>}
          <span className={lancamento.status === "concluido" ? "text-green-600" : "text-amber-600"}>
            · {RÓTULO_STATUS[lancamento.status] ?? "pendente"}
          </span>
        </div>
      )}

      <p className="mt-1 text-[11px] text-neutral-400">
        {new Date(lancamento.criado_em).toLocaleString("pt-BR")}
      </p>
    </li>
  );
}
