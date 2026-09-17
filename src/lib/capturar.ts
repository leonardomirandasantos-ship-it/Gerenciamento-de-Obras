import { createClient } from "./supabase/client";
import { chaveSegura } from "./arquivos";
import { classificar } from "./classify";
import { extrairDadosPagamento } from "./pagamento";
import type { AnexoTipo, EventoKind } from "./types";

/**
 * Toda captura passa por aqui — o composer da conversa e o atalho "+" das
 * lentes (D79). O atalho não é um caminho novo: ele grava a mesma mensagem,
 * na mesma conversa, só já com o tipo declarado. A conversa continua sendo a
 * fonte da verdade (D6).
 */

export function tipoDoArquivo(file: File): AnexoTipo {
  if (file.type.startsWith("image/")) return "foto";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "audio";
}

export function classificarTexto(texto: string) {
  return classificar({
    texto,
    temFoto: false,
    temVideo: false,
    temPdf: false,
    temAudio: false,
  });
}

function semVazios(objeto: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(objeto).filter(([, valor]) => valor !== undefined));
}

export async function capturarTexto({
  obraId,
  texto,
  faseAtualId,
  kind,
  payloadExtra,
}: {
  obraId: string;
  texto: string;
  faseAtualId: string | null;
  /** Vindo do atalho: o usuário já declarou o tipo, não há o que adivinhar. */
  kind?: EventoKind;
  payloadExtra?: Record<string, unknown>;
}) {
  const supabase = createClient();
  const automatico = classificarTexto(texto);
  const tipoFinal = kind ?? automatico.kind;

  const payload = semVazios({
    ...(tipoFinal === "E7_pagamento" ? extrairDadosPagamento(texto) : {}),
    ...(payloadExtra ?? {}),
  });

  await supabase.from("eventos").insert({
    obra_id: obraId,
    kind: tipoFinal,
    confidence: kind ? 1 : automatico.confidence,
    raw_text: texto,
    phase_id: faseAtualId,
    // Tipo declarado pelo usuário: não reabrir sugestão de classificação.
    edited: Boolean(kind),
    payload,
  });
}

/** Devolve os nomes que não subiram, para a tela poder avisar (D102). */
export async function capturarArquivos({
  obraId,
  arquivos,
  faseAtualId,
  kind,
}: {
  obraId: string;
  arquivos: File[];
  faseAtualId: string | null;
  kind?: EventoKind;
}): Promise<{ falhas: string[] }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { falhas: arquivos.map((file) => file.name) };

  const falhas: string[] = [];

  for (const file of arquivos) {
    const tipo = tipoDoArquivo(file);
    // O nome do arquivo entra na classificação: "Orçamento 335396.pdf" → E8.
    const automatico = classificar({
      texto: file.name,
      temFoto: tipo === "foto",
      temVideo: tipo === "video",
      temPdf: tipo === "pdf",
      temAudio: tipo === "audio",
    });

    const path = `${user.id}/${obraId}/${Date.now()}-${chaveSegura(file.name)}`;
    const { error: erroUpload } = await supabase.storage.from("anexos").upload(path, file);
    if (erroUpload) {
      falhas.push(file.name);
      continue;
    }

    const { data: evento } = await supabase
      .from("eventos")
      .insert({
        obra_id: obraId,
        kind: kind ?? automatico.kind,
        confidence: kind ? 1 : automatico.confidence,
        phase_id: faseAtualId,
        edited: Boolean(kind),
        payload: { fileName: file.name },
      })
      .select("id")
      .single();

    if (evento) {
      await supabase.from("anexos").insert({ evento_id: evento.id, url: path, tipo });
    } else {
      falhas.push(file.name);
    }
  }

  return { falhas };
}
