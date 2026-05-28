/**
 * CLI: ingestão incremental de despesas ALEPE — mês/ano específicos.
 *
 * Processa só os deputados ativos da legislatura atual (leg=17).
 * Ideal para o cron mensal no GitHub Actions.
 *
 * Uso:
 *   npm run despesas:ts -w @transparencia/ingestao-alepe -- 2026 4 5
 *                                                           ^ano ^meses
 *
 * Sem argumentos: usa o mês anterior e o corrente do ano atual.
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
let anoArg: number;
let mesesArg: number[];

if (args.length > 0) {
  anoArg = Number(args[0]);
  mesesArg = args.slice(1).map(Number).filter((n) => n >= 1 && n <= 12);
} else {
  const now = new Date();
  anoArg = now.getFullYear();
  const mesAtual = now.getMonth() + 1;
  mesesArg = mesAtual === 1 ? [1] : [mesAtual - 1, mesAtual];
}

if (!Number.isFinite(anoArg) || anoArg < 2015) {
  console.error(`Ano inválido: ${args[0]}`);
  process.exit(1);
}

console.log(
  `▶ Ingestão incremental ALEPE` +
  ` — ano=${anoArg}` +
  (mesesArg.length ? `, meses=[${mesesArg.join(",")}]` : ", todos os meses") +
  `\n`,
);

const resultado = await jobIngestaoDespesasAlepe({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anos: [anoArg],
  mesesExatos: mesesArg.length > 0 ? mesesArg : undefined,
  legDeputados: 17,   // só os atuais no incremental
});

console.log(`\n  Status:       ${resultado.status}`);
console.log(`  Notas lidas:  ${resultado.total.toLocaleString("pt-BR")}`);
console.log(`  Upsertadas:   ${resultado.upsertados.toLocaleString("pt-BR")}`);
console.log(`  Ignoradas:    ${resultado.ignorados.toLocaleString("pt-BR")}`);
console.log(`  Duração:      ${((resultado.duracao_ms ?? 0) / 1000).toFixed(1)}s`);
if (resultado.ids_sem_parlamentar?.length) {
  console.warn(`  IDs s/ match: ${resultado.ids_sem_parlamentar.join(", ")}`);
}
if (resultado.erro) console.error(`  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
