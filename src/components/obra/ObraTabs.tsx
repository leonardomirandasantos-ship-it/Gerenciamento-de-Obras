"use client";

import { useEffect, useRef } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

/** Ícones de 16px em currentColor — sem biblioteca, para não pesar o bundle. */
const ICONES: Record<string, React.ReactNode> = {
  resumo: (
    <>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 1.8V8h6.2" />
    </>
  ),
  conversa: <path d="M14 8.6c0 2.7-2.7 4.9-6 4.9-.7 0-1.4-.1-2-.3L2.4 14l.9-2.4C2.5 10.8 2 9.7 2 8.6 2 5.9 4.7 3.7 8 3.7s6 2.2 6 4.9Z" />,
  pendencias: (
    <>
      <rect x="2.4" y="2.4" width="11.2" height="11.2" rx="3" />
      <path d="M5.4 8.2 7.2 10l3.4-3.6" />
    </>
  ),
  documentacao: <path d="M2.2 4.6a1.6 1.6 0 0 1 1.6-1.6h2.3l1.4 1.7h4.7a1.6 1.6 0 0 1 1.6 1.6v5.1a1.6 1.6 0 0 1-1.6 1.6H3.8a1.6 1.6 0 0 1-1.6-1.6Z" />,
  decisoes: (
    <>
      <circle cx="8" cy="8" r="5.8" />
      <path d="M5.6 8.2 7.3 9.9l3.2-3.6" />
    </>
  ),
  dash: <path d="M3 13V7.4M8 13V3M13 13V9.6" />,
};

const ABAS = [
  { slug: "resumo", label: "Resumo" },
  { slug: "conversa", label: "Conversa" },
  { slug: "pendencias", label: "Pendências" },
  { slug: "documentacao", label: "Documentação" },
  { slug: "decisoes", label: "Decisões" },
  { slug: "dash", label: "Dash" },
];

function Icone({ slug }: { slug: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className="h-4 w-4 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONES[slug]}
    </svg>
  );
}

/** Bolinha pulsando enquanto a navegação da aba não completa. */
function Pendente() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden
      className="ml-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary align-middle"
    />
  );
}

export function ObraTabs({ obraId }: { obraId: string }) {
  const pathname = usePathname();
  const abaAtivaRef = useRef<HTMLAnchorElement>(null);

  // Em tela de celular as abas não cabem todas: traz a ativa para a vista.
  useEffect(() => {
    abaAtivaRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [pathname]);

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-2">
      {ABAS.map((aba) => {
        const href = `/obras/${obraId}/${aba.slug}`;
        const ativa = pathname === href;
        return (
          <Link
            key={aba.slug}
            ref={ativa ? abaAtivaRef : undefined}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[3px] px-3 py-3 font-display text-caption font-semibold ${
              ativa ? "border-primary text-primary" : "border-transparent text-ink-soft"
            }`}
          >
            <Icone slug={aba.slug} />
            {aba.label}
            <Pendente />
          </Link>
        );
      })}
    </nav>
  );
}
