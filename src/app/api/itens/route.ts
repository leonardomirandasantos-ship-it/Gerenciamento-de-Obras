import { createClient } from "@/lib/supabase/server";
import { ESQUEMA_DE_ITENS, montarPromptDeItens } from "@/lib/itens";

/**
 * Segunda opinião sobre uma linha de lista (D164). A quebra em itens é local e
 * instantânea; esta rota só entra quando a regra local fica na dúvida, roda por
 * baixo dos panos e, se não responder, nada acontece — a lista continua como
 * estava. Por isso: modelo rápido, um tiro só, teto curto.
 */
export const maxDuration = 20;

const MODELO = "gemini-3.1-flash-lite";
const TETO_MS = 12_000;
const LIMITE_DE_TEXTO = 400;

export async function POST(request: Request) {
  // Gasta cota paga: só para quem está autenticado de verdade.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return Response.json({ erro: "não autenticado" }, { status: 401 });
  }

  const chave = process.env.GEMINI_API_KEY;
  if (!chave) return Response.json({ erro: "sem_chave" }, { status: 503 });

  const { texto } = (await request.json()) as { texto?: string };
  if (typeof texto !== "string" || !texto.trim() || texto.length > LIMITE_DE_TEXTO) {
    return Response.json({ erro: "texto inválido" }, { status: 400 });
  }

  let resposta: Response;
  try {
    resposta = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify({
          contents: [{ parts: [{ text: montarPromptDeItens(texto.trim()) }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: ESQUEMA_DE_ITENS,
            temperature: 0,
          },
        }),
        signal: AbortSignal.timeout(TETO_MS),
      },
    );
  } catch (erro) {
    console.error("[itens] modelo não respondeu:", (erro as Error).name);
    return Response.json({ erro: "sem_resposta" }, { status: 502 });
  }

  if (!resposta.ok) {
    console.error("[itens] modelo falhou:", resposta.status);
    return Response.json({ erro: "modelo_falhou" }, { status: 502 });
  }

  const dados = await resposta.json();
  const conteudo = dados?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof conteudo !== "string") {
    return Response.json({ erro: "resposta_vazia" }, { status: 502 });
  }

  try {
    const { itens } = JSON.parse(conteudo) as { itens?: unknown };
    const limpos = Array.isArray(itens)
      ? itens
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
          .slice(0, 12)
      : [];
    return Response.json({ itens: limpos });
  } catch {
    console.error("[itens] json inválido:", conteudo.slice(0, 300));
    return Response.json({ erro: "json_invalido" }, { status: 502 });
  }
}
