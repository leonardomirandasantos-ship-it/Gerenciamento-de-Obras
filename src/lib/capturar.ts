import { createClient } from "./supabase/client";
import { chaveSegura } from "./arquivos";
import { extrairPrazoDeclarado } from "./datas";
import { normalizarFavorecido } from "./pagamento";
import { mimeLimpo } from "./audio";
import { paraWavMono16k } from "./wav";
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
  contexto,
}: {
  obraId: string;
  arquivos: File[];
  faseAtualId: string | null;
  kind?: EventoKind;
  /** O que ela escreveu junto do anexo — vira legenda E entra na classificação. */
  legenda?: string;
  /**
   * Com contexto, a imagem passa pela IA: comprovante de PIX vira gasto com
   * valor e favorecido lidos da própria imagem (D134). Sem contexto (ou sem
   * chave), continua o caminho de antes — legenda e nome do arquivo.
   */
  contexto?: ContextoDaObra;
}): Promise<{ falhas: string[]; entendidos: number; aviso?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { falhas: arquivos.map((file) => file.name), entendidos: 0 };
  }

  const falhas: string[] = [];
  let entendidos = 0;
  let aviso: string | undefined;
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

    if (!evento) {
      falhas.push(file.name);
      continue;
    }

    await supabase.from("anexos").insert({ evento_id: evento.id, url: path, tipo });

    // Imagem e PDF, e só quando o tipo não foi declarado por ela: se ela disse
    // que é foto de obra, não cabe a IA discordar.
    if ((tipo === "foto" || tipo === "pdf") && contexto && !kind) {
      // PDF grande não passa pelo limite de corpo da função (~4,5 MB): fica
      // com a classificação pelo nome, que é o comportamento de antes.
      if (file.size > LIMITE_PARA_LER) {
        aviso = aviso ?? "Guardei o PDF, mas ele é grande demais para eu ler sozinho.";
        continue;
      }
      const resultado = await entenderArquivo(supabase, obraId, faseAtualId, evento.id, file, contexto);
      entendidos += resultado.aplicados;
      aviso = aviso ?? resultado.aviso;
    }
  }

  return { falhas, entendidos, aviso };
}

const LIMITE_PARA_LER = 4 * 1024 * 1024;

/**
 * Aplica o entendimento no próprio arquivo: o comprovante É a evidência do
 * pagamento (D5), então ele não vira um registro separado — o evento da foto
 * passa a ser o gasto. Assunto a mais no mesmo arquivo (nota com material,
 * por exemplo) vira registro derivado apontando de volta.
 *
 * PDF é sempre UM registro (D148): o orçamento é o próprio arquivo, e itens
 * orçados não são pendências dela — virariam listas que ninguém pediu.
 */
async function entenderArquivo(
  supabase: ReturnType<typeof createClient>,
  obraId: string,
  faseAtualId: string | null,
  eventoId: string,
  arquivo: File,
  contexto: ContextoDaObra,
): Promise<{ aplicados: number; aviso?: string }> {
  const { entendimento, aviso } = await pedirEntendimento(arquivo, contexto);
  if (!entendimento) return { aplicados: 0, aviso };

  const registros = entendimento.registros ?? [];
  if (registros.length === 0) return { aplicados: 0 };

  const ehPdf = arquivo.type === "application/pdf";
  const [principal, ...demais] = registros;
  const extras = ehPdf ? [] : demais;
  const kind = kindDoTipo(principal.tipo);
  if (!kind) return { aplicados: 0 };

  const payload: Record<string, unknown> = { fileName: arquivo.name };
  // "unclassified" também guarda valor e nome: quando ela tocar "é gasto" no
  // card de dúvida, o pagamento já nasce preenchido.
  if (kind === "E7_pagamento" || kind === "E8_orcamento" || kind === "unclassified") {
    if (typeof principal.valor === "number") payload.amount = principal.valor;
    if (principal.favorecido) payload.payeeName = principal.favorecido;
  }
  if (kind === "E8_orcamento") {
    // A lista de orçamentos busca por fornecedor e produto.
    if (principal.favorecido) payload.supplier = principal.favorecido;
    const itens = principal.itens?.filter(Boolean) ?? [];
    if (itens.length > 0) payload.items = itens;
  }
  // Validade de orçamento não é prazo dela: em PDF, data não vira prazo.
  if (principal.prazo && !ehPdf) payload.date = principal.prazo;

  const vinculo =
    kind === "E7_pagamento"
      ? await ligarFavorecidoExistente(supabase, obraId, principal.favorecido)
      : {};

  await supabase
    .from("eventos")
    .update({
      kind,
      confidence: kind === "unclassified" ? 0 : 0.9,
      favorecido_id: vinculo.favorecido_id ?? null,
      caption: principal.texto,
      edited: kind !== "unclassified",
      payload: semVazios({ ...payload, payeeType: vinculo.payeeType }),
    })
    .eq("id", eventoId);

  const derivados: string[] = [];
  for (const extra of extras) {
    const id = await criarDerivado(supabase, obraId, faseAtualId, eventoId, extra);
    if (id) derivados.push(id);
  }

  return { aplicados: 1 + derivados.length };
}


