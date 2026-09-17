"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function entrarComGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/` },
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-bg-paper p-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          {/* Logo oficial — nunca recriar em CSS/emoji (09_ASSETS).
              O PNG tem fundo opaco (~#F9F7F3), que não é o --bg-paper: por isso
              vai como placa arredondada, e não solto sobre o fundo. */}
          <Image
            src="/assets/logo/logo-horizontal.png"
            alt="Zap da Obra"
            width={1536}
            height={1024}
            priority
            className="mx-auto h-auto w-60 rounded-card shadow-card"
          />
          <p className="text-caption text-ink-soft">O jeito mais simples de organizar sua obra</p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-ink">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="senha" className="text-sm font-medium text-ink">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
            />
          </div>

          {erro && <p className="text-sm text-alert">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-card bg-primary px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs text-ink-soft">
          <div className="h-px flex-1 bg-line" />
          ou
          <div className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={entrarComGoogle}
          className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink"
        >
          Entrar com Google
        </button>

        <p className="text-center text-xs text-ink-soft">Recebeu um convite? Entrar com link.</p>
      </div>
    </main>
  );
}
