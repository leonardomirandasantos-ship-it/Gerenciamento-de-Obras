import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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
    .select("id, name, location, photo_url, current_phase_id")
    .eq("id", id)
    .single();

  if (!obra) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* .appbar do styleguide: fundo --primary, nome + localização (D47) */}
      <header className="flex items-center gap-3 bg-primary px-4 py-2.5 text-white">
        <Link href="/" className="-ml-1 shrink-0 p-1 text-xl" aria-label="Todas as obras">
          ←
        </Link>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
          {obra.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={obra.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Image
              src="/assets/logo/mascote-192.png"
              alt=""
              width={192}
              height={192}
              className="h-7 w-7"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-display text-section font-bold">{obra.name}</h1>
          {obra.location && (
            <p className="truncate text-micro opacity-85">📍 {obra.location}</p>
          )}
        </div>
        <Link
          href={`/obras/${obra.id}/configuracoes`}
          className="shrink-0 p-1 text-lg"
          aria-label="Configurações da obra"
        >
          ⋮
        </Link>
      </header>

      <ObraTabs obraId={obra.id} />

      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>

      <AtalhoDeCaptura obraId={obra.id} faseAtualId={obra.current_phase_id} />
    </div>
  );
}
