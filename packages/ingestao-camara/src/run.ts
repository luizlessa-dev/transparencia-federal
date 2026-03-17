/**
 * Ponto de entrada para executar os jobs de ingestão da Câmara dos Deputados.
 * Uso:
 *   npm run ingestao-camara                    → roda todos os jobs em sequência
 *   npm run ingestao-camara:ts -- deputados    → só deputados
 *   npm run ingestao-camara:ts -- ceaps        → só CEAPS (requer deputados já ingeridos)
 *   npm run ingestao-camara:ts -- senadores    → só senadores
 *   npm run ingestao-camara:ts -- votacoes     → só votações
 *
 * Variáveis obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoDeputados } from "./job-ingestao-deputados.js";
import { jobIngestaoCeaps } from "./job-ingestao-ceaps.js";
import { jobIngestaoSenadores } from "./job-ingestao-senadores.js";
import { jobIngestaoVotacoes } from "./job-ingestao-votacoes.js";

const JOBS_DISPONIVEIS = ["deputados", "ceaps", "senadores", "votacoes"] as const;
type NomeJob = (typeof JOBS_DISPONIVEIS)[number];

async function main(): Promise<void> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
    process.exit(1);
  }

  // Determina quais jobs rodar (argumento CLI ou todos)
  const argJob = process.argv[2] as NomeJob | undefined;
  const jobs: NomeJob[] = argJob && JOBS_DISPONIVEIS.includes(argJob)
    ? [argJob]
    : [...JOBS_DISPONIVEIS];

  console.log(`Jobs a executar: ${jobs.join(", ")}\n`);
  let statusGeral = 0;

  // ── deputados ─────────────────────────────────────────────────────────────
  if (jobs.includes("deputados")) {
    console.log("▶ Iniciando job_ingestao_deputados...");
    const r = await jobIngestaoDeputados({ supabaseUrl, supabaseServiceRoleKey: supabaseKey });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    console.log(`  Total: ${r.total} | Inseridos: ${r.inseridos}${r.erro ? ` ERRO=${r.erro}` : ""}`);
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  // ── ceaps ─────────────────────────────────────────────────────────────────
  if (jobs.includes("ceaps")) {
    console.log("▶ Iniciando job_ingestao_ceaps...");
    const r = await jobIngestaoCeaps({ supabaseUrl, supabaseServiceRoleKey: supabaseKey });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    for (const a of r.resultados_por_ano) {
      console.log(`  ${a.ano}: total=${a.total} inseridos=${a.inseridos} erros_dep=${a.erros}`);
    }
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  // ── senadores ─────────────────────────────────────────────────────────────
  if (jobs.includes("senadores")) {
    console.log("▶ Iniciando job_ingestao_senadores...");
    const r = await jobIngestaoSenadores({ supabaseUrl, supabaseServiceRoleKey: supabaseKey });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    console.log(`  Total: ${r.total} | Inseridos: ${r.inseridos}${r.erro ? ` ERRO=${r.erro}` : ""}`);
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  // ── votações ──────────────────────────────────────────────────────────────
  if (jobs.includes("votacoes")) {
    console.log("▶ Iniciando job_ingestao_votacoes...");
    const r = await jobIngestaoVotacoes({ supabaseUrl, supabaseServiceRoleKey: supabaseKey });
    console.log(`  Execução: ${r.execucao_id} | Status: ${r.status}`);
    console.log(`  Total: ${r.total} | Inseridos: ${r.inseridos}${r.erro ? ` ERRO=${r.erro}` : ""}`);
    if (r.status === "erro") statusGeral = 1;
    console.log();
  }

  process.exit(statusGeral);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
