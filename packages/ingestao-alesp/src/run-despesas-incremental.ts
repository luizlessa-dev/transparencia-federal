/**
 * CLI: ingestão incremental de despesas ALESP — só ano/meses específicos.
 *
 * O XML da ALESP é único e contém todo o histórico desde 2015. Pra rodar
 * "só abril e maio de 2026", a estratégia é fazer o stream completo e
 * filtrar em memória durante o stream (cheap — só salva no DB o que passa
 * no filtro).
 *
 * Uso:
 *   npm run despesas:incremental:ts -w @transparencia/ingestao-alesp -- 2026 4 5
 *                                                                       ^ano ^meses (1..N)
 *
 * Sem argumentos:
 *   roda só o ano corrente.
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

const args = process.argv.slice(2);
const anoArg = args[0] ? Number(args[0]) : new Date().getFullYear();
const mesesArg = args.slice(1).map((s) => Number(s)).filter((n) => n >= 1 && n <= 12);

if (!Number.isFinite(anoArg) || anoArg < 2015) {
  console.error(`Ano inválido: ${args[0]} (precisa ser >= 2015).`);
  process.exit(1);
}

console.log(
  `▶ Ingestão incremental ALESP — ano=${anoArg}` +
  (mesesArg.length ? `, meses=[${mesesArg.join(",")}]` : ", todos os meses") +
  `\n`,
);

const resultado = await jobIngestaoDespesasAlesp({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  anoExato: anoArg,
  mesesExatos: mesesArg.length > 0 ? mesesArg : undefined,
});

console.log(`\n  Status:                  ${resultado.status}`);
console.log(`  Lidas do XML:            ${resultado.total.toLocaleString("pt-BR")}`);
console.log(`  Passaram nos filtros:    ${resultado.processados.toLocaleString("pt-BR")}`);
console.log(`  Upsertadas:              ${resultado.upsertados.toLocaleString("pt-BR")}`);
console.log(`  Ignoradas (s/ deputado): ${resultado.ignorados.toLocaleString("pt-BR")}`);
console.log(`  Duração:                 ${((resultado.duracao_ms ?? 0) / 1000).toFixed(1)}s`);
if (resultado.erro) console.error(`\n  Erro: ${resultado.erro}`);

if (resultado.status === "erro") process.exit(1);
