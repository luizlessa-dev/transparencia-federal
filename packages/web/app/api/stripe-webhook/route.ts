/**
 * POST /api/stripe-webhook
 *
 * Recebe eventos do Stripe e atualiza o plano do usuário no Supabase.
 *
 * Eventos tratados:
 *   checkout.session.completed        → ativa plano individual
 *   customer.subscription.updated     → atualiza validade (renovação)
 *   customer.subscription.deleted     → cancela → volta para free
 *
 * IMPORTANTE: esta rota precisa receber o body RAW (não parseado pelo Next)
 * para que a verificação de assinatura do Stripe funcione. Por isso usamos
 * `req.text()` e não `req.json()`.
 */
import { NextResponse } from "next/server";
import { getStripe } from "~/lib/stripe";
import { getSupabase } from "~/lib/supabase-server";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

/** Extrai a data de fim do período vigente da assinatura.
 *  Stripe v22+ moveu current_period_end para os items da subscription. */
function periodoParaISO(subscription: Stripe.Subscription): string {
  // Tenta pelo item (v22+)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  const ts: number =
    sub.current_period_end ??             // fallback para APIs mais antigas
    sub.items?.data?.[0]?.current_period_end ?? // v22+ via item
    (Date.now() / 1000 + 31 * 86400);    // fallback: +31 dias
  return new Date(ts * 1000).toISOString();
}

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET não configurada.");
    return NextResponse.json({ erro: "Servidor não configurado." }, { status: 500 });
  }

  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe-webhook] Assinatura inválida:", err);
    return NextResponse.json({ erro: "Assinatura inválida." }, { status: 400 });
  }

  const sb = getSupabase();

  // ── checkout.session.completed ───────────────────────────────────────
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId  = session.client_reference_id ?? session.metadata?.supabase_user_id;

    if (!userId) {
      console.error("[stripe-webhook] userId ausente na sessão:", session.id);
      return NextResponse.json({ ok: false }, { status: 200 }); // 200 para não retentar
    }

    // Busca a subscription para pegar a data de fim do período
    let validoAte: string | null = null;
    if (session.subscription) {
      const sub = await getStripe().subscriptions.retrieve(session.subscription as string);
      validoAte = periodoParaISO(sub);
    }

    await sb.from("user_profiles").upsert({
      id: userId,
      plano: "individual",
      plano_valido_ate: validoAte,
      atualizado_em: new Date().toISOString(),
    }, { onConflict: "id" });

    console.log(`[stripe-webhook] ✅ plano individual ativado: ${userId} valido até ${validoAte}`);
  }

  // ── customer.subscription.updated ───────────────────────────────────
  if (event.type === "customer.subscription.updated") {
    const sub    = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (!userId) return NextResponse.json({ ok: true });

    const ativo = sub.status === "active" || sub.status === "trialing";
    await sb.from("user_profiles").update({
      plano: ativo ? "individual" : "free",
      plano_valido_ate: ativo ? periodoParaISO(sub) : null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", userId);

    console.log(`[stripe-webhook] 🔄 subscription updated: ${userId} status=${sub.status}`);
  }

  // ── customer.subscription.deleted ───────────────────────────────────
  if (event.type === "customer.subscription.deleted") {
    const sub    = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.supabase_user_id;
    if (!userId) return NextResponse.json({ ok: true });

    await sb.from("user_profiles").update({
      plano: "free",
      plano_valido_ate: null,
      atualizado_em: new Date().toISOString(),
    }).eq("id", userId);

    console.log(`[stripe-webhook] ❌ plano cancelado: ${userId}`);
  }

  return NextResponse.json({ ok: true });
}
