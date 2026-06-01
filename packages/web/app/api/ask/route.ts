/**
 * Proxy server-side pra Supabase Edge Function `ask`.
 *
 * Por que existe (em vez de chamar a edge function direto do browser):
 *   - Não expõe a URL/anon key do Supabase no client
 *   - Pode somar cache do Next.js + rate limit do Vercel se necessário
 *   - Header Authorization fica no servidor
 *
 * O backend (validação SQL, cache, telemetria) está todo na edge function.
 * Esta route só repassa a pergunta e devolve a resposta.
 */

import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL;
// Falhar fechado: nunca cair para a SERVICE_ROLE key (que ignora RLS) se a anon
// key faltar. Sem anon key, a rota retorna 500 em vez de vazar privilégio.
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

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

  // forward IP real pro edge function (pra rate limit funcionar)
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
