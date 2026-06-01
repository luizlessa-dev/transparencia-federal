/**
 * CLI: mapeia o catálogo CKAN de MG e salva os datasets/resources dos 4 eixos.
 *
 * Uso (rodar de IP residencial BR ou via proxy — datacenter recebe 403):
 *   npm run ingestao-mg:discover
 *   MG_CKAN_BASE=https://seu-proxy.workers.dev npm run ingestao-mg:discover
 *
 * Saída:
 *   - relatório legível no stdout
 *   - JSON completo em packages/ingestao-mg-executivo/discover-output.json
 *     (entrada pros jobs de ingestão: copiar o resource_id/url certo)
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { descobrir, imprimirRelatorio } from "./discover.js";
import { ckanBase } from "./ckan-client.js";

const t0 = Date.now();
console.log(`▶ Descobrindo datasets no CKAN de MG (${ckanBase})...`);
console.log("  (se isto travar/der 403, você está num IP bloqueado — rode local ou via proxy)\n");

const descoberta = await descobrir(ckanBase, new Date().toISOString());
imprimirRelatorio(descoberta);

const outPath = resolve(__dirname, "../discover-output.json");
writeFileSync(outPath, JSON.stringify(descoberta, null, 2), "utf-8");

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const totalPacotes = descoberta.eixos.reduce((acc, e) => acc + e.pacotes.length, 0);
console.log(`\n✓ ${totalPacotes} dataset(s) mapeados em ${descoberta.eixos.length} eixos — ${elapsed}s`);
console.log(`  JSON salvo em: ${outPath}`);
console.log("\nPróximo passo: identifique no JSON o resource CSV de remuneração e rode");
console.log("  npm run ingestao-mg:remuneracao -- --resource-url \"<url do CSV>\"");
