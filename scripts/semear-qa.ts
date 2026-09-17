/**
 * Semeia uma conta de QA já populada, para testar o app sem ter que digitar
 * tudo à mão. Usa a MESMA lógica do app (classificador, extração de pagamento),
 * então o que aparece na conta é o que o app produziria de verdade.
 *
 * Uso:
 *   PASTA_ANEXOS=/caminho/do/export npx tsx scripts/semear-qa.ts <email> <senha>
 *
 * Variáveis lidas do .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Nenhuma credencial fica no repositório: e-mail e senha vêm por argumento.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { classificar } from "../src/lib/classify";
import { extrairDadosPagamento } from "../src/lib/pagamento";
import { itensParaChecklist } from "../src/lib/checklist";
import { chaveSegura } from "../src/lib/arquivos";

function carregarEnv() {
  const conteudo = readFileSync(".env.local", "utf8");
  for (const linha of conteudo.split("\n")) {
    const [chave, ...resto] = linha.split("=");
    if (chave && resto.length > 0) process.env[chave.trim()] = resto.join("=").trim();
  }
}

/** Amostra real do export de WhatsApp analisado em discovery. */
const MENSAGENS: string[] = [
  "Concreto muros e muros\n12 m³",
  "110 mm tubo ocre",
  "600 estrutural 19x19x29\n200 canaleta 19\n80 estrutural 19x19x14\n1200 estrutural 14x19x29\n150 canaletas 14",
  "1000 estrutural 14x19x29 $2.500,\n150 metade 14 $240,\n150 canaleta 14 $510,\n\nTotal $ 5.380,",
  "Consegue fazer $5.200,?",
  "Lembretes\n\n* Falar com Daniel sobre drenos\n* Cotação de concreto previsão 11/04",
  '2 cotovelo 3/4\n1 luva 3/4\n1 cola\n20 m conduíte 1"\n3 luva 1"',
  "Guarda corpo\nMuro lateral\nCasa de máquina\nInfra ar\nPiscina\nContrapiso",
  "Guarda corpo ok\nMuro lateral 1,40\nCasa de máquina ok\nInfra ar ok\nPiscina não\nContrapiso - rebocar",
  "Elétrica Adolfo $12.000, sem instalação de luminárias",
  "REJUNTES\n\nSuítes 1 e 2\nPiso e parede - cinza artico\nMaster\nPiso e parede - corda",
  "Mudar Tomada churrasqueira",
  "Requadros portas",
  "paguei 200 para armando pintor",
  "pix de R$ 1.250,00 pro José Costa, mão de obra da semana",
  "comprei 200 de tijolo na construção Bom Lar",
  "comprei 10 barras de vergalhão no Depósito Silva",
  "comprar 10 sacos de cimento até 20/09",
  "Tomada canto cozinha\nRejunte box master\nCaixinha aspirador\nRequadrar portas piscina\nAumentar paleta gourmet para 70 cm",
  "Rejunte do banheiro da suíte master: cinza ártico",
  "14 Degraus 26x100\n2 Patamar 100x100\nEspelho 7",
  "Portas Pormax",
  "Bom dia Fred! Gostaria de ver com vc um problema que aconteceu aqui na obra e acredito estar relacionado ao seu produto que passamos. Fizemos um barrado com impermeabilizante de 80 cm no perímetro da casa como de costume, passamos o adesivo com chapisco e rebocamos, no entanto, somente no barrado o reboco apresentou trincas com desplacamento, vc consegue averiguar na empresa o que aconteceu.",
];

/**
 * Só material de obra: fotos do canteiro e um orçamento. Os documentos
 * pessoais do export (matrícula, boleto, CPF) ficam de fora de propósito.
 */
const FOTOS = [
  "IMG-20250219-WA0012.jpg",
  "IMG-20250926-WA0038.jpg",
  "IMG-20251208-WA0121.jpg",
  "IMG-20260610-WA0014.jpg",
  "IMG-20250424-WA0063.jpg",
  "IMG-20250617-WA0011.jpg",
];
const PDFS = ["Orçamento nº 335396.pdf"];

