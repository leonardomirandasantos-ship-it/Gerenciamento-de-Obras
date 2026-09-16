"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [nomeEmpresa, setNomeEmpresa] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function criar(e: React.FormEvent) {
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

    // Se a confirmação por e-mail estiver ativada no projeto Supabase,
    // ainda não há sessão aqui — pedimos pra pessoa confirmar e logar depois.
    const { data: sessao } = await supabase.auth.getSession();
    if (!sessao.session) {
      setCarregando(false);
      setErro(
        "Conta criada! Confirme seu e-mail (verifique a caixa de entrada) e depois faça login.",
      );
      return;
    }

    const { error: erroRpc } = await supabase.rpc("criar_empresa_inicial", {
      p_nome_empresa: nomeEmpresa,
      p_nome_usuario: nome,
    });

    setCarregando(false);

    if (erroRpc) {
      setErro(erroRpc.message);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">Criar sua empresa</h1>
          <p className="text-sm text-neutral-500">
            Isso cria a primeira conta master. Depois disso, novas pessoas
            entram só por convite.
          </p>
        </div>

        <form onSubmit={criar} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="nomeEmpresa" className="text-sm font-medium">
              Nome da empresa
            </label>
            <input
              id="nomeEmpresa"
              required
              value={nomeEmpresa}
              onChange={(e) => setNomeEmpresa(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
            />
          </div>

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
            {carregando ? "Criando..." : "Criar empresa"}
          </button>
        </form>
      </div>
    </main>
  );
}
