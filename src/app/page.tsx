import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { GerarConvite } from "@/components/GerarConvite";
import { NovaObraForm } from "@/components/NovaObraForm";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome, papel, empresas(nome)")
    .eq("auth_id", user.id)
    .single();

  if (!usuario) {
    redirect("/onboarding");
  }

  const { data: obras } = await supabase
    .from("obras")
    .select("id, nome, status, criado_em")
    .order("criado_em", { ascending: false });

  const empresa = Array.isArray(usuario.empresas)
    ? usuario.empresas[0]
    : usuario.empresas;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{empresa?.nome}</h1>
          <p className="text-sm text-neutral-500">
            Olá, {usuario.nome} ({usuario.papel})
          </p>
        </div>
        <LogoutButton />
      </header>

      {usuario.papel === "master" && (
        <section className="space-y-4">
          <GerarConvite />
          <NovaObraForm />
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">Obras</h2>

        {!obras || obras.length === 0 ? (
          <p className="text-sm text-neutral-400">
            Nenhuma obra ainda.{" "}
            {usuario.papel === "master" && "Crie a primeira acima."}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {obras.map((obra) => (
              <li key={obra.id}>
                <Link
                  href={`/obras/${obra.id}`}
                  className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
                >
                  <span>{obra.nome}</span>
                  <span className="text-neutral-400">{obra.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
