/**
 * CLI: ingere viagens de servidores federais do Portal da Transparência.
 *
 * Uso:
 *   npm run viagens:ts
 *   npm run viagens:ts -- --anos 2025,2026
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoViagens } from "./job-ingestao-viagens.js";

const args = process.argv.slice(2);
const anosArg = args.find((a) => a.startsWith("--anos=") || a === "--anos");
let anos: number[] | undefined;
if (anosArg) {
  const val = anosArg.startsWith("--anos=")
    ? anosArg.split("=")[1]
    : args[args.indexOf("--anos") + 1];
  anos = val?.split(",").map(Number).filter(Boolean);
}

console.log(`▶ Iniciando job_ingestao_viagens${anos ? ` (anos: ${anos.join(", ")})` : " (2023–2026)"}...`);

const resultado = await jobIngestaoViagens({
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  portalApiKey: process.env.PORTAL_TRANSPARENCIA_API_KEY!,
  anos,
});

const total = resultado.resultados_por_ano.reduce((s, r) => s + r.total, 0);
const inseridos = resultado.resultados_por_ano.reduce((s, r) => s + r.inseridos, 0);

console.log(`\n  Status    : ${resultado.status}`);
console.log(`  Anos      : ${resultado.resultados_por_ano.map((r) => r.ano).join(", ")}`);
console.log(`  Total     : ${total} viagens`);
console.log(`  Upserted  : ${inseridos}`);
if (resultado.erro) console.error(`  Erro      : ${resultado.erro}`);

if (resultado.status !== "sucesso") process.exit(1);
