"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function sair() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    // Fica sobre o header --primary: cor de texto clara, senão o contraste
    // some (o --ink-soft era pensado para fundo claro).
    <button
      onClick={sair}
      className="rounded-full px-3 py-1.5 font-display text-caption font-semibold text-bg-paper active:bg-white/15"
    >
      Sair
    </button>
  );
}
