/**
 * CLI: recomputa apenas cam_proposicoes_agg a partir de cam_proposicoes (sem reingerir).
 * Útil quando só o agregado precisa ser refeito após bulk insert ou patch.
 *
 *   npm run proposicoes-agg:ts -w @transparencia/ingestao-camara
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { computarAggregate } from "./job-ingestao-proposicoes.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."); process.exit(1); }

const sb = createClient(url, key);
const t0 = Date.now();

console.log("▶ Recomputando cam_proposicoes_agg (sem reingerir)");

// Lista de deputados vem de cam_parlamentar_risco (já normalizada com nome/partido/UF/foto).
const PAGE = 1000;
const deputados: Array<{ deputado_id: number; nome: string; sigla_partido: string; sigla_uf: string; url_foto: string }> = [];
let fromIdx = 0;
while (true) {
  const { data, error } = await sb
    .from("cam_parlamentar_risco")
    .select("deputado_id, nome, sigla_partido, sigla_uf, url_foto")
    .order("deputado_id", { ascending: true })
    .range(fromIdx, fromIdx + PAGE - 1);
  if (error) { console.error("Erro lendo cam_parlamentar_risco:", error.message); process.exit(1); }
  const rows = (data ?? []) as typeof deputados;
  deputados.push(...rows);
  if (rows.length < PAGE) break;
  fromIdx += PAGE;
}

console.log(`  Deputados carregados: ${deputados.length}`);

await computarAggregate(sb, deputados);

console.log(`\n✅ Concluído em ${Date.now() - t0}ms`);
