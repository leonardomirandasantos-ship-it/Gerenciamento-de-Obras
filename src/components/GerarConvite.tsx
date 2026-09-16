"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GerarConvite() {
  const [papel, setPapel] = useState<"master" | "membro">("membro");
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function gerar() {
    setErro(null);
    setLink(null);
    setCopiado(false);
    setCarregando(true);

    const supabase = createClient();
    const { data: token, error } = await supabase.rpc("gerar_convite", {
      p_papel: papel,
    });

    setCarregando(false);

    if (error) {
      setErro(error.message);
      return;
    }

    setLink(`${window.location.origin}/convite/${token}`);
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  }

  return (
    <div className="space-y-3 rounded-md border border-neutral-200 p-4">
      <h2 className="text-sm font-medium">Convidar alguém</h2>

      <div className="flex items-center gap-3">
        <select
          value={papel}
          onChange={(e) => setPapel(e.target.value as "master" | "membro")}
          className="rounded-md border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="membro">Membro</option>
          <option value="master">Master</option>
        </select>

        <button
          onClick={gerar}
          disabled={carregando}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {carregando ? "Gerando..." : "Gerar link de convite"}
        </button>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      {link && (
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
          />
          <button
            onClick={copiar}
            className="shrink-0 rounded-md border border-neutral-300 px-2 py-1 text-sm"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}
    </div>
  );
}
