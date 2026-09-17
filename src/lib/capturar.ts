import { createClient } from "./supabase/client";
import { chaveSegura } from "./arquivos";
import { extrairPrazoDeclarado } from "./datas";
import { normalizarFavorecido } from "./pagamento";
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

/**
 * Prazo que ela declarou entra sozinho, sem sugestão (D110): "comprar cimento
 * até sexta" é prazo, não convite a uma pergunta. Data só citada ("reunião
 * 11/04") continua virando sugestão, porque pode ser só referência.
 */
function prazoDaPendencia(kind: EventoKind, texto: string): string | undefined {
  if (kind !== "E1_lista" && kind !== "E2_checklist") return undefined;
  return extrairPrazoDeclarado(texto) ?? undefined;
}

/**
 * Se o favorecido já existe na obra, o pagamento novo é LIGADO a ele — mesmo
 * nome não deveria virar pessoa nova no resumo (D111). É o que fazia "paguei
 * pro Valdir" duas vezes aparecer como dois Valdires sem tipo.
 */
async function ligarFavorecidoExistente(
  supabase: ReturnType<typeof createClient>,
  obraId: string,
  nome: string | undefined,
): Promise<{ favorecido_id?: string; payeeType?: string }> {
  if (!nome) return {};

  const { data: cadastrados } = await supabase
    .from("favorecidos")
    .select("id, name, type")
    .eq("obra_id", obraId);

  const chave = normalizarFavorecido(nome);
  const achado = (cadastrados ?? []).find((f) => normalizarFavorecido(f.name) === chave);

  if (!achado) return {};
  return { favorecido_id: achado.id, payeeType: achado.type ?? undefined };
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
    date: prazoDaPendencia(tipoFinal, texto),
    ...(payloadExtra ?? {}),
  });

  const vinculo =
    tipoFinal === "E7_pagamento"
      ? await ligarFavorecidoExistente(supabase, obraId, payload.payeeName as string | undefined)
      : {};

  await supabase.from("eventos").insert({
    obra_id: obraId,
    kind: tipoFinal,
    confidence: kind ? 1 : automatico.confidence,
    raw_text: texto,
    phase_id: faseAtualId,
    favorecido_id: vinculo.favorecido_id ?? null,
    // Tipo declarado pelo usuário: não reabrir sugestão de classificação.
    edited: Boolean(kind),
    payload: semVazios({ ...payload, payeeType: vinculo.payeeType ?? payload.payeeType }),
  });
}

/** Devolve os nomes que não subiram, para a tela poder avisar (D102). */
export async function capturarArquivos({
  obraId,
  arquivos,
  faseAtualId,
  kind,
  legenda,
}: {
  obraId: string;
  arquivos: File[];
  faseAtualId: string | null;
  kind?: EventoKind;
  /** O que ela escreveu junto do anexo — vira legenda E entra na classificação. */
  legenda?: string;
}): Promise<{ falhas: string[] }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { falhas: arquivos.map((file) => file.name) };

  const falhas: string[] = [];

  const descricao = legenda?.trim() ?? "";

  for (const file of arquivos) {
    const tipo = tipoDoArquivo(file);
    // A legenda manda na classificação quando existe — "comprovante do Valdir"
    // diz muito mais que "IMG-20260610-WA0014.jpg". Sem legenda, vale o nome
    // do arquivo ("Orçamento 335396.pdf" → E8).
    const automatico = classificar({
      texto: descricao || file.name,
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
        caption: descricao || null,
        payload: semVazios({
          fileName: file.name,
          ...(automatico.kind === "E7_pagamento" && descricao
            ? extrairDadosPagamento(descricao)
            : {}),
        }),
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
