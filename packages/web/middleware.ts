import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que exigem login (qualquer plano)
const AUTH_REQUIRED = [
  "/risco/",        // perfis individuais (listing /risco é livre, truncado)
  "/frentes/",      // detalhe de frente (listing /frentes é livre)
  "/ranking",
  "/patrimonios",
  "/amendments",
  "/expenses",
  "/funding",
  "/senate-expenses",
  "/proposicoes",
  "/voting",
  "/sancionados",
  "/rp9",
  "/conta",
  "/ativar",
];

function needsAuth(pathname: string): boolean {
  return AUTH_REQUIRED.some((prefix) => {
    // /risco/ e /frentes/ → só protege sub-rotas (não o próprio listing)
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix) && pathname.length > prefix.length;
    }
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!needsAuth(pathname)) return NextResponse.next();

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    auth: { persistSession: true },
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|api/).*)",
  ],
};
