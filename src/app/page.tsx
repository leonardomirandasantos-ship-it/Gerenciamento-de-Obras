import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { assinarCapas, urlDaCapa } from "@/lib/fotoObra";
import { LogoutButton } from "@/components/LogoutButton";
import { CartaoDeObra, type ObraDaLista } from "@/components/CartaoDeObra";
import { carregarResumos, avisoDaObra, type AvisoDaObra } from "@/lib/resumoDaObra";

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

  // A obra arquivada não cobra nada: o resumo é só das ativas.
  const [assinadas, resumos] = await Promise.all([
    assinarCapas(
      supabase,
      obras.map((obra) => obra.photo_url),
    ),
    carregarResumos(
      supabase,
      ativas.map((obra) => obra.id),
    ),
  ]);

  function avisoDe(obraId: string): AvisoDaObra | null {
    const resumo = resumos.get(obraId);
    return resumo ? avisoDaObra(resumo) : null;
  }

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
                    <CartaoDeObra
                      obra={obra}
                      capa={urlDaCapa(obra.photo_url, assinadas)}
                      aviso={avisoDe(obra.id)}
                    />
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
                      <CartaoDeObra
                        obra={obra}
                        capa={urlDaCapa(obra.photo_url, assinadas)}
                        aviso={null}
                      />
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
