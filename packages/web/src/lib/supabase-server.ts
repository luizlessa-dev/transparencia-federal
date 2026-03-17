/**
 * Cliente Supabase para uso apenas no servidor (API routes, Server Components).
 * Lê apenas da camada publicada; não acessa tabelas brutas nem build.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no ambiente.");
  }
  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}
