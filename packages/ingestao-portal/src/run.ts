/**
 * Ponto de entrada para executar os jobs de ingestão do Portal da Transparência.
 * Uso:
 *   npm run ingestao-portal                   → roda todos os jobs em sequência
 *   npm run ingestao-portal:ts -- emendas     → só emendas
 *   npm run ingestao-portal:ts -- convenios   → só convênios
 *   npm run ingestao-portal:ts -- viagens     → só viagens
 *
 * Variáveis obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PORTAL_TRANSPARENCIA_API_KEY
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoEmendas } from "./job-ingestao-emendas.js";
import { jobIngestaoConvenios } from "./job-ingestao-convenios.js";
import { jobIngestaoViagens } from "./job-ingestao-viagens.js";

const JOBS_DISPONIVEIS = ["emendas", "convenios", "viagens"] as const;
type NomeJob = (typeof JOBS_DISPONIVEIS)[number];

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const portalApiKey = process.env.PORTAL_TRANSPARENCIA_API_KEY;
  const portalBaseUrl = process.env.PORTAL_TRANSPARENCIA_BASE_URL;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
    process.exit(1);
  }
  if (!portalApiKey) {
    console.error("Defina PORTAL_TRANSPARENCIA_API_KEY no ambiente.");
    process.exit(1);
  }

  // Determina quais jobs rodar (argumento CLI ou todos)
  const argJob = process.argv[2] as NomeJob | undefined;
  const jobs: NomeJob[] = argJob && JOBS_DISPONIVEIS.includes(argJob)
    ? [argJob]
    : [...JOBS_DISPONIVEIS];

  console.log(`Jobs a executar: ${jobs.join(", ")}\n`);
  let statusGeral = 0;

  // ── emendas ──────────────────────────────────────────────────────────────
  if (jobs.includes("emendas")) {
    console.log("▶ Iniciando job_ingestao_emendas...");
    const r = await jobIngestaoEmendas({
      supabaseUrl,
      supabaseServiceRoleKey: supabaseKey,
      portalApiKey,
      portalBaseUrl: portalBaseUrl || undefined,
      anos: [2023, 2024, 2025, 2026],
    });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    for (const a of r.resultados_por_ano) {
      console.log(`  ${a.ano}: ${a.status} | registros=${a.total_registros} inseridos=${a.inseridos}${a.erro ? ` ERRO=${a.erro}` : ""}`);
    }
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  // ── convênios ─────────────────────────────────────────────────────────────
  if (jobs.includes("convenios")) {
    console.log("▶ Iniciando job_ingestao_convenios...");
    const r = await jobIngestaoConvenios({
      supabaseUrl,
      supabaseServiceRoleKey: supabaseKey,
      portalApiKey,
      portalBaseUrl: portalBaseUrl || undefined,
      anos: [2023, 2024, 2025, 2026],
    });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    for (const a of r.resultados_por_ano) {
      console.log(`  ${a.ano}: total=${a.total} inseridos=${a.inseridos}`);
    }
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  // ── viagens ───────────────────────────────────────────────────────────────
  if (jobs.includes("viagens")) {
    console.log("▶ Iniciando job_ingestao_viagens...");
    const r = await jobIngestaoViagens({
      supabaseUrl,
      supabaseServiceRoleKey: supabaseKey,
      portalApiKey,
      portalBaseUrl: portalBaseUrl || undefined,
      anos: [2023, 2024, 2025, 2026],
    });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    for (const a of r.resultados_por_ano) {
      console.log(`  ${a.ano}: total=${a.total} inseridos=${a.inseridos}`);
    }
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  process.exit(statusGeral);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
