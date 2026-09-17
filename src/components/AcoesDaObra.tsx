"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Ações da obra na lista "Minhas obras" (D121). A engrenagem leva aos dados
 * da obra (onde arquivar já vive) e a obra arquivada ganha "Reabrir" direto no
 * cartão — reativar era a razão de ela continuar aparecendo ali, então cobrar
 * três toques para isso não fazia sentido.
 */
export function AcoesDaObra({
  obraId,
  arquivada,
}: {
  obraId: string;
  arquivada: boolean;
}) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);

  async function reabrir() {
    setCarregando(true);
    const supabase = createClient();
    await supabase.from("obras").update({ status: "active" }).eq("id", obraId);
    setCarregando(false);
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {arquivada && (
        <button
          type="button"
          onClick={reabrir}
          disabled={carregando}
          className="rounded-full border border-primary px-3 py-1.5 font-display text-micro font-semibold text-primary disabled:opacity-50"
        >
          {carregando ? "..." : "Reabrir"}
        </button>
      )}

      <Link
        href={`/obras/${obraId}/configuracoes`}
        aria-label="Dados da obra"
        className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft active:bg-surface-alt"
      >
        <svg
          viewBox="0 0 20 20"
          aria-hidden
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="10" cy="10" r="2.6" />
          <path d="M10 2.4v2M10 15.6v2M2.4 10h2M15.6 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M15.4 4.6 14 6M6 14l-1.4 1.4" />
        </svg>
      </Link>
    </div>
  );
}
