import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

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
  const { data: claims } = await supabase.auth.getClaims();
  const autenticado = Boolean(claims?.claims?.sub);

  const isPublicPath = PUBLIC_PATHS.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  );

  if (!autenticado && !isPublicPath) {
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
