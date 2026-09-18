import { createClient } from "@/lib/supabase/server";
import {
  ESQUEMA_ENTENDIMENTO,
  formatoDoMime,
  montarPrompt,
  type Entendimento,
} from "@/lib/entender";

/**
 * Mini-proxy do modelo de IA (07_ARQUITETURA_TECNICA §2): a chave vive só aqui,
 * em variável de ambiente, nunca no front — o repositório é público.
 *
 * Recebe um áudio (ou imagem) e devolve a transcrição junto com os registros
 * que dá para extrair dela. Quebrar em VÁRIOS registros é o ponto: num áudio
 * ela fala "gastei 350 com o serralheiro e preciso comprar rejunte até sexta",
 * que são duas coisas diferentes, em duas lentes diferentes.
 */

/**
 * Transcrever 20s de áudio levou ~30s no gemini-3.5-flash. A Vercel corta
 * função em 10s por padrão, então sem isto o recurso morria em produção —
 * e funcionava no local, que é o pior tipo de bug.
 */
export const maxDuration = 60;

const MODELO_BOM = process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
const MODELO_RAPIDO = "gemini-3.1-flash-lite";

/**
 * A ordem depende do que está entrando, porque o gargalo é diferente:
 *
 * ÁUDIO precisa de qualidade de transcrição. Medido no mesmo áudio: o
 * 3.5-flash entendeu "rejunte cinza ártico" e "argamassa AC3" e separou os 3
 * assuntos; o lite ouviu "argamassa adesiva extra" e classificou uma decisão
 * como gasto. Então o bom vem primeiro, e o lite é só rede de segurança.
 *
 * IMAGEM é o contrário. Na mesma foto de obra: o lite respondeu em 3,2s e o
 * bom em 43,2s, com a MESMA classificação — e foto é a captura mais comum,
 * então 40s e cota a mais por foto sairia caro sem ganho. O lite vem primeiro.
 *
 * PDF segue a imagem (D148): é texto impresso, sem o problema de ouvir jargão.
 */
function modelosPara(mime: string): string[] {
  return mime.startsWith("audio/")
    ? [MODELO_BOM, MODELO_RAPIDO]
    : [MODELO_RAPIDO, MODELO_BOM];
}
/**
 * O limite real não é tempo, é o corpo da requisição: a Vercel recusa acima de
 * ~4,5 MB. WAV mono 16 kHz são 32 KB/s e o base64 infla 4/3, então 90s de áudio
 * dão ~3,8 MB — é daí que vem o teto de duração na gravação, não de timeout.
 */
const LIMITE_BYTES = 4 * 1024 * 1024;

/**
 * Orçamento de tempo. Medido: uma chamada bem-sucedida levou 30s, e uma que
 * terminou em 503 levou 52s. Sem teto por tentativa, principal lento + reserva
 * estouraria o maxDuration e a função morreria sem responder nada — pior que
 * responder "não consegui".
 */
const TETO_TOTAL_MS = 50_000;
const TETO_POR_TENTATIVA_MS = 35_000;
const MINIMO_PARA_TENTAR_MS = 8_000;

const TIPOS_ACEITOS = /^(audio\/|image\/|application\/pdf$)/;

export async function POST(request: Request) {
  // A rota gasta cota paga: só para quem está autenticado de verdade. O
  // proxy já barra, mas isso aqui não pode depender de uma camada só.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return Response.json({ erro: "não autenticado" }, { status: 401 });
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) {
    return Response.json(
      {
        erro: "sem_chave",
        mensagem:
          "Falta configurar a GEMINI_API_KEY. Sem ela o app continua funcionando por texto e foto.",
      },
      { status: 503 },
    );
  }

  const form = await request.formData();
  const arquivo = form.get("arquivo");
  const hoje = String(form.get("hoje") ?? new Date().toISOString().slice(0, 10));
  const fases = String(form.get("fases") ?? "");
  const favorecidos = String(form.get("favorecidos") ?? "");
  const ambientes = String(form.get("ambientes") ?? "");

  if (!(arquivo instanceof File)) {
    return Response.json({ erro: "arquivo ausente" }, { status: 400 });
  }
  if (!TIPOS_ACEITOS.test(arquivo.type)) {
    return Response.json({ erro: `tipo não aceito: ${arquivo.type}` }, { status: 400 });
  }
  if (arquivo.size > LIMITE_BYTES) {
    return Response.json({ erro: "arquivo grande demais" }, { status: 413 });
  }

  const base64 = Buffer.from(await arquivo.arrayBuffer()).toString("base64");

  const corpo = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: arquivo.type, data: base64 } },
          {
            text: montarPrompt({
              formato: formatoDoMime(arquivo.type),
              hoje,
              fases,
              favorecidos,
              ambientes,
            }),
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ESQUEMA_ENTENDIMENTO,
      temperature: 0.1,
    },
  });

  // "high demand" é comum e passageiro — apareceu no primeiro teste real.
  // Perder a transcrição por um 503 seria bobo, então há um reserva; mas o
  // tempo é orçado, senão a função morre calada antes de responder.
  const comecou = Date.now();
  let resposta: Response | null = null;

  for (const modelo of modelosPara(arquivo.type)) {
    const restante = TETO_TOTAL_MS - (Date.now() - comecou);
    if (restante < MINIMO_PARA_TENTAR_MS) {
      console.error("[entender] sem tempo para tentar", modelo);
      break;
    }

    try {
      resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": chave },
          body: corpo,
          signal: AbortSignal.timeout(Math.min(restante, TETO_POR_TENTATIVA_MS)),
        },
      );
    } catch (erro) {
      console.error(`[entender] ${modelo} não respondeu no tempo:`, (erro as Error).name);
      resposta = null;
      continue;
    }

    if (resposta.ok) break;

    const detalhe = await resposta.clone().text();
    console.error(`[entender] ${modelo} falhou:`, resposta.status, detalhe.slice(0, 400));

    // 4xx é problema do nosso pedido: trocar de modelo não resolve.
    if (resposta.status < 500) break;
  }

  if (!resposta || !resposta.ok) {
    return Response.json(
      { erro: "modelo_falhou", status: resposta?.status ?? 0 },
      { status: 502 },
    );
  }

  const dados = await resposta.json();
  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (typeof texto !== "string") {
    console.error("[entender] resposta sem texto:", JSON.stringify(dados).slice(0, 500));
    return Response.json({ erro: "resposta_vazia" }, { status: 502 });
  }

  try {
    const entendimento = JSON.parse(texto) as Entendimento;
    return Response.json(entendimento);
  } catch {
    console.error("[entender] json inválido:", texto.slice(0, 500));
    return Response.json({ erro: "json_invalido" }, { status: 502 });
  }
}
