import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ObraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nome, status")
    .eq("id", id)
    .single();

  if (!obra) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-6">
      <Link href="/" className="text-sm text-neutral-500 underline">
        ← Voltar
      </Link>

      <h1 className="text-lg font-semibold">{obra.nome}</h1>

      <p className="text-sm text-neutral-400">
        A conversa/feed de lançamentos dessa obra ainda está em construção —
        próximo passo do MVP.
      </p>
    </main>
  );
}
