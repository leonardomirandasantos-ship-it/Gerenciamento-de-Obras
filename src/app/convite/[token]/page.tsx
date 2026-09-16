"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ConviteInfo = { empresa_nome: string; papel: string };

export default function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [convite, setConvite] = useState<ConviteInfo | null | undefined>(
    undefined,
  );
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .rpc("validar_convite", { p_token: token })
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setConvite(null);
          return;
        }
        setConvite(data[0]);
      });
  }, [token]);

  async function aceitar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();

    const { error: erroCadastro } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (erroCadastro) {
      setErro(erroCadastro.message);
      setCarregando(false);
      return;
    }

    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      setCarregando(false);
      setErro(
        "Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login para concluir a entrada na empresa.",
      );
      return;
    }

    const { error: erroRpc } = await supabase.rpc("aceitar_convite", {
      p_token: token,
      p_nome: nome,
    });

    setCarregando(false);

    if (erroRpc) {
      setErro(erroRpc.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (convite === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-neutral-500">Verificando convite...</p>
      </main>
    );
  }

  if (convite === null) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-red-600">
          Esse convite é inválido ou já foi usado.
        </p>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">
            Convite para {convite.empresa_nome}
          </h1>
          <p className="text-sm text-neutral-500">
            Você vai entrar como{" "}
            <strong>{convite.papel === "master" ? "master" : "membro"}</strong>
          </p>
        </div>

        <form onSubmit={aceitar} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="nome" className="text-sm font-medium">
              Seu nome
            </label>
            <input
              id="nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Aceitar convite e entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
