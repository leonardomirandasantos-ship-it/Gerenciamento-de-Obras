import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const supabase = await createClient();

  const { data: obras } = await supabase
    .from("obras")
    .select("id, name, location, photo_url, status, fases:current_phase_id(name, color)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <h1 className="font-display text-title font-bold">Minhas obras</h1>
        <LogoutButton />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4">
        {!obras || obras.length === 0 ? (
          <div className="mt-12 flex flex-col items-center gap-3 text-center">
            {/* Mascote oficial — empty state (09_ASSETS) */}
            <Image
              src="/assets/logo/mascote-512.png"
              alt=""
              width={512}
              height={512}
              className="h-32 w-32"
            />
            <p className="font-display text-section font-bold text-ink">
              Sua primeira obra começa aqui
            </p>
            <p className="max-w-xs text-caption text-ink-soft">
              Crie a obra e comece a jogar tudo dentro: foto, lista, recado. A gente organiza.
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
                    className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-card active:bg-surface-alt"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
                      {obra.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={obra.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Image
                          src="/assets/logo/mascote-192.png"
                          alt=""
                          width={192}
                          height={192}
                          className="h-9 w-9"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-bold text-ink">{obra.name}</p>
                      {obra.location && (
                        <p className="truncate text-micro text-ink-soft">{obra.location}</p>
                      )}
                    </div>
                    {fase && (
                      <span
                        className="chip"
                        style={{ "--chip": fase.color } as React.CSSProperties}
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
      </div>

      <Link
        href="/obras/nova"
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-fab bg-primary text-2xl text-white shadow-card"
        aria-label="Nova obra"
      >
        +
      </Link>
    </main>
  );
}
