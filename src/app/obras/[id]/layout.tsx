import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assinarCapas, urlDaCapa } from "@/lib/fotoObra";
import { ObraTabs } from "@/components/obra/ObraTabs";
import { AtalhoDeCaptura } from "@/components/obra/AtalhoDeCaptura";

export default async function ObraLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Sem getUser() aqui de propósito: o proxy.ts já barra quem não está logado
  // e a RLS já limita os dados ao dono — uma ida a mais ao Auth por navegação
  // custava ~200ms em cada troca de aba.
  const { data: obra } = await supabase
    .from("obras")
    .select(
      "id, name, location, photo_url, photo_signed_url, photo_signed_until, current_phase_id, status",
    )
    .eq("id", id)
    .single();

  if (!obra) {
    notFound();
  }

  const capa = urlDaCapa(obra.photo_url, await assinarCapas(supabase, [obra]));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* .appbar do styleguide: fundo --primary, nome + localização (D47).
          Foto, nome e ⋮ são o MESMO destino (D96): tocar na obra abre a obra. */}
      <header className="flex items-center gap-1 bg-primary px-4 py-2.5 text-white">
        <Link href="/" className="-ml-1 shrink-0 p-1 text-xl" aria-label="Todas as obras">
          ←
        </Link>

        <Link
          href={`/obras/${obra.id}/configuracoes`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-card px-2 py-1 active:bg-white/10"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
            {capa ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={capa} alt="" className="h-full w-full object-cover" />
            ) : (
              <Image
                src="/assets/logo/mascote-192.png"
                alt=""
                width={192}
                height={192}
                className="h-7 w-7"
              />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <h1 className="truncate font-display text-section font-bold">{obra.name}</h1>
              {obra.status === "archived" && (
                <span className="shrink-0 rounded-full bg-white/20 px-2 py-0.5 text-micro font-semibold">
                  arquivada
                </span>
              )}
            </span>
            {obra.location && (
              <span className="block truncate text-micro opacity-85">📍 {obra.location}</span>
            )}
          </span>
          <span aria-hidden className="shrink-0 px-1 text-lg">
            ⋮
          </span>
        </Link>
      </header>

      <ObraTabs obraId={obra.id} />

      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>

      <AtalhoDeCaptura obraId={obra.id} faseAtualId={obra.current_phase_id} />
    </div>
  );
}
