/**
 * CLI: carga histórica completa de despesas ALEPE (2015 → ano atual).
 *
 * Processa TODOS os 163 deputados históricos (leg=-16).
 * Estimativa: ~16h com throttle=300ms (conservative).
 * Para reduzir: diminuir throttle pra 200ms (~11h) — sem rate limit documentado.
 *
 * Uso:
 *   npm run historico:ts -w @transparencia/ingestao-alepe
 *   npm run historico:ts -w @transparencia/ingestao-alepe -- 2015 2019
 *                                                            ^de  ^até (anos, inclusivo)
 *
 * Idempotente: pode ser interrompido e retomado.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoDespesasAlepe } from "./job-despesas.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const args = process.argv.slice(2);
const anoInicio = args[0] ? Number(args[0]) : 2015;
const anoFim    = args[1] ? Number(args[1]) : new Date().getFullYear();

if (anoInicio < 2015 || anoFim < anoInicio) {
  console.error(`Intervalo de anos inválido: ${anoInicio}–${anoFim}`);
  process.exit(1);
}

const anos: number[] = [];
for (let a = anoInicio; a <= anoFim; a++) anos.push(a);

console.log(`▶ Carga histórica ALEPE — anos ${anoInicio}–${anoFim} (${anos.length} anos)`);
console.log(`  Todos os 163 deputados históricos (leg=-16)`);
console.log(`  Throttle: 300ms · Estimativa: ~${Math.round(anos.length * 163 * 12 * 3 * 0.3 / 3600)}h\n`);

const resultado = await jobIngestaoDespesasAlepe({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anos,
  legDeputados: -16,  // todos os históricos
  throttleMs: 300,
  batchSize: 300,
});

console.log(`\n  Status:       ${resultado.status}`);
console.log(`  Notas lidas:  ${resultado.total.toLocaleString("pt-BR")}`);
console.log(`  Upsertadas:   ${resultado.upsertados.toLocaleString("pt-BR")}`);
console.log(`  Ignoradas:    ${resultado.ignorados.toLocaleString("pt-BR")}`);
console.log(`  Duração:      ${((resultado.duracao_ms ?? 0) / 1000 / 60).toFixed(1)} min`);
if (resultado.ids_sem_parlamentar?.length) {
  console.warn(`  IDs s/ match: ${resultado.ids_sem_parlamentar.slice(0, 20).join(", ")}`);
}
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
