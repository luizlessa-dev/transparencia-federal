/**
 * Cliente Stripe singleton — server-side only.
 * Nunca expor a secret key ao browser.
 */
import "server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY não configurada.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripeClient = new Stripe(key, { apiVersion: "2026-05-27.dahlia" as any });
  return stripeClient;
}

/** IDs dos preços configurados no Stripe Dashboard. */
export const STRIPE_PRICES = {
  individual_monthly: process.env.STRIPE_PRICE_INDIVIDUAL_MONTHLY ?? "",
  individual_annual:  process.env.STRIPE_PRICE_INDIVIDUAL_ANNUAL  ?? "",
} as const;
