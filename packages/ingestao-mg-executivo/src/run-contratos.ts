/**
 * CLI: ingere Empresas Sancionadas + Contratos do Executivo de MG.
 * O cruzamento (fornecedor sancionado com contrato) é a view mg_contratos_sancionados.
 *
 * Uso (IP residencial BR ou proxy):
 *   npm run ingestao-mg:contratos                       # sancionadas + contratos 2026 (defaults)
 *   npm run ingestao-mg:contratos -- --contratos-url "<url contratosANO.csv>"   # outro ano
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { ingestSancionadas, ingestContratos } from "./job-contratos.js";

// Resources fixos (id estável). contratos = 2026 por padrão.
const SANCIONADAS_URL =
  "https://dados.mg.gov.br/dataset/ee4722fd-d58c-4c31-a065-1ed2490ee015/resource/f65853bb-4298-4456-a388-736fa9ff5d62/download/empresas_sancionadas.csv";
const CONTRATOS_2026_URL =
  "https://dados.mg.gov.br/dataset/b27999c9-6151-4b86-8327-baa40b6d8983/resource/624696c2-0d55-496c-b6ca-87a97e6236c4/download/contratos2026.csv";

function flag(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
// Fallback posicional: o alias `npm run ingestao-mg:contratos` tem 2 hops de
// npm que engolem `--contratos-url`, deixando a URL como argumento solto.
const posUrl = process.argv.slice(2).find((a) => /^https?:\/\//i.test(a));

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const contratosUrl = flag("contratos-url") ?? posUrl ?? CONTRATOS_2026_URL;
const sancionadasUrl = flag("sancionadas-url") ?? SANCIONADAS_URL;
console.log(`  (fonte contratos: ${contratosUrl.split("/").pop()})`);

console.log("▶ Ingestão Contratos × Sancionadas (Executivo MG)");

const t0 = Date.now();

console.log("  [1/2] empresas sancionadas...");
const s = await ingestSancionadas({ supabaseUrl: url, supabaseServiceRoleKey: key, resourceUrl: sancionadasUrl });
console.log(`        status ${s.status} | linhas ${s.total} | gravadas ${s.inseridos}`);
for (const e of s.erros.slice(0, 5)) console.log(`        erro: ${e}`);
if (s.status === "erro") { console.log(`        header: ${s.header.join(" | ")}`); }

console.log("  [2/2] contratos...");
const c = await ingestContratos({ supabaseUrl: url, supabaseServiceRoleKey: key, resourceUrl: contratosUrl });
console.log(`        status ${c.status} | linhas ${c.total} | gravados ${c.inseridos}`);
for (const e of c.erros.slice(0, 5)) console.log(`        erro: ${e}`);
if (c.status === "erro") { console.log(`        header: ${c.header.join(" | ")}`); }

console.log(`✓ Concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
if (s.status === "erro" || c.status === "erro") process.exit(1);
