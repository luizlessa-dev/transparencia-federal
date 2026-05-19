/**
 * CLI: agrega votações em votacoes_deputado_agg via RPC Postgres.
 *
 * A função computar_votacoes_agg() roda inteiramente em Postgres:
 *   - presença, ausência, breakdown por tipo de voto
 *   - concordância partidária (via join com votacoes_orientacoes)
 *   - posição geral e por partido
 *
 * Uso:
 *   npm run votacoes-agg:ts            # legislatura 57 (padrão)
 *   npm run votacoes-agg:ts -- 56      # legislatura específica
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const args        = process.argv.slice(2);
const legislatura = args[0] ? parseInt(args[0], 10) : 57;

console.log("▶ Iniciando job_votacoes_agg...");
console.log(`  Legislatura: ${legislatura}`);

const t0 = Date.now();
const { data, error } = await sb.rpc("computar_votacoes_agg", {
  p_legislatura: legislatura,
});

const duracao_ms = Date.now() - t0;

if (error) {
  console.error(`\n  Erro: ${error.message}`);
  process.exit(1);
}

const resultado = data as {
  status: string;
  legislatura: number;
  total_votacoes: number;
  deputados_processados: number;
};

console.log(`\n  Status: ${resultado.status}`);
console.log(`  Legislatura: ${resultado.legislatura}`);
console.log(`  Total votações: ${resultado.total_votacoes}`);
console.log(`  Deputados processados: ${resultado.deputados_processados}`);
console.log(`  Duração: ${duracao_ms}ms`);
