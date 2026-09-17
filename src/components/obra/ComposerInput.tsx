"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { capturarArquivos, capturarTexto, classificarTexto } from "@/lib/capturar";
import type { Pendente } from "./ConversaClient";

export function ComposerInput({
  obraId,
  faseAtualId,
  onPendente,
}: {
  obraId: string;
  faseAtualId: string | null;
  onPendente: (pendente: Pendente) => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [avisoAudio, setAvisoAudio] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function enviarTexto() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    // Some do input e aparece no feed na hora — a captura não espera o banco.
    setTexto("");
    onPendente({
      id: crypto.randomUUID(),
      texto: conteudo,
      kind: classificarTexto(conteudo).kind,
    });
    setEnviando(true);

    await capturarTexto({ obraId, texto: conteudo, faseAtualId });

    setEnviando(false);
    router.refresh();
  }

  async function enviarArquivos(files: FileList) {
    const lista = Array.from(files);
    for (const file of lista) {
      onPendente({
        id: crypto.randomUUID(),
        texto: `📎 ${file.name}`,
        kind: classificarTexto(file.name).kind,
      });
    }

    setEnviando(true);
    await capturarArquivos({ obraId, arquivos: lista, faseAtualId });
    setEnviando(false);
    router.refresh();
  }

  return (
    <div className="safe-bottom bg-surface px-3 pt-3">
      {avisoAudio && (
        <p className="mb-2 rounded-card bg-primary-soft px-3 py-2 text-micro text-ink-soft">
          🎙️ Áudio ainda está em construção. Por enquanto, manda por texto ou foto.
        </p>
      )}

      <div className="flex items-end gap-2 border-t border-line pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) enviarArquivos(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-soft active:bg-surface-alt"
          aria-label="Anexar foto, vídeo ou PDF"
        >
          📎
        </button>

        <textarea
          rows={1}
          placeholder="Manda aqui..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter = nova linha (ela escreve listas de várias linhas o tempo
            // todo). Enviar é só pelo botão — ou Cmd/Ctrl+Enter no teclado.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              enviarTexto();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-bubble border border-line bg-surface-alt px-4 py-3 text-base leading-tight text-ink outline-none focus:border-primary"
        />

        {/* Microfone: só desenho por enquanto (D56 ainda não implementado). */}
        <button
          type="button"
          onClick={() => {
            setAvisoAudio(true);
            setTimeout(() => setAvisoAudio(false), 3500);
          }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-soft active:bg-surface-alt"
          aria-label="Gravar áudio (em construção)"
        >
          🎙️
        </button>

        <button
          type="button"
          onClick={enviarTexto}
          disabled={!texto.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-white disabled:opacity-40"
          aria-label="Enviar"
        >
          {enviando ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            "➤"
          )}
        </button>
      </div>
    </div>
  );
}
