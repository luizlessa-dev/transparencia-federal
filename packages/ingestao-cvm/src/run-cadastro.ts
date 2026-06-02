/**
 * CLI: ingere o cadastro de fundos da CVM em cvm_fundo.
 *   npm run ingestao-cvm:cadastro
 *   npm run ingestao-cvm:cadastro -- --resource-url "<url do cad_fi.csv>"
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { ingestCadastro } from "./job-cadastro.js";

const arg = process.argv.indexOf("--resource-url");
const url = arg >= 0 ? process.argv[arg + 1] : undefined;

const t0 = Date.now();
console.log("▶ Ingerindo cadastro de fundos (cvm_fundo)...");
const r = await ingestCadastro(url);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[${r.status}] ${r.inseridos}/${r.total} fundos — ${elapsed}s`);
if (r.erros.length) console.log("erros:", r.erros.slice(0, 5));
