/**
 * POST /api/checkout
 *
 * Cria uma sessão Stripe Checkout e redireciona para o pagamento.
 * Body JSON: { plan: "monthly" | "annual" }
 *
 * O usuário precisa estar logado (exigimos email para criar o customer
 * e para associar o plano após o pagamento via webhook).
 */
import { NextResponse } from "next/server";
import { getUser } from "~/lib/supabase-auth";
import { getStripe, STRIPE_PRICES } from "~/lib/stripe";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.thebrinsider.com";

export async function POST(req: Request) {
  // ── Auth: precisa estar logado ──────────────────────────────────────
  const user = await getUser().catch(() => null);
  if (!user?.email) {
    return NextResponse.json(
      { erro: "Faça login para assinar.", redirect: `/login?next=/planos` },
      { status: 401 },
    );
  }

  // ── Plano escolhido ─────────────────────────────────────────────────
  let body: { plan?: string } = {};
  try { body = await req.json(); } catch { /* ignora */ }

  const plan = body.plan === "annual" ? "annual" : "monthly";
  const priceId = plan === "annual"
    ? STRIPE_PRICES.individual_annual
    : STRIPE_PRICES.individual_monthly;

  if (!priceId) {
    return NextResponse.json(
      { erro: "Stripe não configurado. Entre em contato: contato@thebrinsider.com" },
      { status: 500 },
    );
  }

  // ── Cria sessão Stripe Checkout ─────────────────────────────────────
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card", "boleto", "pix"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    // `client_reference_id` permite associar o pagamento ao user_id
    // no webhook, mesmo sem criar um Customer antes.
    client_reference_id: user.id,
    success_url: `${BASE_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE_URL}/planos`,
    allow_promotion_codes: true,
    locale: "pt-BR",
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    metadata: { supabase_user_id: user.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
