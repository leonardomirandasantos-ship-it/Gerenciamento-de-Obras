/**
 * Prepara a conta para DEMONSTRAÇÃO: limpa tudo e semeia uma obra completa,
 * com material real do export de discovery, de forma que cada funcionalidade
 * do app tenha o que mostrar — inclusive as que dependem de "loop aberto"
 * (registro sem classificar, pagamento sem valor, prestador sem tipo).
 *
 * Usa a MESMA lógica do app para classificar e extrair dados, então o que
 * aparece na tela é o que o app produziria de verdade — não é maquete.
 *
 * Uso:
 *   PASTA_ANEXOS=/caminho/do/export npx tsx scripts/semear-demo.ts <email> <senha>
 *
 * Variáveis lidas do .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Nenhuma credencial fica no repositório — e-mail e senha vêm por argumento.
 */
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { classificar } from "../src/lib/classify";
import { extrairDadosPagamento, normalizarFavorecido } from "../src/lib/pagamento";
import { itensParaChecklist } from "../src/lib/checklist";
import { chaveSegura } from "../src/lib/arquivos";
import type { ChecklistItem } from "../src/lib/types";

function carregarEnv() {
  const conteudo = readFileSync(".env.local", "utf8");
  for (const linha of conteudo.split("\n")) {
    const [chave, ...resto] = linha.split("=");
    if (chave && resto.length > 0) process.env[chave.trim()] = resto.join("=").trim();
  }
}

