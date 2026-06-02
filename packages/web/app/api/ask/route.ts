/**
 * Proxy server-side pra Supabase Edge Function `ask`.
 *
 * Por que existe (em vez de chamar a edge function direto do browser):
 *   - Não expõe a URL/anon key do Supabase no client
 *   - Lê o cookie de sessão do usuário (disponível apenas no servidor)
 *   - Aplica quota diária por plano antes de repassar à edge function
 *   - Header Authorization fica no servidor
 *
 * Quotas (perguntas/dia):
 *   anônimo       → 3  (rate-limit por IP, tratado na própria edge function)
 *   free          → 5
 *   individual    → 50
 *   institucional → ilimitado
 */

import { NextResponse } from "next/server";
import { getUser, getPlano } from "~/lib/supabase-auth";
import { getSupabase } from "~/lib/supabase-server";

// Node.js runtime (não edge) para poder ler cookies de sessão via next/headers.
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL;
// Falha fechado: usa SOMENTE a anon key (já configurada na Vercel; a edge function
// `ask` a aceita — testado). Nunca cai para a SERVICE_ROLE key, que ignora RLS.
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Quotas diárias por plano (-1 = ilimitado).
const QUOTA: Record<"free" | "individual" | "institucional", number> = {
  free: 5,
  individual: 50,
  institucional: -1,
};

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { ok: false, erro: "Servidor não configurado (SUPABASE_URL/SUPABASE_ANON_KEY ausente)" },
      { status: 500 },
    );
  }

  let body: { question?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ ok: false, erro: "Pergunta vazia" }, { status: 400 });
  }
  if (question.length > 500) {
    return NextResponse.json(
      { ok: false, erro: "Pergunta muito longa (máx 500 caracteres)" },
      { status: 400 },
    );
  }

  // ── Quota de IA por plano ────────────────────────────────────────────────
  const user = await getUser().catch(() => null);

  if (user) {
    const plano = await getPlano(user.id).catch(() => "free" as const);
    const limit = QUOTA[plano];

    // -1 = ilimitado (institucional)
    if (limit !== -1) {
      const sb = getSupabase();
      const { data, error } = await sb.rpc("ask_quota_check_increment", {
        p_user_id: user.id,
        p_limit: limit,
      });

      if (!error && data) {
        const row = (data as { count: number; allowed: boolean }[])[0];
        if (row && !row.allowed) {
          return NextResponse.json(
            {
              ok: false,
              erro:
                plano === "free"
                  ? `Você atingiu o limite de ${limit} perguntas por dia no plano gratuito. Assine para continuar pesquisando.`
                  : `Limite diário de ${limit} perguntas atingido.`,
              quota_esgotada: true,
              plano,
              limite: limit,
              upgrade: plano === "free",
            },
            { status: 429 },
          );
        }
      }
    }
  }

  // ── Proxy para a edge function ───────────────────────────────────────────

  // forward IP real pro edge function (pra rate limit de anônimos funcionar)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown";

  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ question }),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { ok: false, erro: `Erro de upstream: ${msg}` },
      { status: 502 },
    );
  }
}
