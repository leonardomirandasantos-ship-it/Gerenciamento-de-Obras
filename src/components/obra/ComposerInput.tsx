"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { classificar } from "@/lib/classify";
import type { AnexoTipo } from "@/lib/types";

function tipoDoArquivo(file: File): AnexoTipo {
  if (file.type.startsWith("image/")) return "foto";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "audio";
}

export function ComposerInput({ obraId }: { obraId: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function enviarTexto() {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setTexto("");
    setEnviando(true);

    const supabase = createClient();
    const { kind, confidence } = classificar({
      texto: conteudo,
      temFoto: false,
      temVideo: false,
      temPdf: false,
      temAudio: false,
    });

    await supabase.from("eventos").insert({
      obra_id: obraId,
      kind,
      confidence,
      raw_text: conteudo,
    });

    setEnviando(false);
    router.refresh();
  }

  async function enviarArquivos(files: FileList) {
    setEnviando(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEnviando(false);
      return;
    }

    for (const file of Array.from(files)) {
      const tipo = tipoDoArquivo(file);
      const { kind, confidence } = classificar({
        texto: "",
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
        .insert({ obra_id: obraId, kind, confidence })
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
    <div className="flex items-end gap-2 border-t border-line bg-surface p-3">
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
        className="shrink-0 rounded-full p-2 text-xl text-ink-soft"
        aria-label="Anexar"
      >
        📎
      </button>

      <textarea
        rows={1}
        placeholder="Escreva algo, cole uma lista, ou anexe uma foto..."
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            enviarTexto();
          }
        }}
        className="max-h-32 flex-1 resize-none rounded-bubble border border-line bg-surface-alt px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />

      <button
        type="button"
        onClick={enviarTexto}
        disabled={enviando || !texto.trim()}
        className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Enviar
      </button>
    </div>
  );
}
