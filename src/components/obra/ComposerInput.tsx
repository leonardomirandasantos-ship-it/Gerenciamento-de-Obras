"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { classificar } from "@/lib/classify";
import { extrairDadosPagamento } from "@/lib/pagamento";
import type { Pendente } from "./ConversaClient";
import type { AnexoTipo } from "@/lib/types";

function tipoDoArquivo(file: File): AnexoTipo {
  if (file.type.startsWith("image/")) return "foto";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "audio";
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function enviarTexto() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    const { kind, confidence } = classificar({
      texto: conteudo,
      temFoto: false,
      temVideo: false,
      temPdf: false,
      temAudio: false,
    });

    // Some do input e aparece no feed na hora — a captura não espera o banco.
    setTexto("");
    onPendente({ id: crypto.randomUUID(), texto: conteudo, kind });
    setEnviando(true);

    const supabase = createClient();
    await supabase.from("eventos").insert({
      obra_id: obraId,
      kind,
      confidence,
      raw_text: conteudo,
      phase_id: faseAtualId,
      payload: kind === "E7_pagamento" ? extrairDadosPagamento(conteudo) : {},
    });

    setEnviando(false);
    router.refresh();
  }

  async function enviarArquivos(files: FileList) {
    const lista = Array.from(files);
    for (const file of lista) {
      onPendente({
        id: crypto.randomUUID(),
        texto: `📎 ${file.name}`,
        kind: classificar({
          texto: file.name,
          temFoto: file.type.startsWith("image/"),
          temVideo: file.type.startsWith("video/"),
          temPdf: file.type === "application/pdf",
          temAudio: false,
        }).kind,
      });
    }

    setEnviando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEnviando(false);
      return;
    }

    for (const file of lista) {
      const tipo = tipoDoArquivo(file);
      // O nome do arquivo entra na classificação: "Orçamento 335396.pdf" → E8.
      const { kind, confidence } = classificar({
        texto: file.name,
        temFoto: tipo === "foto",
        temVideo: tipo === "video",
        temPdf: tipo === "pdf",
        temAudio: tipo === "audio",
      });

      const path = `${user.id}/${obraId}/${Date.now()}-${file.name}`;
      const { error: erroUpload } = await supabase.storage.from("anexos").upload(path, file);
      if (erroUpload) continue;

      const { data: evento } = await supabase
        .from("eventos")
        .insert({
          obra_id: obraId,
          kind,
          confidence,
          phase_id: faseAtualId,
          payload: { fileName: file.name },
        })
        .select("id")
        .single();

      if (evento) {
        await supabase.from("anexos").insert({ evento_id: evento.id, url: path, tipo });
      }
    }

    setEnviando(false);
    router.refresh();
  }

  return (
    <div className="safe-bottom flex items-end gap-2 border-t border-line bg-surface px-3 pt-3">
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
  );
}
