"use client";

import { useEffect, useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizarFavorecido, type PagamentoPayload } from "@/lib/pagamento";

/**
 * Campo de favorecido que sugere quem já recebeu nesta obra (D107). Sem isso,
 * "José Costa", "Jose Costa" e "josé costa" viram três pessoas diferentes no
 * resumo — e o agrupamento é feito pelo nome, então o histórico racha.
 *
 * Usa <datalist> nativo de propósito: no celular ele aparece como sugestão do
 * teclado, sem popup próprio brigando com o bottom sheet.
 */
export function CampoFavorecido({
  obraId,
  valor,
  onChange,
  placeholder = "Quem recebeu",
}: {
  obraId: string;
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}) {
  const listaId = useId();
  const [conhecidos, setConhecidos] = useState<string[]>([]);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const supabase = createClient();
      const [{ data: favorecidos }, { data: pagamentos }] = await Promise.all([
        supabase.from("favorecidos").select("name").eq("obra_id", obraId),
        supabase
          .from("eventos")
          .select("payload")
          .eq("obra_id", obraId)
          .eq("kind", "E7_pagamento")
          .eq("deleted", false),
      ]);

      // Cadastro e histórico juntos: quem já recebeu conta mesmo sem cadastro.
      const nomes = new Map<string, string>();
      for (const favorecido of favorecidos ?? []) {
        nomes.set(normalizarFavorecido(favorecido.name), favorecido.name);
      }
      for (const pagamento of pagamentos ?? []) {
        const nome = (pagamento.payload as PagamentoPayload)?.payeeName;
        if (nome) nomes.set(normalizarFavorecido(nome), nome);
      }

      if (ativo) setConhecidos([...nomes.values()].sort());
    }

    carregar();
    return () => {
      ativo = false;
    };
  }, [obraId]);

  return (
    <>
      <input
        value={valor}
        list={listaId}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
      />
      <datalist id={listaId}>
        {conhecidos.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>
    </>
  );
}