/**
 * Pede o entendimento do arquivo à rota serverless. Serve áudio e imagem: o
 * prompt tem os dois ramos e o schema de resposta é o mesmo (D134).
 */
async function pedirEntendimento(
  arquivo: File,
  contexto: ContextoDaObra,
): Promise<{ entendimento: Entendimento | null; aviso?: string }> {
  const form = new FormData();
  form.append("arquivo", arquivo);
  form.append("hoje", new Date().toISOString().slice(0, 10));
  form.append("fases", contexto.fases.join(", "));
  form.append("favorecidos", contexto.favorecidos.join(", "));
  form.append("ambientes", contexto.ambientes.join(", "));

  try {
    const resposta = await fetch("/api/entender", { method: "POST", body: form });
    if (resposta.ok) return { entendimento: (await resposta.json()) as Entendimento };

    const corpo = await resposta.json().catch(() => ({}));
    console.error("[entender] falhou:", resposta.status, corpo);
    return {
      entendimento: null,
      aviso: MOTIVOS[corpo?.erro as string] ?? `A leitura falhou (${resposta.status}).`,
    };
  } catch {
    return { entendimento: null, aviso: "Não consegui falar com o serviço de leitura." };
  }
}

/** Contexto da obra que ajuda o modelo a reusar nome e ambiente já existentes. */
export type ContextoDaObra = {
  fases: string[];
  favorecidos: string[];
  ambientes: string[];
};

/** Mensagem por causa: "falhou" sem motivo obriga a adivinhar (D129). */
const MOTIVOS: Record<string, string> = {
  sem_chave: "Ficou salvo, mas a leitura automática ainda não está configurada.",
  modelo_falhou: "Ficou salvo, mas o serviço de leitura recusou o arquivo.",
  resposta_vazia: "Ficou salvo, mas a leitura voltou vazia.",
  json_invalido: "Ficou salvo, mas não entendi a resposta da leitura.",
  "não autenticado": "Sua sessão expirou. Entre de novo e mande outra vez.",
};

/**
 * O mesmo contexto que a conversa monta no servidor, buscado no cliente: o
 * atalho "+" das lentes vive no layout e não recebe esses dados de graça.
 * Só é chamado no envio — nunca a cada troca de aba.
 */
export async function carregarContexto(obraId: string): Promise<ContextoDaObra> {
  const supabase = createClient();
  const [{ data: fases }, { data: favorecidos }] = await Promise.all([
    supabase.from("fases").select("name").eq("obra_id", obraId),
    supabase.from("favorecidos").select("name").eq("obra_id", obraId),
  ]);
  return {
    fases: (fases ?? []).map((fase) => fase.name as string),
    favorecidos: (favorecidos ?? []).map((f) => f.name as string),
    ambientes: [],
  };
}

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
  // O Gemini não aceita `audio/webm`, que é o que o Chrome grava (D128).
  // Converte para WAV só para a chamada; o original fica guardado como veio.
  let paraEnviar: Blob;
  let nomeEnviado: string;
  try {
    paraEnviar = await paraWavMono16k(blob);
    nomeEnviado = nome.replace(/\.[^.]+$/, ".wav");
  } catch {
    return {
      transcricao: "",
      criados: 0,
      aviso: "O áudio está salvo, mas não consegui convertê-lo para transcrever.",
    };
  }

  return entenderEAplicarAudio({
    supabase,
    obraId,
    faseAtualId,
    eventoAudioId: eventoAudio.id,
    wav: paraEnviar,
    nomeWav: nomeEnviado,
    nomeOriginal: nome,
    segundos,
    contexto,
  });
}

