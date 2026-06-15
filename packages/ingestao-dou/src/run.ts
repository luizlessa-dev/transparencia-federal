/**
 * Ponto de entrada para ingestão do DOU.
 * Uso:
 *   npm run ingestao-dou:ts              → ingestão do dia + cruzamento
 *   npm run dou:nomeacoes               → só DO2 do dia
 *   npm run dou:contratos               → só DO3 do dia
 *   npm run dou:cruzamento              → só cruzamento (sem nova ingestão)
 *   tsx src/run.ts 2024-06-10           → data específica (YYYY-MM-DD)
 *
 * Variáveis obrigatórias: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createSupabaseClient } from "./db.js";
import { jobIngestaoDOU, jobCruzamento } from "./job-ingestao-dou.js";

const JOBS = ["nomeacoes", "contratos", "cruzamento"] as const;
type NomeJob = (typeof JOBS)[number];

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.");
    process.exit(1);
  }

  const supabase = createSupabaseClient(url, key);

  // Argumento pode ser um job ou uma data YYYY-MM-DD
  const arg = process.argv[2];
  const isJob = arg && JOBS.includes(arg as NomeJob);
  const isData = arg && /^\d{4}-\d{2}-\d{2}$/.test(arg);

  const dataAlvo = isData ? new Date(arg + "T12:00:00Z") : undefined;

  if (isJob) {
    const job = arg as NomeJob;
    if (job === "cruzamento") {
      await jobCruzamento(supabase);
    } else {
      // nomeacoes e contratos usam o mesmo pipeline — a separação é por seção dentro do job
      await jobIngestaoDOU(supabase, dataAlvo);
    }
  } else {
    await jobIngestaoDOU(supabase, dataAlvo);
  }
}

main().catch((err) => {
  console.error("[dou] Erro fatal:", err);
  process.exit(1);
});
