/**
 * Helpers de autenticação para Server Components e Server Actions.
 * Usa @supabase/ssr para gestão de cookies de sessão.
 * Nunca exposto ao browser — apenas server-side.
 */

import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";

function getEnv() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos.");
  return { url, key };
}

/** Cria client de auth com cookie store (para Server Components e Actions). */
export async function createAuthClient(): Promise<SupabaseClient> {
  const { url, key } = getEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    auth: { persistSession: true },
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}

/** Retorna o usuário autenticado ou null. */
export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createAuthClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/** Retorna plano do usuário: 'free' | 'individual' | 'institucional'. */
export async function getPlano(userId: string): Promise<"free" | "individual" | "institucional"> {
  try {
    const { getSupabase } = await import("./supabase-server");
    const sb = getSupabase();
    const { data } = await sb
      .from("user_profiles")
      .select("plano, plano_valido_ate")
      .eq("id", userId)
      .single();

    if (!data) return "free";

    // Verifica validade
    if (data.plano_valido_ate && new Date(data.plano_valido_ate) < new Date()) {
      return "free";
    }

    return (data.plano as "free" | "individual" | "institucional") ?? "free";
  } catch {
    return "free";
  }
}

/** Verifica se usuário tem acesso pago (individual ou institucional). */
export async function hasPaidAccess(userId: string): Promise<boolean> {
  const plano = await getPlano(userId);
  return plano === "individual" || plano === "institucional";
}
