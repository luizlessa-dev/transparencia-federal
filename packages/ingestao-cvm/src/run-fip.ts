/**
 * CLI: ingere os informes de FIP (trimestral 2021-23 + quadrimestral 2024+).
 *   npm run ingestao-cvm:fip                  # anos padrão 2021..2026
 *   npm run ingestao-cvm:fip -- 2023,2024,2025,2026
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { ingestFipInforme, upsertNodesFip, novoClient } from "./job-fip.js";

const B = "https://dados.cvm.gov.br/dados/FIP/DOC";
const arg = process.argv.find((a) => /^\d{4}(,\d{4})*$/.test(a));
const anos = arg ? arg.split(",").map(Number) : [2021, 2022, 2023, 2024, 2025, 2026];

function urlPara(ano: number): { url: string; fonte: "trimestral" | "quadrimestral" } {
  // O regime virou quadrimestral em 2024.
  return ano <= 2023
    ? { url: `${B}/INF_TRIMESTRAL/DADOS/inf_trimestral_fip_${ano}.csv`, fonte: "trimestral" }
    : { url: `${B}/INF_QUADRIMESTRAL/DADOS/inf_quadrimestral_fip_${ano}.csv`, fonte: "quadrimestral" };
}

const client = novoClient();
const nodes = new Map<string, string>();
const errosGlobais: string[] = [];
let totalIns = 0;

const t0 = Date.now();
for (const ano of anos) {
  const { url, fonte } = urlPara(ano);
  process.stdout.write(`▶ FIP ${ano} (${fonte})… `);
  const r = await ingestFipInforme(url, fonte, client, nodes);
  totalIns += r.inseridos;
  errosGlobais.push(...r.erros);
  console.log(`[${r.status}] ${r.inseridos}/${r.total}`);
}

const nodeIns = await upsertNodesFip(client, nodes, errosGlobais);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ ${totalIns} informes FIP + ${nodeIns} nós (FIPs) atualizados — ${elapsed}s`);
if (errosGlobais.length) console.log("erros:", errosGlobais.slice(0, 5));
