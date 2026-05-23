/**
 * CLI: load completo de despesas de gabinete ALESP (2015 → hoje).
 *
 * Uso:
 *   npm run despesas:ts -w @transparencia/ingestao-alesp
 *
 * Pré-requisito: rodar `deputados:ts` antes (pra popular `parlamentares`).
 * Sem isso, todas as despesas vão pro `ignorados` (matricula sem mapeamento).
 *
 * Duração esperada: ~5-15 min (depende de banda + Supabase).
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoDespesasAlesp } from "./job-despesas.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

console.log("▶ Iniciando job_ingestao_despesas (ALESP) — load completo...\n");

const resultado = await jobIngestaoDespesasAlesp({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
});

console.log(`\n  Status:                  ${resultado.status}`);
console.log(`  Lidas do XML:            ${resultado.total.toLocaleString("pt-BR")}`);
console.log(`  Passaram nos filtros:    ${resultado.processados.toLocaleString("pt-BR")}`);
console.log(`  Upsertadas:              ${resultado.upsertados.toLocaleString("pt-BR")}`);
console.log(`  Ignoradas (s/ deputado): ${resultado.ignorados.toLocaleString("pt-BR")}`);
console.log(`  Duração:                 ${((resultado.duracao_ms ?? 0) / 1000).toFixed(1)}s`);

if (resultado.matriculas_sem_parlamentar?.length) {
  console.log(`\n  Matrículas sem parlamentar (amostra ${resultado.matriculas_sem_parlamentar.length}):`);
  console.log(`    ${resultado.matriculas_sem_parlamentar.join(", ")}`);
}

if (resultado.erro) console.error(`\n  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
