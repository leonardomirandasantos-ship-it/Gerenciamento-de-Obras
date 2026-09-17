import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ObraTabs } from "@/components/obra/ObraTabs";

export default async function ObraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const { data: obra } = await supabase
    .from("obras")
    .select("id, name, location")
    .eq("id", id)
    .single();

  if (!obra) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <Link href="/" className="text-ink-soft" aria-label="Todas as obras">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-base font-bold text-ink">{obra.name}</h1>
          {obra.location && <p className="truncate text-xs text-ink-soft">{obra.location}</p>}
        </div>
      </header>

      <ObraTabs obraId={obra.id} />

      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
