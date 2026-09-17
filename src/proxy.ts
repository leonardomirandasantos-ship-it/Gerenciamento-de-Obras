import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

/** Sessão válida? Separado para poder ser tentado duas vezes (D141). */
async function temSessao(supabase: ReturnType<typeof createServerClient>): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getClaims();
    return Boolean(data?.claims?.sub);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getClaims() em vez de getUser(): valida a assinatura do JWT localmente
  // (JWKS em cache) em vez de perguntar ao servidor de Auth a cada navegação.
  // Medido nesta obra: getUser custava 145–420ms POR request — era a maior
  // fatia do "demora pra trocar de aba"; getClaims responde em 1–6ms.
  // A garantia de acesso ao dado continua sendo a RLS, não este gate.
  //
  // Uma tentativa só não basta (D141): quando o token de acesso já expirou,
  // o getClaims precisa renovar pela rede, e uma falha de rede no primeiro
  // acesso — típica de PWA reaberto no 4G do canteiro — derrubaria a sessão.
  // Uma segunda chance não custa nada no caminho feliz e evita deslogar por
  // causa de um pacote perdido.
  let autenticado = await temSessao(supabase);
  if (!autenticado) {
    autenticado = await temSessao(supabase);
  }

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!autenticado && !isPublicPath) {
    // Diagnóstico: o cookie estar presente e ainda assim não validar aponta
    // para renovação/rede; o cookie ter desaparecido aponta para o
    // armazenamento do navegador. Sem isso, "desloga sozinho" é indistinguível.
    const temCookieDeAuth = request.cookies
      .getAll()
      .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));

    console.warn(
      `[auth] barrado em ${request.nextUrl.pathname} · cookie de sessão presente: ${temCookieDeAuth}`,
    );

    // Rota de API responde 401 em JSON em vez de redirecionar: o fetch do
    // front seguiria o 307, receberia HTML do /login e quebraria no .json().
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ erro: "não autenticado" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Fora da autenticação: estáticos, os assets de marca/tokens e o manifest
    // — o sistema operacional busca o manifest antes de existir sessão, e sem
    // isso o "adicionar à tela de início" não pega o ícone.
    "/((?!_next/static|_next/image|assets/|icon.png|manifest.webmanifest|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|ico|woff2?)$).*)",
  ],
};
