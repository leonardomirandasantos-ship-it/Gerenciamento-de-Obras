"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ABAS = [
  { slug: "resumo", label: "Resumo" },
  { slug: "conversa", label: "Conversa" },
  { slug: "pendencias", label: "Pendências" },
  { slug: "documentacao", label: "Documentação" },
  { slug: "decisoes", label: "Decisões" },
  { slug: "dash", label: "Dash" },
];

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
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium ${
              ativa ? "border-primary text-primary" : "border-transparent text-ink-soft"
            }`}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