async function inserirMensagem(
  supabase: SupabaseClient,
  obraId: string,
  texto: string,
  extras: Record<string, unknown> = {},
) {
  const { kind, confidence } = classificar({
    texto,
    temFoto: false,
    temVideo: false,
    temPdf: false,
    temAudio: false,
  });
  const payload = kind === "E7_pagamento" ? extrairDadosPagamento(texto) : {};

  const { data, error } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind,
      confidence,
      raw_text: texto,
      payload: { ...payload, ...extras },
    })
    .select("id, kind, payload")
    .single();

  if (error) throw error;
  return data;
}

async function subirArquivo(
  supabase: SupabaseClient,
  userId: string,
  obraId: string,
  caminho: string,
  tipo: "foto" | "pdf",
  faseId: string | null,
  legenda: string | null,
) {
  const nome = basename(caminho);
  const conteudo = readFileSync(caminho);
  const { kind, confidence } = classificar({
    texto: nome,
    temFoto: tipo === "foto",
    temVideo: false,
    temPdf: tipo === "pdf",
    temAudio: false,
  });

  const path = `${userId}/${obraId}/${Date.now()}-${chaveSegura(nome)}`;
  const { error: erroUpload } = await supabase.storage
    .from("anexos")
    .upload(path, conteudo, {
      contentType: tipo === "foto" ? "image/jpeg" : "application/pdf",
    });

  if (erroUpload) {
    console.log(`  falha no upload de ${nome}: ${erroUpload.message}`);
    return null;
  }

  const { data: evento } = await supabase
    .from("eventos")
    .insert({
      obra_id: obraId,
      kind,
      confidence,
      phase_id: faseId,
      caption: legenda,
      payload: { fileName: nome },
    })
    .select("id")
    .single();

  if (evento) {
    await supabase.from("anexos").insert({ evento_id: evento.id, url: path, tipo });
  }

  return { path, eventoId: evento?.id };
}

