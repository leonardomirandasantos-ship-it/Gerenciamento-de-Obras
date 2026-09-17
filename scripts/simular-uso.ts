/**
 * Simulação de uso com mensagens reais (amostra do export de WhatsApp da obra
 * analisado em discovery). Usa a MESMA lógica do app para classificar, então
 * serve como checagem de comportamento ponta a ponta.
 *
 * Uso:
 *   npx tsx scripts/simular-uso.ts <email> <senha>
 *
 * Variáveis de ambiente esperadas (lidas do .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classificar } from "../src/lib/classify";
import { extrairDadosPagamento } from "../src/lib/pagamento";
import { detectarSugestoes } from "../src/lib/suggestions";
import type { Evento, SugestaoRegistro } from "../src/lib/types";

function carregarEnv() {
  const conteudo = readFileSync(".env.local", "utf8");
  for (const linha of conteudo.split("\n")) {
    const [chave, ...resto] = linha.split("=");
    if (chave && resto.length > 0)
      process.env[chave.trim()] = resto.join("=").trim();
  }
}

// Amostra representativa do uso real (materiais, checklist vivo, cotação,
// lembrete com data, medidas em fração, pagamento, reclamação formal).
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
  "comprar 10 sacos de cimento até 20/09",
  "Tomada canto cozinha\nRejunte box master\nCaixinha aspirador\nRequadrar portas piscina\nAumentar paleta gourmet para 70 cm",
  "Rejunte do banheiro da suíte master: cinza ártico",
  "14 Degraus 26x100\n2 Patamar 100x100\nEspelho 7",
  "Portas Pormax",
  "Mont blanc",
  "Bom dia Fred! Gostaria de ver com vc um problema que aconteceu aqui na obra e acredito estar relacionado ao seu produto que passamos. Fizemos um barrado com impermeabilizante de 80 cm no perímetro da casa como de costume, passamos o adesivo com chapisco e rebocamos, no entanto, somente no barrado o reboco apresentou trincas com desplacamento, vc consegue averiguar na empresa o que aconteceu.",
];

/** Anexos reais (fotos de obra e um orçamento em PDF) para testar o motor. */
const ANEXOS: { caminho: string; tipo: "foto" | "pdf"; legenda?: string }[] = [
  {
    caminho: process.env.PASTA_ANEXOS + "/IMG-20250219-WA0012.jpg",
    tipo: "foto",
  },
  {
    caminho: process.env.PASTA_ANEXOS + "/IMG-20250926-WA0038.jpg",
    tipo: "foto",
  },
  {
    caminho: process.env.PASTA_ANEXOS + "/IMG-20251208-WA0121.jpg",
    tipo: "foto",
  },
  {
    caminho: process.env.PASTA_ANEXOS + "/IMG-20260610-WA0014.jpg",
    tipo: "foto",
  },
  {
    caminho:
      process.env.PASTA_ANEXOS + "/PoligranOrcamento_428_CESAR_MIRANDA.pdf",
    tipo: "pdf",
  },
];

async function main() {
  carregarEnv();
  const [email, senha] = process.argv.slice(2);
  if (!email || !senha)
    throw new Error("uso: npx tsx scripts/simular-uso.ts <email> <senha>");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });
  if (erroLogin) throw erroLogin;

  const { data: obra, error: erroObra } = await supabase
    .from("obras")
    .insert({ name: "Obra Ecologie (simulação)", location: "São Paulo, SP" })
    .select("id")
    .single();
  if (erroObra || !obra) throw erroObra;

  console.log(`obra criada: ${obra.id}\n`);

  for (const texto of MENSAGENS) {
    const { kind, confidence } = classificar({
      texto,
      temFoto: false,
      temVideo: false,
      temPdf: false,
      temAudio: false,
    });
    const payload = kind === "E7_pagamento" ? extrairDadosPagamento(texto) : {};

    const { error } = await supabase
      .from("eventos")
      .insert({ obra_id: obra.id, kind, confidence, raw_text: texto, payload });
    if (error) throw error;

    const resumo = texto.replace(/\n/g, " | ").slice(0, 58);
    console.log(
      `${kind.padEnd(17)} ${String(confidence).padEnd(5)} ${JSON.stringify(payload).padEnd(46)} ${resumo}`,
    );
  }

  // Anexos: sobem para o Storage e viram evento com anexo, como no app.
  if (process.env.PASTA_ANEXOS) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: fases } = await supabase
      .from("fases")
      .select("id, name")
      .eq("obra_id", obra.id)
      .order("order", { ascending: true });
    const faseEstrutura = (fases ?? []).find(
      (fase) => fase.name === "Estrutura",
    );

    for (const anexo of ANEXOS) {
      const nome = basename(anexo.caminho);
      const conteudo = readFileSync(anexo.caminho);
      const { kind, confidence } = classificar({
        texto: nome,
        temFoto: anexo.tipo === "foto",
        temVideo: false,
        temPdf: anexo.tipo === "pdf",
        temAudio: false,
      });

      const path = `${user!.id}/${obra.id}/${Date.now()}-${nome}`;
      const { error: erroUpload } = await supabase.storage
        .from("anexos")
        .upload(path, conteudo, {
          contentType: anexo.tipo === "foto" ? "image/jpeg" : "application/pdf",
        });
      if (erroUpload) {
        console.log(`falha no upload de ${nome}: ${erroUpload.message}`);
        continue;
      }

      const { data: evento } = await supabase
        .from("eventos")
        .insert({
          obra_id: obra.id,
          kind,
          confidence,
          phase_id: anexo.tipo === "foto" ? (faseEstrutura?.id ?? null) : null,
          caption: anexo.legenda ?? null,
          payload: { fileName: nome },
        })
        .select("id")
        .single();

      if (evento) {
        await supabase
          .from("anexos")
          .insert({ evento_id: evento.id, url: path, tipo: anexo.tipo });
      }

      console.log(
        `${kind.padEnd(17)} ${String(confidence).padEnd(5)} anexo: ${nome}`,
      );
    }
  }

  const { data: eventos } = await supabase
    .from("eventos")
    .select("*")
    .eq("obra_id", obra.id)
    .order("received_at", { ascending: true });

  const sugestoes = detectarSugestoes(
    (eventos ?? []) as Evento[],
    [] as SugestaoRegistro[],
  );

  console.log(`\nsugestões detectadas: ${sugestoes.length}`);
  for (const sugestao of sugestoes) {
    console.log(`  [${sugestao.caso}] ${sugestao.proposta}`);
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
