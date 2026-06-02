/**
 * Proxy server-side → Supabase Edge Function `gerar-pauta-fundacao`.
 */
import { NextResponse } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export async function POST(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY)
    return NextResponse.json({ ok: false, erro: "Servidor não configurado" }, { status: 500 });

  let body: { cnpj?: string; ano?: number };
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 }); }

  if (!body.cnpj) return NextResponse.json({ ok: false, erro: "CNPJ obrigatório" }, { status: 400 });

  try {
    const upstream = await fetch(`${SUPABASE_URL}/functions/v1/gerar-pauta-fundacao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, erro: msg }, { status: 502 });
  }
}