async function main() {
  carregarEnv();
  const [email, senha] = process.argv.slice(2);
  if (!email || !senha) {
    throw new Error("uso: npx tsx scripts/semear-qa.ts <email> <senha>");
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (erroLogin) throw erroLogin;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("sem usuário depois do login");

  console.log(`logado como ${email}\n`);

  // ---------------------------------------------------------------- obra 1
  const { data: obra, error: erroObra } = await supabase
    .from("obras")
    .insert({
      name: "Casa Ecologie",
      client_name: "Frederico",
      location: "São Paulo, SP",
      details: "Sobrado com subsolo, piscina e área gourmet.",
    })
    .select("id")
    .single();
  if (erroObra || !obra) throw erroObra;

  console.log(`obra ativa criada: ${obra.id}`);

  const { data: fases } = await supabase
    .from("fases")
    .select("id, name")
    .eq("obra_id", obra.id)
    .order("order", { ascending: true });

  const fase = (nome: string) => (fases ?? []).find((f) => f.name === nome)?.id ?? null;

  // Fase atual: o que for capturado depois herda ela (D69).
  await supabase
    .from("obras")
    .update({ current_phase_id: fase("Acabamento") })
    .eq("id", obra.id);

  for (const texto of MENSAGENS) {
    const evento = await inserirMensagem(supabase, obra.id, texto);
    console.log(`  ${evento.kind.padEnd(17)} ${texto.replace(/\n/g, " | ").slice(0, 52)}`);
  }

  // Decisão com ambiente inventado, para a barra de filtro mostrar que cresce.
  await inserirMensagem(supabase, obra.id, "Piso da casinha do cachorro: cimento queimado", {
    title: "Piso da casinha do cachorro",
    value: "Cimento queimado",
    environments: ["Canil"],
    environment: "Canil",
  });
  console.log("  decisão com ambiente criado à mão: Canil");

  // Um checklist já em andamento, para a aba de pendências não nascer vazia.
  const textoLista = "Guarda corpo\nMuro lateral\nCasa de máquina\nInfra ar\nPiscina\nContrapiso";
  const itens = itensParaChecklist(textoLista).map((item, indice) => ({
    ...item,
    status: indice < 3 ? ("ok" as const) : ("falta" as const),
  }));
  await supabase.from("eventos").insert({
    obra_id: obra.id,
    kind: "E2_checklist",
    confidence: 1,
    payload: {
      title: "Lista de serviços",
      sourceListDate: new Date().toISOString(),
      items: itens,
      statusHistory: [],
    },
  });
  console.log(`  checklist 3/${itens.length} em andamento`);

  // Pagamentos com tipos diferentes, para o filtro prestador/fornecedor ter
  // o que separar — e um sem tipo, que é o caso mais comum no começo.
  const { data: favorecidos } = await supabase
    .from("favorecidos")
    .upsert(
      [
        { obra_id: obra.id, name: "José Costa", type: "prestador" },
        { obra_id: obra.id, name: "Construção Bom Lar", type: "fornecedor" },
      ],
      { onConflict: "obra_id,name" },
    )
    .select("id, name");

  for (const favorecido of favorecidos ?? []) {
    await supabase
      .from("eventos")
      .update({ favorecido_id: favorecido.id })
      .eq("obra_id", obra.id)
      .eq("kind", "E7_pagamento")
      .like("payload->>payeeName", favorecido.name);
  }
  console.log("  favorecidos tipados: José Costa (prestador), Construção Bom Lar (fornecedor)");

  // ------------------------------------------------------------- anexos
  const pasta = process.env.PASTA_ANEXOS;
  if (pasta) {
    const capa = await subirArquivo(
      supabase,
      user.id,
      obra.id,
      `${pasta}/${FOTOS[0]}`,
      "foto",
      fase("Fundação"),
      "Fundação do bloco",
    );

    for (const [indice, nome] of FOTOS.slice(1).entries()) {
      const faseDaFoto = indice % 2 === 0 ? fase("Estrutura") : fase("Hidráulica");
      await subirArquivo(supabase, user.id, obra.id, `${pasta}/${nome}`, "foto", faseDaFoto, null);
    }

    for (const nome of PDFS) {
      await subirArquivo(supabase, user.id, obra.id, `${pasta}/${nome}`, "pdf", null, null);
    }

    // Capa da obra: mesma pasta do usuário, como o app grava (D100).
    if (capa) {
      const caminhoCapa = `${user.id}/obras/${obra.id}/capa-${Date.now()}-${chaveSegura(FOTOS[0])}`;
      const { error } = await supabase.storage
        .from("anexos")
        .upload(caminhoCapa, readFileSync(`${pasta}/${FOTOS[0]}`), {
          contentType: "image/jpeg",
        });
      if (!error) {
        await supabase.from("obras").update({ photo_url: caminhoCapa }).eq("id", obra.id);
        console.log("  capa da obra definida");
      }
    }

    console.log(`  ${FOTOS.length} fotos e ${PDFS.length} pdf enviados`);
  } else {
    console.log("  (sem PASTA_ANEXOS: conta fica sem fotos)");
  }

  // ---------------------------------------------------------------- obra 2
  const { data: arquivada } = await supabase
    .from("obras")
    .insert({
      name: "Reforma Jardins",
      location: "São Paulo, SP",
      status: "archived",
    })
    .select("id")
    .single();

  if (arquivada) {
    await inserirMensagem(supabase, arquivada.id, "Rejunte da varanda: cinza platina");
    await inserirMensagem(supabase, arquivada.id, "paguei 800 para o Marcos gesseiro");
    console.log(`\nobra arquivada criada: ${arquivada.id}`);
  }

  console.log("\npronto.");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
