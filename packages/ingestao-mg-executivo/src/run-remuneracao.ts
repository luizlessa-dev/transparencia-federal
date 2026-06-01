/**
 * CLI: ingere remuneração de servidores do Executivo de MG (supersalários).
 *
 * Recomendado (invocação direta no workspace, evita o duplo `npm run` que
 * engole os flags):
 *   npm run remuneracao:ts -w @transparencia/ingestao-mg-executivo -- \
 *     --resource-url "https://dados.mg.gov.br/.../servidores_032026.csv"
 *
 * Também aceita ARGUMENTO POSICIONAL (robusto ao alias de 2 hops):
 *   npm run ingestao-mg:remuneracao -- "https://dados.mg.gov.br/.../servidores_032026.csv" 2026-03
 *
 * Flags / posicionais:
 *   --resource-url <url> | primeiro token http(s)://...
 *   --resource-id  <id>
 *   --snapshot <YYYY-MM> | token YYYY-MM  (default: mês corrente)
 *   --encoding latin1|utf-8   (default latin1)        | token "latin1"/"utf-8"
 *   --valor-format br|centavos (default br — MG usa decimal com vírgula)
 *   --teto <num>  (default: deixa o default da tabela)
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoRemuneracao } from "./job-remuneracao.js";

const argv = process.argv.slice(2);
function flag(nome: string): string | undefined {
  const i = argv.indexOf(`--${nome}`);
  return i >= 0 ? argv[i + 1] : undefined;
}
// Posicionais (fallback): URL, YYYY-MM, encoding.
const posUrl = argv.find((a) => /^https?:\/\//i.test(a));
const posSnap = argv.find((a) => /^\d{4}-\d{2}$/.test(a));
const posEnc = argv.find((a) => a === "latin1" || a === "utf-8") as "latin1" | "utf-8" | undefined;

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const resourceUrl = flag("resource-url") ?? posUrl;
const resourceId = flag("resource-id");
if (!resourceUrl && !resourceId) {
  console.error("Informe --resource-url <url> (ou cole a URL como argumento) ou --resource-id <id>. Rode `discover` antes.");
  process.exit(1);
}

const snapshotFlag = flag("snapshot") ?? posSnap;
const snapshotMes = snapshotFlag ? `${snapshotFlag}-01` : undefined;
const encoding = (flag("encoding") as "utf-8" | "latin1" | undefined) ?? posEnc ?? "latin1";
const valorFormat = (flag("valor-format") as "centavos" | "br" | undefined) ?? "br";
const tetoFlag = flag("teto");
const tetoReferencia = tetoFlag ? Number(tetoFlag) : undefined;

console.log("▶ Ingerindo remuneração (Executivo MG)");
console.log(`  fonte:    ${resourceUrl ?? `datastore:${resourceId}`}`);
console.log(`  snapshot: ${snapshotMes ?? "(mês corrente)"}  | encoding: ${encoding} | valores: ${valorFormat}`);

const t0 = Date.now();
const r = await jobIngestaoRemuneracao({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  resourceUrl,
  resourceId,
  encoding,
  valorFormat,
  snapshotMes,
  tetoReferencia,
  onProgress: ({ lidos, inseridos, supersalarios }) =>
    console.log(`  ... ${inseridos}/${lidos} gravados, ${supersalarios} com abate/acima do teto`),
});

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n  Status:        ${r.status}`);
console.log(`  Snapshot:      ${r.snapshotMes}`);
console.log(`  Linhas lidas:  ${r.totalLinhas}`);
console.log(`  Gravados:      ${r.inseridos}`);
console.log(`  Supersalários: ${r.supersalarios}`);
console.log(`  Tempo:         ${elapsed}s`);
if (r.colunasNaoEncontradas.length) {
  console.log(`  ⚠ colunas não mapeadas: ${r.colunasNaoEncontradas.join(", ")}`);
  console.log(`    header real: ${r.headerDetectado.join(" | ")}`);
}
if (r.erros.length) {
  console.log("\n  Erros:");
  for (const e of r.erros.slice(0, 10)) console.log(`    - ${e}`);
}
if (r.status === "erro") process.exit(1);
