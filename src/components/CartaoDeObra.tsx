import Link from "next/link";
import Image from "next/image";
import { AcoesDaObra } from "@/components/AcoesDaObra";
import type { AvisoDaObra, TomDoAviso } from "@/lib/resumoDaObra";

export type ObraDaLista = {
  id: string;
  name: string;
  location: string | null;
  photo_url: string | null;
  status: string;
  fases: { name: string; color: string }[] | { name: string; color: string } | null;
};

/** Cor da segunda linha por urgência — o vermelho só aparece quando é vermelho. */
const COR_DO_TOM: Record<TomDoAviso, string> = {
  atrasado: "text-alert",
  hoje: "text-pending-ink",
  organizar: "text-info",
  calmo: "text-ink-soft",
};

const COR_DA_BOLINHA: Record<TomDoAviso, string> = {
  atrasado: "bg-alert",
  hoje: "bg-pending",
  organizar: "bg-info",
  calmo: "",
};

/**
 * A segunda linha do card (D151). É um link próprio, para Pendências e não
 * para a conversa: quem lê "atrasado" quer resolver, não conversar. Link
 * dentro de link não vale em HTML, então ela fica FORA do link da obra —
 * mesma razão da engrenagem.
 */
function LinhaDeAtencao({ obraId, aviso }: { obraId: string; aviso: AvisoDaObra }) {
  const urgente = aviso.tom !== "calmo";

  return (
    <Link
      href={`/obras/${obraId}/pendencias`}
      className="mt-2 flex min-h-11 items-center gap-2 border-t border-line pt-2 active:bg-surface-alt"
    >
      {urgente && (
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${COR_DA_BOLINHA[aviso.tom]}`} />
      )}
      <span
        className={`min-w-0 truncate text-caption ${urgente ? "font-medium" : ""} ${COR_DO_TOM[aviso.tom]}`}
      >
        {aviso.texto}
      </span>
      {/* O "+2" nunca encolhe: é ele que diz que tem mais coisa esperando. */}
      {aviso.resto !== undefined && aviso.resto > 0 && (
        <span className={`shrink-0 text-caption font-medium ${COR_DO_TOM[aviso.tom]}`}>
          +{aviso.resto}
        </span>
      )}
      {urgente && (
        <span aria-hidden className={`ml-auto shrink-0 text-caption ${COR_DO_TOM[aviso.tom]}`}>
          ›
        </span>
      )}
    </Link>
  );
}

export function CartaoDeObra({
  obra,
  capa,
  aviso,
}: {
  obra: ObraDaLista;
  capa: string | null;
  aviso: AvisoDaObra | null;
}) {
  const fase = Array.isArray(obra.fases) ? obra.fases[0] : obra.fases;
  const arquivada = obra.status === "archived";

  // A engrenagem fica FORA do link da obra: link dentro de link não vale em
  // HTML, e o toque acabaria abrindo a conversa em vez das configurações.
  return (
    <div className="rounded-card bg-surface p-3 shadow-card">
      <div className="flex items-center gap-1">
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

      {aviso && <LinhaDeAtencao obraId={obra.id} aviso={aviso} />}
    </div>
  );
}

