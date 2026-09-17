"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { normalizarFavorecido, type PagamentoPayload } from "@/lib/pagamento";

type Conhecido = { nome: string; tipo: string | null; pagamentos: number };

/**
 * Campo de favorecido com sugestão própria (D112). Antes usava <datalist>, que
 * só abre com o campo vazio e vira um botãozinho minúsculo do navegador — quem
 * já estava digitando não recebia sugestão nenhuma. Aqui a lista filtra a cada
 * letra, o toque escolhe, e quando nada casa fica explícito que o nome é novo.
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
  const [conhecidos, setConhecidos] = useState<Conhecido[]>([]);
  const [aberto, setAberto] = useState(false);
  const fechandoRef = useRef<number | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      const supabase = createClient();
      const [{ data: favorecidos }, { data: pagamentos }] = await Promise.all([
        supabase.from("favorecidos").select("name, type").eq("obra_id", obraId),
        supabase
          .from("eventos")
          .select("payload")
          .eq("obra_id", obraId)
          .eq("kind", "E7_pagamento")
          .eq("deleted", false),
      ]);

      // Cadastro e histórico juntos: quem já recebeu conta mesmo sem cadastro.
      const mapa = new Map<string, Conhecido>();

      for (const favorecido of favorecidos ?? []) {
        mapa.set(normalizarFavorecido(favorecido.name), {
          nome: favorecido.name,
          tipo: favorecido.type,
          pagamentos: 0,
        });
      }

      for (const pagamento of pagamentos ?? []) {
        const nome = (pagamento.payload as PagamentoPayload)?.payeeName;
        if (!nome) continue;
        const chave = normalizarFavorecido(nome);
        const atual = mapa.get(chave);
        if (atual) atual.pagamentos += 1;
        else mapa.set(chave, { nome, tipo: null, pagamentos: 1 });
      }

      if (ativo) {
        setConhecidos([...mapa.values()].sort((a, b) => b.pagamentos - a.pagamentos));
      }
    }

    carregar();
    return () => {
      ativo = false;
      if (fechandoRef.current) window.clearTimeout(fechandoRef.current);
    };
  }, [obraId]);

  const busca = normalizarFavorecido(valor);
  const exato = conhecidos.some((pessoa) => normalizarFavorecido(pessoa.nome) === busca);

  const sugestoes = (
    busca === ""
      ? conhecidos
      : conhecidos.filter((pessoa) => normalizarFavorecido(pessoa.nome).includes(busca))
  ).slice(0, 5);

  function escolher(nome: string) {
    onChange(nome);
    setAberto(false);
  }

  return (
    <div className="relative">
      <input
        value={valor}
        onChange={(e) => {
          onChange(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        // O clique na sugestão dispara depois do blur: o atraso dá tempo de
        // registrar a escolha antes de a lista sair de cena.
        onBlur={() => {
          fechandoRef.current = window.setTimeout(() => setAberto(false), 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
      />

      {aberto && (sugestoes.length > 0 || (valor.trim() !== "" && !exato)) && (
        <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-card border border-line bg-surface shadow-card">
          {sugestoes.map((pessoa) => (
            <button
              key={pessoa.nome}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(pessoa.nome)}
              className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left active:bg-surface-alt"
            >
              <span className="min-w-0 truncate text-body text-ink">{pessoa.nome}</span>
              <span className="shrink-0 text-micro text-ink-soft">
                {pessoa.tipo ?? "sem tipo"}
                {pessoa.pagamentos > 0 ? ` · ${pessoa.pagamentos}x` : ""}
              </span>
            </button>
          ))}

          {valor.trim() !== "" && !exato && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(valor.trim())}
              className="flex w-full items-center gap-2 border-t border-line px-3 py-2.5 text-left active:bg-surface-alt"
            >
              <span className="text-body text-primary">+ usar “{valor.trim()}”</span>
              <span className="text-micro text-ink-soft">novo</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
