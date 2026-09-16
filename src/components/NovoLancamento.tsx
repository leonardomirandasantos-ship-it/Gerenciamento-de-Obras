"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { parseLancamento, type TipoLancamento } from "@/lib/parseLancamento";

const RÓTULOS_TIPO: Record<TipoLancamento, string> = {
  gasto_reembolsar: "Gasto a reembolsar",
  pagamento_feito: "Pagamento que eu fiz",
  lembrete: "Lembrete",
  atualizacao: "Só atualização (sem valor)",
};

export function NovoLancamento({
  obraId,
  autorId,
}: {
  obraId: string;
  autorId: string;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [rascunho, setRascunho] = useState<ReturnType<
    typeof parseLancamento
  > | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  function prepararEnvio(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setRascunho(parseLancamento(texto));
  }

  async function confirmarEnvio() {
    if (!rascunho) return;
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const status = rascunho.tipo === "pagamento_feito" ? "pago" : "pendente";

    const { error } = await supabase.from("lancamentos").insert({
      obra_id: obraId,
      autor_id: autorId,
      tipo: rascunho.tipo,
      valor: rascunho.tipo === "lembrete" ? null : rascunho.valor,
      descricao: texto,
      pessoa_relacionada: rascunho.pessoa,
      data_lembrete: rascunho.tipo === "lembrete" ? rascunho.data : null,
      status,
    });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setTexto("");
    setRascunho(null);
    router.refresh();
  }

  return (
    <div className="space-y-2 border-t border-neutral-200 bg-white p-3">
      {rascunho && (
        <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
          {!rascunho.confiante && (
            <p className="text-neutral-500">
              Não tenho certeza do tipo — confirma pra mim?
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {(Object.keys(RÓTULOS_TIPO) as TipoLancamento[]).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setRascunho({ ...rascunho, tipo, confiante: true })}
                className={`rounded-full border px-3 py-1 text-xs ${
                  rascunho.tipo === tipo
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                {RÓTULOS_TIPO[tipo]}
              </button>
            ))}
          </div>

          {(rascunho.tipo === "gasto_reembolsar" || rascunho.tipo === "pagamento_feito") && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">R$</label>
              <input
                type="number"
                step="0.01"
                value={rascunho.valor ?? ""}
                onChange={(e) =>
                  setRascunho({
                    ...rascunho,
                    valor: e.target.value ? parseFloat(e.target.value) : null,
                  })
                }
                className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
              <input
                placeholder="Pessoa (opcional)"
                value={rascunho.pessoa ?? ""}
                onChange={(e) =>
                  setRascunho({ ...rascunho, pessoa: e.target.value || null })
                }
                className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </div>
          )}

          {rascunho.tipo === "lembrete" && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-500">Pra quando?</label>
              <input
                type="date"
                value={rascunho.data ?? ""}
                onChange={(e) =>
                  setRascunho({ ...rascunho, data: e.target.value || null })
                }
                className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
              />
            </div>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRascunho(null)}
              className="rounded-md px-3 py-1.5 text-xs text-neutral-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmarEnvio}
              disabled={carregando}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
            >
              {carregando ? "Enviando..." : "Confirmar e enviar"}
            </button>
          </div>
        </div>
      )}

      <form onSubmit={prepararEnvio} className="flex items-center gap-2">
        <input
          placeholder="Escreva igual mandaria no zap: gastei 350 no cimento, preciso do reembolso..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full rounded-full border border-neutral-300 px-4 py-2 text-sm"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
