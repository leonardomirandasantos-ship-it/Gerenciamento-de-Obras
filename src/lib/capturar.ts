import { createClient } from "./supabase/client";
import { chaveSegura } from "./arquivos";
import { extrairPrazoDeclarado } from "./datas";
import { normalizarFavorecido } from "./pagamento";
import { mimeLimpo } from "./audio";
import { kindDoTipo, type Entendimento, type RegistroEntendido } from "./entender";
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


/** Contexto da obra que ajuda o modelo a reusar nome e ambiente já existentes. */
export type ContextoDaObra = {
  fases: string[];
  favorecidos: string[];
  ambientes: string[];
};

export type ResultadoDoAudio = {
  transcricao: string;
  criados: number;
  /** Preenchido quando o áudio subiu mas o entendimento não veio. */
  aviso?: string;
};

/**
 * Captura de voz (D124/D125). O áudio é guardado como o registro original —
 * nada é descartado (D3) — e os registros que saem dele apontam de volta,
 * então se a transcrição errar é possível reouvir e corrigir.
 *
 * Um áudio pode gerar VÁRIOS registros: no canteiro ela fala o pagamento e a
 * compra pendente na mesma frase, e são lentes diferentes.
 */
export async function capturarAudio({
  obraId,
  blob,
  mimeType,
  segundos,
  faseAtualId,
  contexto,
}: {
  obraId: string;
  blob: Blob;
  mimeType: string;
  segundos: number;
  faseAtualId: string | null;
  contexto: ContextoDaObra;
}): Promise<ResultadoDoAudio> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { transcricao: "", criados: 0, aviso: "Sessão expirada." };

  const extensao = mimeLimpo(mimeType).split("/")[1] ?? "webm";
  const nome = `audio-${Date.now()}.${extensao}`;
  const path = `${user.id}/${obraId}/${chaveSegura(nome)}`;

  const { error: erroUpload } = await supabase.storage
    .from("anexos")
    .upload(path, blob, { contentType: mimeLimpo(mimeType) });

  if (erroUpload) {
    return { transcricao: "", criados: 0, aviso: "Não consegui subir o áudio." };
  }

  // O áudio entra na conversa ANTES de ser entendido: a captura não espera a
  // IA (D1). Se o entendimento falhar, o áudio continua lá, ouvível.
  const { data: eventoAudio } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind: "E9_audio",
      confidence: 1,
      phase_id: faseAtualId,
      payload: { fileName: nome, durationSeconds: segundos },
    })
    .select("id")
    .single();

  if (!eventoAudio) {
    return { transcricao: "", criados: 0, aviso: "Não consegui guardar o áudio." };
  }

  await supabase.from("anexos").insert({ evento_id: eventoAudio.id, url: path, tipo: "audio" });

  // ---------------------------------------------------------- entendimento
  const form = new FormData();
  form.append("arquivo", new File([blob], nome, { type: mimeLimpo(mimeType) }));
  form.append("hoje", new Date().toISOString().slice(0, 10));
  form.append("fases", contexto.fases.join(", "));
  form.append("favorecidos", contexto.favorecidos.join(", "));
  form.append("ambientes", contexto.ambientes.join(", "));

  let entendimento: Entendimento | null = null;
  let aviso: string | undefined;

  try {
    const resposta = await fetch("/api/entender", { method: "POST", body: form });
    if (resposta.ok) {
      entendimento = (await resposta.json()) as Entendimento;
    } else {
      const corpo = await resposta.json().catch(() => ({}));
      aviso =
        corpo?.erro === "sem_chave"
          ? "O áudio está salvo, mas a transcrição ainda não está configurada."
          : "O áudio está salvo, mas não consegui entender o que foi dito.";
    }
  } catch {
    aviso = "O áudio está salvo, mas não consegui falar com o serviço de transcrição.";
  }

  if (!entendimento) return { transcricao: "", criados: 0, aviso };

  const derivados: string[] = [];

  for (const registro of entendimento.registros ?? []) {
    const id = await criarDerivado(supabase, obraId, faseAtualId, eventoAudio.id, registro);
    if (id) derivados.push(id);
  }

  await supabase
    .from("eventos")
    .update({
      raw_text: entendimento.transcricao || null,
      payload: {
        fileName: nome,
        durationSeconds: segundos,
        transcript: entendimento.transcricao,
        derivedEventIds: derivados,
      },
    })
    .eq("id", eventoAudio.id);

  return { transcricao: entendimento.transcricao ?? "", criados: derivados.length };
}

async function criarDerivado(
  supabase: ReturnType<typeof createClient>,
  obraId: string,
  faseAtualId: string | null,
  audioId: string,
  registro: RegistroEntendido,
): Promise<string | null> {
  const kind = kindDoTipo(registro.tipo);
  if (!kind) return null;

  const texto = (registro.itens?.length ? registro.itens.join("\n") : registro.texto)?.trim();
  if (!texto) return null;

  const payload: Record<string, unknown> = { sourceAudioEventId: audioId };

  if (kind === "E7_pagamento" || kind === "E8_orcamento") {
    if (typeof registro.valor === "number") payload.amount = registro.valor;
    if (registro.favorecido) payload.payeeName = registro.favorecido;
  }
  if (registro.prazo) payload.date = registro.prazo;
  if (kind === "E3_decisao") {
    const ambientes = registro.ambientes?.filter(Boolean) ?? [];
    if (ambientes.length > 0) {
      payload.environments = ambientes;
      payload.environment = ambientes[0];
    }
  }

  const vinculo =
    kind === "E7_pagamento"
      ? await ligarFavorecidoExistente(supabase, obraId, registro.favorecido)
      : {};

  const { data } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind,
      confidence: 0.9,
      phase_id: faseAtualId,
      favorecido_id: vinculo.favorecido_id ?? null,
      raw_text: texto,
      // Tipo vindo do entendimento do áudio: não reabrir "o que é isso?".
      edited: true,
      payload: semVazios({ ...payload, payeeType: vinculo.payeeType }),
    })
    .select("id")
    .single();

  return data?.id ?? null;
}