/** Datas relativas a hoje, para a obra parecer vivida e não criada agora. */
const HOJE = new Date();
function diasAtras(dias: number, hora = 9, minuto = 0): string {
  const data = new Date(HOJE);
  data.setDate(data.getDate() - dias);
  data.setHours(hora, minuto, 0, 0);
  return data.toISOString();
}
function dataIso(dias: number): string {
  const data = new Date(HOJE);
  data.setDate(data.getDate() + dias);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(
    data.getDate(),
  ).padStart(2, "0")}`;
}

type Mensagem = {
  texto: string;
  dias: number;
  hora?: number;
  /** Força o tipo (para mostrar registro não classificado de propósito). */
  kind?: string;
  extras?: Record<string, unknown>;
  fase?: string;
};

/**
 * Amostra real do export de WhatsApp, distribuída no tempo. A ordem e as
 * lacunas são de propósito: cada bloco alimenta uma lente diferente.
 */
const MENSAGENS: Mensagem[] = [
  // --- começo da obra: material e cotação
  { texto: "Concreto muros e muros\n12 m³", dias: 96, hora: 8 },
  { texto: "110 mm tubo ocre", dias: 94, hora: 10 },
  {
    texto:
      "600 estrutural 19x19x29\n200 canaleta 19\n80 estrutural 19x19x14\n1200 estrutural 14x19x29\n150 canaletas 14",
    dias: 92,
    hora: 7,
  },
  {
    texto:
      "1000 estrutural 14x19x29 $2.500,\n150 metade 14 $240,\n150 canaleta 14 $510,\n\nTotal $ 5.380,",
    dias: 90,
    hora: 11,
  },
  { texto: "Consegue fazer $5.200,?", dias: 90, hora: 12 },
  { texto: "Elétrica Adolfo $12.000, sem instalação de luminárias", dias: 74, hora: 15 },

  // --- gastos: prestador, fornecedor, e um sem valor (vira sugestão)
  { texto: "pix de R$ 1.250,00 pro José Costa, mão de obra da semana", dias: 68, hora: 17 },
  { texto: "paguei 2.800 pro José Costa, alvenaria do subsolo", dias: 54, hora: 18 },
  { texto: "comprei 200 de tijolo na construção Bom Lar", dias: 47, hora: 9 },
  { texto: "adiantei 1.500 pro Valdir, gesso do teto", dias: 33, hora: 16 },
  { texto: "paguei 640 pra Elétrica Luz", dias: 26, hora: 14 },
  { texto: "paguei 350 pro serralheiro Nilson, portão da garagem", dias: 15, hora: 11 },
  // sem valor de propósito: abre a sugestão "quanto foi e pra quem?"
  { texto: "comprei 10 barras de vergalhão no Depósito Silva", dias: 19, hora: 10 },

  // --- decisões de acabamento
  {
    texto: "REJUNTES\n\nSuítes 1 e 2\nPiso e parede - cinza artico\nMaster\nPiso e parede - corda",
    dias: 40,
    hora: 20,
    extras: {
      title: "Rejuntes das suítes",
      value: "Suítes 1 e 2 cinza ártico · Master corda",
      environments: ["Quartos", "Banheiros"],
      environment: "Quartos",
    },
  },
  {
    texto: "Rejunte do banheiro da suíte master: cinza ártico",
    dias: 38,
    hora: 9,
    extras: {
      title: "Rejunte do banheiro master",
      value: "Cinza ártico",
      environments: ["Banheiros"],
      environment: "Banheiros",
    },
  },
  {
    texto: "Piso social: porcelanato bege 90x90",
    dias: 30,
    hora: 11,
    extras: { title: "Piso social", value: "Porcelanato bege 90x90", environments: ["Sala"], environment: "Sala" },
  },
  {
    texto: "Piso da casinha do cachorro: cimento queimado",
    dias: 22,
    hora: 15,
    extras: {
      title: "Piso da casinha do cachorro",
      value: "Cimento queimado",
      environments: ["Canil"],
      environment: "Canil",
    },
  },
  // decisão SEM título: abre a sugestão "fixar nas decisões da obra?"
  { texto: "Bancada da cozinha vai ser granito preto São Gabriel", dias: 12, hora: 19 },

  // --- comunicação
  {
    texto:
      "Bom dia Fred! Gostaria de ver com vc um problema que aconteceu aqui na obra e acredito estar relacionado ao seu produto que passamos. Fizemos um barrado com impermeabilizante de 80 cm no perímetro da casa como de costume, passamos o adesivo com chapisco e rebocamos, no entanto, somente no barrado o reboco apresentou trincas com desplacamento, vc consegue averiguar na empresa o que aconteceu.",
    dias: 21,
    hora: 8,
  },

  // --- pendências: lista repetida (abre "atualizar status"), prazos e tarefas
  { texto: "Guarda corpo\nMuro lateral\nCasa de máquina\nInfra ar\nPiscina\nContrapiso", dias: 17, hora: 7 },
  {
    texto: "Guarda corpo ok\nMuro lateral 1,40\nCasa de máquina ok\nInfra ar ok\nPiscina não\nContrapiso - rebocar",
    dias: 4,
    hora: 18,
  },
  { texto: "Mudar Tomada churrasqueira", dias: 9, hora: 13 },
  { texto: "Requadros portas", dias: 8, hora: 13 },
  {
    texto: "Tomada canto cozinha\nRejunte box master\nCaixinha aspirador\nRequadrar portas piscina\nAumentar paleta gourmet para 70 cm",
    dias: 6,
    hora: 16,
  },
  { texto: '2 cotovelo 3/4\n1 luva 3/4\n1 cola\n20 m conduíte 1"\n3 luva 1"', dias: 5, hora: 9 },
  { texto: "14 Degraus 26x100\n2 Patamar 100x100\nEspelho 7", dias: 3, hora: 10 },
  { texto: "20 sacos de cimento 28/09", dias: 2, hora: 9 },
  // prazo JÁ VENCIDO: o chip do card fica vermelho
  { texto: "comprar cimento e areia para o contrapiso", dias: 3, hora: 11, extras: { date: dataIso(-2) } },
  // prazo FUTURO: chip azul, e a lista sobe no topo
  {
    texto: "preciso levar as amostras de porcelanato pro cliente ver",
    dias: 1,
    hora: 8,
    extras: { date: dataIso(5) },
  },
  // data CITADA sem intenção: abre a sugestão "marcar como prazo disso?"
  { texto: "Medição com o Fred 25/09", dias: 1, hora: 12 },

  // --- registros que o app não classifica: abrem a sugestão "o que é isso?"
  { texto: "Portas Pormax", dias: 2, hora: 14 },
  { texto: "Mont blanc", dias: 0, hora: 8 },
];

/** Fotos do canteiro, por fase. Documentos pessoais do export ficam de fora. */
const FOTOS: { arquivo: string; fase: string; legenda?: string; dias: number }[] = [
  { arquivo: "IMG-20250124-WA0016.jpg", fase: "Fundação", legenda: "Estacas do subsolo", dias: 95 },
  { arquivo: "IMG-20250219-WA0012.jpg", fase: "Fundação", legenda: "Baldrame do bloco", dias: 88 },
  { arquivo: "IMG-20250424-WA0063.jpg", fase: "Estrutura", legenda: "Laje do térreo", dias: 72 },
  { arquivo: "IMG-20250617-WA0011.jpg", fase: "Estrutura", legenda: "Alvenaria do pavimento superior", dias: 58 },
  { arquivo: "IMG-20250926-WA0038.jpg", fase: "Estrutura", dias: 44 },
  { arquivo: "IMG-20251003-WA0022.jpg", fase: "Hidráulica", legenda: "Prumadas do banheiro", dias: 36 },
  { arquivo: "IMG-20251208-WA0121.jpg", fase: "Hidráulica", legenda: "Esgoto da área externa", dias: 28 },
  { arquivo: "IMG-20260610-WA0014.jpg", fase: "Acabamento", legenda: "Contrapiso da sala", dias: 10 },
];

/** Comprovante: some da Documentação e aparece no histórico da pessoa (D105). */
const COMPROVANTE = { arquivo: "IMG-20250130-WA0048.jpg", legenda: "comprovante do Valdir 1.500", dias: 33 };

/** Anexo de decisão: vira miniatura no card da aba Decisões. */
const ANEXO_DECISAO = {
  arquivo: "Banheiros.jpeg",
  texto: "Bancadas dos banheiros: quartzito branco nas suítes 1 e 2, negresco escovado na master",
  dias: 24,
};

const PDFS = [
  { arquivo: "Orçamento nº 335396.pdf", dias: 76 },
  { arquivo: "PoligranOrcamento_428_CESAR_MIRANDA.pdf", dias: 50 },
];

async function limparTudo(supabase: SupabaseClient, userId: string) {
  // As tabelas caem em cascata a partir de obras; o Storage não, então o
  // arquivo tem que ser apagado à mão ou o bucket vira lixão.
  const { data: obras } = await supabase.from("obras").select("id, name");
  for (const obra of obras ?? []) {
    await supabase.from("obras").delete().eq("id", obra.id);
    console.log(`  apagada: ${obra.name}`);
  }

  async function apagarPasta(prefixo: string) {
    const { data: itens } = await supabase.storage.from("anexos").list(prefixo, { limit: 1000 });
    const arquivos: string[] = [];

    for (const item of itens ?? []) {
      const caminho = `${prefixo}/${item.name}`;
      // Sem id = é "pasta" (prefixo), então desce um nível.
      if (item.id === null) await apagarPasta(caminho);
      else arquivos.push(caminho);
    }

    if (arquivos.length > 0) {
      await supabase.storage.from("anexos").remove(arquivos);
      console.log(`  ${arquivos.length} arquivo(s) removido(s) de ${prefixo}`);
    }
  }

  await apagarPasta(userId);
}

async function inserir(
  supabase: SupabaseClient,
  obraId: string,
  mensagem: Mensagem,
  faseId: string | null,
) {
  const automatico = classificar({
    texto: mensagem.texto,
    temFoto: false,
    temVideo: false,
    temPdf: false,
    temAudio: false,
  });
  const kind = mensagem.kind ?? automatico.kind;
  const base = kind === "E7_pagamento" ? extrairDadosPagamento(mensagem.texto) : {};

  const { data, error } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind,
      confidence: automatico.confidence,
      raw_text: mensagem.texto,
      phase_id: faseId,
      received_at: diasAtras(mensagem.dias, mensagem.hora ?? 9),
      payload: { ...base, ...(mensagem.extras ?? {}) },
    })
    .select("id, kind, payload")
    .single();

  if (error) throw error;
  return data;
}

async function subir(
  supabase: SupabaseClient,
  userId: string,
  obraId: string,
  pasta: string,
  arquivo: string,
  tipo: "foto" | "pdf",
  opcoes: { faseId?: string | null; legenda?: string | null; dias: number; texto?: string },
) {
  const conteudo = readFileSync(`${pasta}/${arquivo}`);
  const descricao = opcoes.texto ?? opcoes.legenda ?? arquivo;
  const { kind, confidence } = classificar({
    texto: descricao,
    temFoto: tipo === "foto",
    temVideo: false,
    temPdf: tipo === "pdf",
    temAudio: false,
  });

  const caminho = `${userId}/${obraId}/${Date.now()}-${chaveSegura(arquivo)}`;
  const { error } = await supabase.storage.from("anexos").upload(caminho, conteudo, {
    contentType: tipo === "foto" ? (arquivo.endsWith(".jpeg") ? "image/jpeg" : "image/jpeg") : "application/pdf",
  });

  if (error) {
    console.log(`  falhou ${arquivo}: ${error.message}`);
    return null;
  }

  const payload: Record<string, unknown> = { fileName: arquivo };
  if (kind === "E7_pagamento") Object.assign(payload, extrairDadosPagamento(descricao));

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind,
      confidence,
      phase_id: opcoes.faseId ?? null,
      caption: opcoes.legenda ?? null,
      raw_text: opcoes.texto ?? null,
      received_at: diasAtras(opcoes.dias, 12),
      payload,
    })
    .select("id")
    .single();

  if (evento) {
    await supabase.from("anexos").insert({ evento_id: evento.id, url: caminho, tipo });
  }

  return { caminho, eventoId: evento?.id, kind };
}

async function main() {
  carregarEnv();
  const [email, senha] = process.argv.slice(2);
  if (!email || !senha) throw new Error("uso: npx tsx scripts/semear-demo.ts <email> <senha>");

  const pasta = process.env.PASTA_ANEXOS;
  if (!pasta) throw new Error("falta PASTA_ANEXOS (pasta do export com as fotos e pdfs)");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) throw erroLogin;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("sem usuário depois do login");

  console.log(`logado como ${email}\n`);

  console.log("limpando a conta...");
  await limparTudo(supabase, user.id);

  // ------------------------------------------------------------ obra ativa
  console.log("\ncriando Casa Ecologie...");
  const { data: obra, error: erroObra } = await supabase
    .from("obras")
    .insert({
      name: "Casa Ecologie",
      client_name: "Frederico Imbroinise",
      location: "Itupeva, SP",
      details: "Sobrado com subsolo, piscina e área gourmet. 380 m² de área construída.",
      start_date: dataIso(-100),
      expected_end_date: dataIso(120),
    })
    .select("id")
    .single();
  if (erroObra || !obra) throw erroObra;

  const { data: fases } = await supabase
    .from("fases")
    .select("id, name")
    .eq("obra_id", obra.id)
    .order("order", { ascending: true });
  const fase = (nome: string) => (fases ?? []).find((f) => f.name === nome)?.id ?? null;

  await supabase
    .from("obras")
    .update({ current_phase_id: fase("Acabamento") })
    .eq("id", obra.id);

  // ------------------------------------------------------------ mensagens
  const contagem: Record<string, number> = {};
  for (const mensagem of MENSAGENS) {
    const evento = await inserir(supabase, obra.id, mensagem, fase(mensagem.fase ?? "") ?? null);
    contagem[evento.kind] = (contagem[evento.kind] ?? 0) + 1;
  }
  console.log(`  ${MENSAGENS.length} mensagens:`, contagem);

  // ------------------------------------------------------------- anexos
  for (const foto of FOTOS) {
    await subir(supabase, user.id, obra.id, pasta, foto.arquivo, "foto", {
      faseId: fase(foto.fase),
      legenda: foto.legenda ?? null,
      dias: foto.dias,
    });
  }
  console.log(`  ${FOTOS.length} fotos, distribuídas nas fases`);

  const comprovante = await subir(supabase, user.id, obra.id, pasta, COMPROVANTE.arquivo, "foto", {
    legenda: COMPROVANTE.legenda,
    dias: COMPROVANTE.dias,
  });
  console.log(`  comprovante (${comprovante?.kind}) — fica fora da Documentação`);

  const decisao = await subir(supabase, user.id, obra.id, pasta, ANEXO_DECISAO.arquivo, "foto", {
    texto: ANEXO_DECISAO.texto,
    legenda: null,
    dias: ANEXO_DECISAO.dias,
  });
  if (decisao?.eventoId) {
    await supabase
      .from("eventos")
      .update({
        kind: "E3_decisao",
        confidence: 1,
        payload: {
          fileName: ANEXO_DECISAO.arquivo,
          title: "Bancadas dos banheiros",
          value: "Quartzito branco nas suítes, negresco escovado na master",
          environments: ["Banheiros"],
          environment: "Banheiros",
        },
      })
      .eq("id", decisao.eventoId);
  }
  console.log("  decisão com miniatura (bancadas dos banheiros)");

  for (const pdf of PDFS) {
    await subir(supabase, user.id, obra.id, pasta, pdf.arquivo, "pdf", { dias: pdf.dias });
  }
  console.log(`  ${PDFS.length} orçamentos em pdf`);

  // Capa da obra: a foto da alvenaria, que lê bem em miniatura redonda.
  const capa = `${user.id}/obras/${obra.id}/capa-${Date.now()}-${chaveSegura("IMG-20250617-WA0011.jpg")}`;
  const { error: erroCapa } = await supabase.storage
    .from("anexos")
    .upload(capa, readFileSync(`${pasta}/IMG-20250617-WA0011.jpg`), { contentType: "image/jpeg" });
  if (!erroCapa) {
    await supabase.from("obras").update({ photo_url: capa }).eq("id", obra.id);
    console.log("  capa da obra definida");
  }

  // ---------------------------------------------------- checklist em curso
  const textoLista = "Guarda corpo\nMuro lateral\nCasa de máquina\nInfra ar\nPiscina\nContrapiso";
  const itens: ChecklistItem[] = itensParaChecklist(textoLista).map((item, indice) => ({
    ...item,
    status: indice < 3 ? ("ok" as const) : ("falta" as const),
  }));
  itens[4] = { ...itens[4], note: "esperando a impermeabilização" };
  itens[5] = { ...itens[5], date: dataIso(3) };

  await supabase.from("eventos").insert({
    obra_id: obra.id,
    kind: "E2_checklist",
    confidence: 1,
    received_at: diasAtras(17, 8),
    payload: {
      title: "Serviços do subsolo",
      sourceListDate: diasAtras(17, 7),
      items: itens,
      statusHistory: [],
    },
  });
  console.log(`  checklist "Serviços do subsolo" 3/${itens.length}, com item datado`);

  // -------------------------------------------------- favorecidos tipados
  const { data: favorecidos } = await supabase
    .from("favorecidos")
    .upsert(
      [
        { obra_id: obra.id, name: "José Costa", type: "prestador" },
        { obra_id: obra.id, name: "Valdir", type: "prestador" },
        { obra_id: obra.id, name: "Construção Bom Lar", type: "fornecedor" },
        { obra_id: obra.id, name: "Elétrica Luz", type: "fornecedor" },
        // "Depósito Silva" fica SEM tipo de propósito: alimenta a sugestão
        // "cadastrar como prestador ou fornecedor?" e o filtro "sem tipo".
      ],
      { onConflict: "obra_id,name" },
    )
    .select("id, name");

  const { data: pagamentos } = await supabase
    .from("eventos")
    .select("id, payload")
    .eq("obra_id", obra.id)
    .eq("kind", "E7_pagamento");

  let ligados = 0;
  for (const pagamento of pagamentos ?? []) {
    const nome = (pagamento.payload as { payeeName?: string }).payeeName;
    if (!nome) continue;
    const chave = normalizarFavorecido(nome);
    const cadastro = (favorecidos ?? []).find((f) => normalizarFavorecido(f.name) === chave);
    if (!cadastro) continue;

    await supabase
      .from("eventos")
      .update({
        favorecido_id: cadastro.id,
        payload: { ...(pagamento.payload as object), payeeType: cadastro.name.includes("Construção") || cadastro.name.includes("Elétrica") ? "fornecedor" : "prestador" },
      })
      .eq("id", pagamento.id);
    ligados += 1;
  }
  console.log(`  ${favorecidos?.length ?? 0} favorecidos tipados, ${ligados} pagamentos ligados`);

  // Gasto espalhado pelas fases, para a rosca do resumo ter fatias.
  const fasesDoGasto = ["Estrutura", "Estrutura", "Elétrica", "Acabamento", "Hidráulica", "Estrutura"];
  for (const [indice, pagamento] of (pagamentos ?? []).entries()) {
    await supabase
      .from("eventos")
      .update({ phase_id: fase(fasesDoGasto[indice % fasesDoGasto.length]) })
      .eq("id", pagamento.id);
  }
  console.log("  gastos distribuídos entre as fases (rosca do resumo)");

  // --------------------------------------------------------- obra arquivada
  const { data: arquivada } = await supabase
    .from("obras")
    .insert({
      name: "Reforma Jardins",
      client_name: "Marina Alves",
      location: "São Paulo, SP",
      status: "archived",
      start_date: dataIso(-420),
      expected_end_date: dataIso(-90),
    })
    .select("id")
    .single();

  if (arquivada) {
    await inserir(supabase, arquivada.id, { texto: "Rejunte da varanda: cinza platina", dias: 150 }, null);
    await inserir(supabase, arquivada.id, { texto: "paguei 800 pro Marcos, gesso da sala", dias: 140 }, null);
    await inserir(supabase, arquivada.id, { texto: "Entrega das chaves feita, obra encerrada", dias: 95 }, null);
    console.log("\nobra arquivada criada: Reforma Jardins");
  }

  console.log("\npronto.");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
