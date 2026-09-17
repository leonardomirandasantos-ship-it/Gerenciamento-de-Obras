import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConfiguracoesObra } from "@/components/obra/ConfiguracoesObra";
import type { Fase, Obra } from "@/lib/types";

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: obra }, { data: fases }] = await Promise.all([
    supabase.from("obras").select("*").eq("id", id).single(),
    supabase.from("fases").select("*").eq("obra_id", id).order("order", { ascending: true }),
  ]);

  if (!obra) {
    notFound();
  }

  return <ConfiguracoesObra obra={obra as Obra} fases={(fases ?? []) as Fase[]} />;
}
