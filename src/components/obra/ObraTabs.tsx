"use client";

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

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-2">
      {ABAS.map((aba) => {
        const href = `/obras/${obraId}/${aba.slug}`;
        const ativa = pathname === href;
        return (
          <Link
            key={aba.slug}
            href={href}
            className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
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
