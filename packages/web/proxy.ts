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

// Exceções: sub-rotas que casariam com AUTH_REQUIRED mas devem ficar públicas
// (páginas institucionais, metodologia, etc.).
const AUTH_BYPASS = [
  "/risco/metodologia",
];

function needsAuth(pathname: string): boolean {
  if (AUTH_BYPASS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }
  return AUTH_REQUIRED.some((prefix) => {
    // /risco/ e /frentes/ → só protege sub-rotas (não o próprio listing)
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix) && pathname.length > prefix.length;
    }
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

// ── Host-based routing pra nós estaduais ────────────────────────────────
// Cada subdomínio mapeia pra um segmento da App Router. Federal
// (www.thebrinsider.com) é o default — não entra aqui, não reescreve.
// Os hosts transparenciafederal.{com,org} permanecem aqui durante a
// migração de DNS — assim que o redirect 301 estiver no provedor, podem sair.
const HOST_SEGMENT: Record<string, string> = {
  // novos domínios (thebrinsider.com)
  "almg.thebrinsider.com": "/almg",
  "alesp.thebrinsider.com": "/alesp",
  "alerj.thebrinsider.com": "/alerj",
  "alepe.thebrinsider.com": "/alepe",
  "cldf.thebrinsider.com": "/cldf",
  "radar.thebrinsider.com": "/radar",
  // legado (manter durante migração de DNS)
  "almg.transparenciafederal.org": "/almg",
  "almg.transparenciafederal.com": "/almg",
  "alesp.transparenciafederal.org": "/alesp",
  "alesp.transparenciafederal.com": "/alesp",
  "alerj.transparenciafederal.org": "/alerj",
  "alerj.transparenciafederal.com": "/alerj",
  "radar.transparenciafederal.com": "/radar",
  "radar.transparenciafederal.org": "/radar",
  // dev local
  "almg.localhost:3000": "/almg",
  "alesp.localhost:3000": "/alesp",
  "alerj.localhost:3000": "/alerj",
  "alepe.localhost:3000": "/alepe",
  "cldf.localhost:3000": "/cldf",
  "radar.localhost:3000": "/radar",
};

function segmentForHost(host: string | null): string | null {
  if (!host) return null;
  return HOST_SEGMENT[host.toLowerCase()] ?? null;
}

// Next.js 16 renomeou a convenção `middleware` pra `proxy` — mesma semântica:
// roda em todas as requests (filtradas por `config.matcher`) antes do
// route handler. Anteriormente em packages/web/middleware.ts.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segment = segmentForHost(request.headers.get("host"));

  // Subdomínio estadual → rewrite pra /<segmento>/<path>. Mantém a URL na barra.
  if (segment) {
    if (!pathname.startsWith(segment)) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = pathname === "/" ? segment : `${segment}${pathname}`;
      return NextResponse.rewrite(rewriteUrl);
    }
    // Já está no segmento certo — nós estaduais são públicos por enquanto.
    return NextResponse.next();
  }

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
