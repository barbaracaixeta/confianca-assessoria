import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Renova a sessão do Supabase e bloqueia cedo quem não está autenticado nas áreas
 * privadas. Nas rotas do painel também valida, no servidor:
 *   1. conta ativa;
 *   2. obrigatoriedade de trocar a senha temporária (primeiro acesso).
 * A autorização por papel/permissão é verificada de novo em cada página e Server
 * Action, perto dos dados — o proxy é a primeira barreira.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [h, v] of Object.entries(headers ?? {})) response.headers.set(h, v);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub as string | undefined;
  const isAuthenticated = Boolean(sub);
  const { pathname } = request.nextUrl;
  const isPrivate = pathname.startsWith("/minha-conta") || pathname.startsWith("/admin");

  /** Redireciona preservando cookies de sessão eventualmente renovados. */
  function redirectTo(path: string) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = path;
    redirectUrl.search = "";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    return redirectResponse;
  }

  if (isPrivate && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname)}`;
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of response.cookies.getAll()) redirectResponse.cookies.set(cookie);
    return redirectResponse;
  }

  if (isPrivate && isAuthenticated) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, must_change_password")
      .eq("id", sub)
      .maybeSingle();

    // Conta desativada: invalida a sessão e devolve para o login.
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      return redirectTo("/login");
    }

    // Primeiro acesso: só a troca de senha é permitida no painel.
    if (pathname.startsWith("/admin") && pathname !== "/admin/alterar-senha" && profile?.must_change_password) {
      return redirectTo("/admin/alterar-senha");
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|webp|ico)$).*)"],
};