/**
 * Manda o WAV para a rota e grava o resultado. Separado da captura para poder
 * ser chamado DE NOVO (D139): o 503 "high demand" do modelo é frequente, e sem
 * repetir a única saída era apagar o áudio e regravar.
 */
async function entenderEAplicarAudio({
  supabase,
  obraId,
  faseAtualId,
  eventoAudioId,
  wav,
  nomeWav,
  nomeOriginal,
  segundos,
  contexto,
}: {
  supabase: ReturnType<typeof createClient>;
  obraId: string;
  faseAtualId: string | null;
  eventoAudioId: string;
  wav: Blob;
  nomeWav: string;
  nomeOriginal: string;
  segundos: number;
  contexto: ContextoDaObra;
}): Promise<ResultadoDoAudio> {
  const { entendimento, aviso } = await pedirEntendimento(
    new File([wav], nomeWav, { type: "audio/wav" }),
    contexto,
  );

  if (!entendimento) {
    return { transcricao: "", criados: 0, aviso: aviso ? `O áudio está salvo. ${aviso}` : undefined };
  }

  const derivados: string[] = [];
  for (const registro of entendimento.registros ?? []) {
    const id = await criarDerivado(supabase, obraId, faseAtualId, eventoAudioId, registro);
    if (id) derivados.push(id);
  }

  await supabase
    .from("eventos")
    .update({
      raw_text: entendimento.transcricao || null,
      payload: {
        fileName: nomeOriginal,
        durationSeconds: segundos,
        transcript: entendimento.transcricao,
        derivedEventIds: derivados,
      },
    })
    .eq("id", eventoAudioId);

  return { transcricao: entendimento.transcricao ?? "", criados: derivados.length };
}

/**
 * Tenta entender de novo um áudio já guardado. Baixa o original do Storage,
 * converte e repete o pedido — o arquivo nunca se perdeu, só o entendimento.
 */
export async function reentenderAudio({
  obraId,
  eventoAudioId,
  urlDoAudio,
  faseAtualId,
  segundos,
  contexto,
}: {
  obraId: string;
  eventoAudioId: string;
  /** URL assinada do anexo, como a conversa já recebe. */
  urlDoAudio: string;
  faseAtualId: string | null;
  segundos: number;
  contexto: ContextoDaObra;
}): Promise<ResultadoDoAudio> {
  const supabase = createClient();

  try {
    const resposta = await fetch(urlDoAudio);
    if (!resposta.ok) throw new Error(`storage respondeu ${resposta.status}`);

    const original = await resposta.blob();
    const wav = await paraWavMono16k(original);

    return entenderEAplicarAudio({
      supabase,
      obraId,
      faseAtualId,
      eventoAudioId,
      wav,
      nomeWav: "audio.wav",
      nomeOriginal: `audio-${eventoAudioId}`,
      segundos,
      contexto,
    });
  } catch (erro) {
    console.error("[reentender]", erro);
    return { transcricao: "", criados: 0, aviso: "Não consegui buscar o áudio para tentar de novo." };
  }
}

async function criarDerivado(
  supabase: ReturnType<typeof createClient>,
  obraId: string,
  faseAtualId: string | null,
  /** O áudio ou a imagem de onde este registro saiu. */
  audioId: string,
  registro: RegistroEntendido,
): Promise<string | null> {
  const kind = kindDoTipo(registro.tipo);
  if (!kind) return null;

  const texto = (registro.itens?.length ? registro.itens.join("\n") : registro.texto)?.trim();
  if (!texto) return null;

  const payload: Record<string, unknown> = { sourceCaptureEventId: audioId, sourceAudioEventId: audioId };

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
