"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  capturarArquivos,
  capturarAudio,
  capturarTexto,
  classificarTexto,
  type ContextoDaObra,
} from "@/lib/capturar";
import { GravadorDeAudio } from "./GravadorDeAudio";
import type { Pendente } from "./ConversaClient";

export function ComposerInput({
  obraId,
  faseAtualId,
  contexto,
  onPendente,
}: {
  obraId: string;
  faseAtualId: string | null;
  /** Nomes e ambientes já usados na obra, para o áudio reaproveitar. */
  contexto: ContextoDaObra;
  onPendente: (pendente: Pendente) => void;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [avisoAudio, setAvisoAudio] = useState<string | null>(null);
  const [gravado, setGravado] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [falhas, setFalhas] = useState<string[]>([]);
  // Anexo fica "em espera" até ela mandar, para poder escrever o que é — é o
  // modelo do WhatsApp e não cria gate: mandar sem escrever nada continua a
  // um toque (D106).
  const [emEspera, setEmEspera] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function enviar() {
    if (emEspera.length > 0) {
      await enviarArquivos(emEspera, texto.trim());
      return;
    }
    await enviarTexto();
  }

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

    await capturarTexto({
      obraId,
      texto: conteudo,
      faseAtualId,
      // A lista já apareceu; se a IA separar melhor os itens, a tela acompanha.
      aoRefinar: () => router.refresh(),
    });

    setEnviando(false);
    router.refresh();
  }

  async function enviarAudio(blob: Blob, mimeType: string, segundos: number) {
    setGravado(true);
    setAvisoAudio(null);
    onPendente({
      id: crypto.randomUUID(),
      texto: "🎙️ áudio",
      kind: "E9_audio",
      nota: "transcrevendo…",
    });

    const resultado = await capturarAudio({
      obraId,
      blob,
      mimeType,
      segundos,
      faseAtualId,
      contexto,
    });

    setGravado(false);
    if (resultado.aviso) setAvisoAudio(resultado.aviso);
    else if (resultado.criados > 0) {
      setAvisoAudio(
        `Entendi e criei ${resultado.criados} ${resultado.criados === 1 ? "registro" : "registros"} desse áudio.`,
      );
    }
    setTimeout(() => setAvisoAudio(null), 5000);
    router.refresh();
  }

  async function enviarArquivos(lista: File[], legenda: string) {
    if (enviando) return;

    // A bolha otimista diz "lendo" quando a imagem vai passar pela IA: ela
    // fica visível durante os ~30s da leitura, igual acontece com o áudio.
    const ehPdf = (file: File) => file.type === "application/pdf";
    const notaDeLeitura = (file: File) =>
      file.type.startsWith("image/") ? "lendo a imagem…" : ehPdf(file) ? "lendo o PDF…" : undefined;

    for (const file of lista) {
      onPendente({
        id: crypto.randomUUID(),
        texto: legenda || `📎 ${file.name}`,
        kind: classificarTexto(legenda || file.name).kind,
        nota: notaDeLeitura(file),
      });
    }

    setTexto("");
    setEmEspera([]);
    setEnviando(true);
    setFalhas([]);
    const resultado = await capturarArquivos({
      obraId,
      arquivos: lista,
      faseAtualId,
      legenda,
      contexto,
    });
    setFalhas(resultado.falhas);
    setEnviando(false);

    if (resultado.aviso) setAvisoAudio(resultado.aviso);
    else if (resultado.entendidos > 0) {
      setAvisoAudio(
        `Li ${lista.every(ehPdf) ? "o PDF" : lista.some(ehPdf) ? "os arquivos" : "a imagem"} e preenchi ${resultado.entendidos} ${resultado.entendidos === 1 ? "registro" : "registros"}.`,
      );
    }
    if (resultado.aviso || resultado.entendidos > 0) {
      setTimeout(() => setAvisoAudio(null), 5000);
    }
    router.refresh();
  }

  return (
    <div className="safe-bottom bg-surface px-3 pt-3">
      {falhas.length > 0 && (
        <p className="mb-2 rounded-card border border-alert px-3 py-2 text-micro text-alert">
          Não consegui enviar: {falhas.join(", ")}. Tenta de novo?
        </p>
      )}

      {avisoAudio && (
        <p className="mb-2 rounded-card bg-primary-soft px-3 py-2 text-micro text-ink-soft">
          {avisoAudio}
        </p>
      )}

      {emEspera.length > 0 && !gravando && (
        <div className="mb-2 flex flex-wrap gap-2">
          {emEspera.map((file, indice) => (
            <span
              key={`${file.name}-${indice}`}
              className="flex max-w-full items-center gap-2 rounded-full bg-surface-alt py-1 pl-3 pr-1 text-micro text-ink"
            >
              <span className="min-w-0 truncate">📎 {file.name}</span>
              <button
                type="button"
                onClick={() => setEmEspera((atuais) => atuais.filter((_, i) => i !== indice))}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-soft"
                aria-label={`Tirar ${file.name}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-line pt-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              setEmEspera((atuais) => [...atuais, ...Array.from(e.target.files!)]);
            }
            e.target.value = "";
          }}
        />
        {!gravando && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-ink-soft active:bg-surface-alt"
            aria-label="Anexar foto, vídeo ou PDF"
          >
            📎
          </button>
        )}

        {!gravando && (
        <textarea
          rows={1}
          placeholder={emEspera.length > 0 ? "Escreve o que é (opcional)" : "Manda aqui..."}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter = nova linha (ela escreve listas de várias linhas o tempo
            // todo). Enviar é só pelo botão — ou Cmd/Ctrl+Enter no teclado.
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              enviar();
            }
          }}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-bubble border border-line bg-surface-alt px-4 py-3 text-base leading-tight text-ink outline-none focus:border-primary"
        />
        )}

        <GravadorDeAudio
          onPronto={enviarAudio}
          onErro={(mensagem) => {
            setAvisoAudio(mensagem);
            setTimeout(() => setAvisoAudio(null), 5000);
          }}
          onGravandoChange={setGravando}
          desabilitado={gravado || enviando}
        />

        {!gravando && (
          <button
            type="button"
            onClick={enviar}
            disabled={!texto.trim() && emEspera.length === 0}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-white disabled:opacity-40"
            aria-label="Enviar"
          >
            {enviando ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              "➤"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
