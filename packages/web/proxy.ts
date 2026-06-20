import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rotas que exigem login (qualquer plano)
const AUTH_REQUIRED = [
  "/parlamentares/",  // perfis individuais (listing /parlamentares é livre)
  "/risco",           // listing + perfis individuais
  "/frentes",         // listing + detalhes
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
  "/voos",
  "/dossie/",         // dossiês individuais
  "/fundacoes/",      // fundações individuais
  "/mercado-de-capitais/socios-politicos",
  "/mercado-de-capitais/fips-monopolio",
  "/convenios/fornecedores",
  "/alesc",
  "/viagens",
  "/siafi",
  "/almg",
  "/alesp",
  "/alerj",
  "/alepe",
  "/cldf",
  "/radar",
  "/conta",
  "/ativar",
];

// Rotas que exigem plano pago (individual ou institucional não-expirado).
// Subconjunto de AUTH_REQUIRED — quem cair aqui passa primeiro pela verificação
// de sessão e depois pela de plano.
const PAID_REQUIRED = [
  "/ranking",
  "/agenda",
  "/expenses",
  "/senate-expenses",
  "/amendments",
  "/funding",
  "/proposicoes",
  "/risco",
  "/mercado-de-capitais/galo-forte",
  "/mercado-de-capitais/emissores-sancionados",
  "/sancionados",
];

// Exceções: sub-rotas que casariam com AUTH_REQUIRED mas devem ficar públicas.
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

function needsPaid(pathname: string): boolean {
  if (AUTH_BYPASS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }
  return PAID_REQUIRED.some((prefix) => {
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix) && pathname.length > prefix.length;
    }
    return pathname === prefix || pathname.startsWith(prefix + "/");
  });
}

// ── Host-based routing pra nós estaduais ────────────────────────────────
// Cada subdomínio mapeia pra um segmento da App Router. Federal
// (www.thebrinsider.com) é o default — não entra aqui, não reescreve.


const HOST_SEGMENT: Record<string, string> = {
  // novos domínios (thebrinsider.com)
  "almg.thebrinsider.com": "/almg",
  "alesp.thebrinsider.com": "/alesp",
  "alerj.thebrinsider.com": "/alerj",
  "alepe.thebrinsider.com": "/alepe",
  "cldf.thebrinsider.com": "/cldf",
  "radar.thebrinsider.com": "/radar",
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

  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Helper: verifica sessão e retorna o user (ou null).
  async function getSessionUser() {
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
    return { user, supabase, response };
  }

  // Helper: exige sessão ativa; redireciona para /login se não autenticado.
  async function requireAuth(redirectPath: string): Promise<NextResponse | null> {
    const { user } = await getSessionUser();
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", redirectPath);
      return NextResponse.redirect(loginUrl);
    }
    return null;
  }

  // Helper: exige plano pago ativo; redireciona para /planos se não tiver.
  // Pressupõe que a sessão já foi verificada (user != null).
  async function requirePaid(redirectPath: string): Promise<NextResponse | null> {
    const { user, supabase } = await getSessionUser();
    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("next", redirectPath);
      return NextResponse.redirect(loginUrl);
    }
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("plano, plano_valido_ate")
      .eq("id", user.id)
      .single();
    const paid = profile &&
      profile.plano !== "free" &&
      profile.plano != null &&
      (!profile.plano_valido_ate || new Date(profile.plano_valido_ate) > new Date());
    if (!paid) {
      const planosUrl = request.nextUrl.clone();
      planosUrl.pathname = "/planos";
      planosUrl.searchParams.set("next", redirectPath);
      return NextResponse.redirect(planosUrl);
    }
    return null;
  }

  // Subdomínio estadual → exige login, depois rewrite pra /<segmento>/<path>.
  if (segment) {
    const authRedirect = await requireAuth(request.headers.get("host") + pathname);
    if (authRedirect) return authRedirect;

    if (!pathname.startsWith(segment)) {
      const rewriteUrl = request.nextUrl.clone();
      rewriteUrl.pathname = pathname === "/" ? segment : `${segment}${pathname}`;
      return NextResponse.rewrite(rewriteUrl);
    }
    return NextResponse.next();
  }

  // Rotas pagas têm precedência: verificam autenticação + plano em uma passagem.
  if (needsPaid(pathname)) {
    const paidRedirect = await requirePaid(pathname);
    if (paidRedirect) return paidRedirect;
    return NextResponse.next({ request });
  }

  if (!needsAuth(pathname)) return NextResponse.next();

  const authRedirect = await requireAuth(pathname);
  if (authRedirect) return authRedirect;

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|api/).*)",
  ],
};
