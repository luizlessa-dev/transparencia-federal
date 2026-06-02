/**
 * CLI: ingere ofertas públicas / emissores (cvm_oferta).
 *   npm run ingestao-cvm:oferta
 *   npm run ingestao-cvm:oferta -- /tmp/oferta_distribuicao.zip   # zip local
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { ingestOfertas } from "./job-oferta.js";

const zipLocal = process.argv.find((a) => a.endsWith(".zip"));

const t0 = Date.now();
console.log("▶ Ingerindo ofertas públicas / emissores (cvm_oferta)...");
const r = await ingestOfertas(zipLocal);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[${r.status}] ${r.inseridos}/${r.total} ofertas — ${elapsed}s`);
if (r.erros.length) console.log("erros:", r.erros.slice(0, 5));
