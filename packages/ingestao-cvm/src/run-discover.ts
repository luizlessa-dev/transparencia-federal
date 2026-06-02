/**
 * CLI: mapeia o catálogo CKAN da CVM e salva os datasets/resources dos eixos.
 *
 * Uso:
 *   npm run ingestao-cvm:discover
 *
 * Saída:
 *   - relatório legível no stdout
 *   - JSON completo em packages/ingestao-cvm/discover-output.json
 *     (entrada pros jobs: copiar o resource_id/url certo de cada ano/mês)
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
console.log(`▶ Descobrindo datasets no CKAN da CVM (${ckanBase})...`);

const descoberta = await descobrir(ckanBase, new Date().toISOString());
imprimirRelatorio(descoberta);

const outPath = resolve(__dirname, "../discover-output.json");
writeFileSync(outPath, JSON.stringify(descoberta, null, 2), "utf-8");

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
const totalPacotes = descoberta.eixos.reduce((acc, e) => acc + e.pacotes.length, 0);
console.log(`\n✓ ${totalPacotes} dataset(s) mapeados em ${descoberta.eixos.length} eixos — ${elapsed}s`);
console.log(`  JSON salvo em: ${outPath}`);
