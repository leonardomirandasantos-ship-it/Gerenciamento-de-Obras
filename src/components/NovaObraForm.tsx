"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function NovaObraForm() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.from("obras").insert({ nome });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setNome("");
    router.refresh();
  }

  return (
    <form onSubmit={criar} className="flex items-center gap-2">
      <input
        placeholder="Nome da obra"
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={carregando}
        className="shrink-0 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {carregando ? "Criando..." : "Nova obra"}
      </button>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </form>
  );
}
