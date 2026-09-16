import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FeedLancamentos } from "@/components/FeedLancamentos";
import { PainelGestao } from "@/components/PainelGestao";
import { NovoLancamento } from "@/components/NovoLancamento";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome")
    .eq("auth_id", user.id)
    .single();

  if (!usuario) {
    redirect("/onboarding");
  }

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nome, status")
    .eq("id", id)
    .single();

  if (!obra) {
    notFound();
  }

  const { data: lancamentos } = await supabase
    .from("lancamentos")
    .select(
      "id, tipo, valor, descricao, pessoa_relacionada, status, criado_em, autor_id, autor:usuarios(nome)",
    )
    .eq("obra_id", id)
    .order("criado_em", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 p-4">
        <div>
          <Link href="/" className="text-xs text-neutral-500 underline">
            ← Todas as obras
          </Link>
          <h1 className="text-lg font-semibold">{obra.nome}</h1>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="flex flex-1 flex-col overflow-hidden md:border-r md:border-neutral-200">
          <FeedLancamentos lancamentos={lancamentos ?? []} />
          <NovoLancamento obraId={obra.id} autorId={usuario.id} />
        </div>

        <div className="w-full overflow-y-auto border-t border-neutral-200 md:w-80 md:border-t-0">
          <PainelGestao lancamentos={lancamentos ?? []} />
        </div>
      </div>
    </main>
  );
}
