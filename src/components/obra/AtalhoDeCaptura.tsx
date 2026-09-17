"use client";

import { useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BottomSheet } from "./BottomSheet";
import { capturarArquivos, capturarTexto } from "@/lib/capturar";
import { RÓTULO_TIPO, type EventoKind } from "@/lib/types";

type Atalho = {
  kind: EventoKind;
  titulo: string;
  placeholder: string;
  /** Em vez de texto, abre a câmera/galeria direto. */
  arquivo?: boolean;
};

/**
 * Atalho de captura nas lentes (D79). A lente continua só lendo: o "+" não
 * grava um registro próprio — ele escreve uma mensagem na conversa, já com o
 * tipo declarado, e a lente mostra porque leu a conversa. Nada de caminho
 * paralelo: a conversa segue sendo o arquivo master da obra (D6).
 */
const POR_ABA: Record<string, Atalho> = {
  pendencias: {
    kind: "E1_lista",
    titulo: "Nova lista",
    placeholder: "cimento\nareia\nvergalhão 10mm",
  },
  dash: {
    kind: "E7_pagamento",
    titulo: "Registrar pagamento",
    placeholder: "paguei 1.250 para o José da caixa d'água",
  },
  decisoes: {
    kind: "E3_decisao",
    titulo: "Fixar decisão",
    placeholder: "piso da sala: porcelanato bege 90x90",
  },
  orcamentos: {
    kind: "E8_orcamento",
    titulo: "Novo orçamento",
    placeholder: "Anexar o PDF ou a foto do orçamento",
    arquivo: true,
  },
  documentacao: {
    kind: "E4_documentacao",
    titulo: "Nova foto da obra",
    placeholder: "Escolher foto ou vídeo",
    arquivo: true,
  },
  prestador: {
    kind: "E7_pagamento",
    titulo: "Registrar pagamento",
    placeholder: "paguei 1.250 para o José da caixa d'água",
  },
};

export function AtalhoDeCaptura({
  obraId,
  faseAtualId,
}: {
  obraId: string;
  faseAtualId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [valor, setValor] = useState("");
  const [favorecido, setFavorecido] = useState("");
  const [salvando, setSalvando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aba = pathname.split("/")[3] ?? "";
  const atalho = POR_ABA[aba];

  // Na conversa o composer já está ali embaixo; nas configurações não faz sentido.
  if (!atalho) return null;

  function fechar() {
    setAberto(false);
    setTexto("");
    setValor("");
    setFavorecido("");
  }

  async function salvar() {
    const conteudo = texto.trim();
    if (!conteudo || salvando) return;

    setSalvando(true);
    await capturarTexto({
      obraId,
      texto: conteudo,
      faseAtualId,
      kind: atalho.kind,
      payloadExtra:
        atalho.kind === "E7_pagamento"
          ? {
              amount: valor ? parseFloat(valor.replace(".", "").replace(",", ".")) : undefined,
              payeeName: favorecido.trim() || undefined,
            }
          : undefined,
    });
    setSalvando(false);
    fechar();
    router.refresh();
  }

  async function enviarArquivos(lista: FileList) {
    setSalvando(true);
    await capturarArquivos({
      obraId,
      arquivos: Array.from(lista),
      faseAtualId,
      kind: atalho.kind,
    });
    setSalvando(false);
    fechar();
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (atalho.arquivo ? fileInputRef.current?.click() : setAberto(true))}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-fab bg-primary text-2xl text-white shadow-card"
        aria-label={atalho.titulo}
      >
        {salvando ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          "+"
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={atalho.kind === "E8_orcamento" ? "application/pdf,image/*" : "image/*,video/*"}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) enviarArquivos(e.target.files);
          e.target.value = "";
        }}
      />

      {aberto && (
        <BottomSheet titulo={atalho.titulo} onFechar={fechar}>
          <>
            <p className="mb-3 rounded-card bg-primary-soft p-3 text-micro text-ink-soft">
              Isso vira uma mensagem na conversa, como qualquer outra — só já
              marcada como {RÓTULO_TIPO[atalho.kind]}.
            </p>

            {atalho.kind === "E7_pagamento" && (
              <div className="mb-3 flex gap-2">
                <div className="w-28 space-y-1">
                  <label className="text-micro font-semibold text-ink-soft">Valor (R$)</label>
                  <input
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-micro font-semibold text-ink-soft">Favorecido</label>
                  <input
                    value={favorecido}
                    onChange={(e) => setFavorecido(e.target.value)}
                    placeholder="Quem recebeu"
                    className="w-full rounded-card border border-line bg-surface px-3 py-2.5 text-base text-ink outline-none focus:border-primary"
                  />
                </div>
              </div>
            )}

            <textarea
              autoFocus
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder={atalho.placeholder}
              className="mb-4 w-full resize-none rounded-card border border-line bg-surface px-3 py-2.5 text-base leading-snug text-ink outline-none focus:border-primary"
            />

            <button
              type="button"
              onClick={salvar}
              disabled={salvando || !texto.trim()}
              className="w-full rounded-card bg-primary px-3 py-3 font-display text-body font-semibold text-white disabled:opacity-40"
            >
              {salvando ? "Mandando..." : "Mandar pra conversa"}
            </button>
          </>
        </BottomSheet>
      )}
    </>
  );
}
