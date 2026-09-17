import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { assinarCapas, urlDaCapa } from "@/lib/fotoObra";
import { LogoutButton } from "@/components/LogoutButton";
import { AcoesDaObra } from "@/components/AcoesDaObra";

type ObraDaLista = {
  id: string;
  name: string;
  location: string | null;
  photo_url: string | null;
  status: string;
  fases: { name: string; color: string }[] | { name: string; color: string } | null;
};

function CartaoDeObra({ obra, capa }: { obra: ObraDaLista; capa: string | null }) {
  const fase = Array.isArray(obra.fases) ? obra.fases[0] : obra.fases;
  const arquivada = obra.status === "archived";

  // A engrenagem fica FORA do link da obra: link dentro de link não vale em
  // HTML, e o toque acabaria abrindo a conversa em vez das configurações.
  return (
    <div className="flex items-center gap-1 rounded-card bg-surface p-3 shadow-card">
      <Link
        href={`/obras/${obra.id}/conversa`}
        className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-card p-1 active:bg-surface-alt"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
          {capa ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={capa} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image
              src="/assets/logo/mascote-192.png"
              alt=""
              width={192}
              height={192}
              className="h-9 w-9"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display font-bold text-ink">{obra.name}</span>
          {obra.location && (
            <span className="block truncate text-micro text-ink-soft">{obra.location}</span>
          )}
        </span>
        {fase && !arquivada && (
          <span className="chip" style={{ "--chip": fase.color } as React.CSSProperties}>
            {fase.name}
          </span>
        )}
      </Link>

      <AcoesDaObra obraId={obra.id} arquivada={arquivada} />
    </div>
  );
}

export default async function Home() {
  const supabase = await createClient();

  // Arquivada não some do app — some da lista do dia a dia (D95).
  const { data } = await supabase
    .from("obras")
    .select("id, name, location, photo_url, status, fases:current_phase_id(name, color)")
    .order("created_at", { ascending: false });

  const obras = (data ?? []) as ObraDaLista[];
  const ativas = obras.filter((obra) => obra.status !== "archived");
  const arquivadas = obras.filter((obra) => obra.status === "archived");

  const assinadas = await assinarCapas(
    supabase,
    obras.map((obra) => obra.photo_url),
  );

  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <header className="flex items-center justify-between bg-primary px-4 py-3 text-white">
        <h1 className="font-display text-title font-bold">Minhas obras</h1>
        <LogoutButton />
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 overflow-y-auto p-4 pb-28">
        {ativas.length === 0 && arquivadas.length === 0 ? (
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
          <div className="space-y-6">
            {ativas.length > 0 && (
              <ul className="space-y-3">
                {ativas.map((obra) => (
                  <li key={obra.id}>
                    <CartaoDeObra obra={obra} capa={urlDaCapa(obra.photo_url, assinadas)} />
                  </li>
                ))}
              </ul>
            )}

            {ativas.length === 0 && (
              <p className="pt-8 text-center text-caption text-ink-soft">
                Nenhuma obra ativa. As arquivadas continuam aqui embaixo.
              </p>
            )}

            {arquivadas.length > 0 && (
              // <details> em vez de estado: fica fechado, não rouba a atenção, e
              // ainda assim a obra arquivada continua a dois toques de distância.
              <details className="group">
                <summary className="cursor-pointer list-none py-2 text-micro font-semibold uppercase tracking-wide text-ink-soft">
                  <span className="inline-block transition-transform group-open:rotate-90">›</span>{" "}
                  Arquivadas ({arquivadas.length})
                </summary>
                <ul className="space-y-3 pt-2 opacity-75">
                  {arquivadas.map((obra) => (
                    <li key={obra.id}>
                      <CartaoDeObra obra={obra} capa={urlDaCapa(obra.photo_url, assinadas)} />
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
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
