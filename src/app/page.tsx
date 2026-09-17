import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: obras } = await supabase
    .from("obras")
    .select("id, name, location, photo_url, status, fases:current_phase_id(name, color)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 p-4">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-ink">Minhas obras</h1>
        <LogoutButton />
      </header>

      {!obras || obras.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-2xl">
            🏗️
          </div>
          <p className="text-ink-soft">
            Crie sua primeira obra e comece a jogar tudo aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {obras.map((obra) => {
            const fase = Array.isArray(obra.fases) ? obra.fases[0] : obra.fases;
            return (
              <li key={obra.id}>
                <Link
                  href={`/obras/${obra.id}/conversa`}
                  className="flex items-center gap-3 rounded-card border border-line bg-surface p-3 hover:bg-surface-alt"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-lg">
                    {obra.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={obra.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      "🏠"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{obra.name}</p>
                    {obra.location && (
                      <p className="truncate text-xs text-ink-soft">{obra.location}</p>
                    )}
                  </div>
                  {fase && (
                    <span
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: fase.color }}
                    >
                      {fase.name}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href="/obras/nova"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-2xl text-white shadow-lg"
        aria-label="Nova obra"
      >
        +
      </Link>
    </main>
  );
}
