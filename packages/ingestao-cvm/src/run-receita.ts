/**
 * CLI: ingere QSA + empresas da Receita, ENXUTO (filtrado pelo universo CVM).
 *   npm run ingestao-cvm:receita                 # mês mais novo, Socios+Empresas 0-9
 *   npm run ingestao-cvm:receita -- 2026-04 0    # mês fixo, só arquivo 0 (validação)
 *   npm run ingestao-cvm:receita -- 2026-04 0-9  # range
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { listarMeses } from "./receita-client.js";
import { montarUniverso, ingestSocios, ingestEmpresas, novoClient } from "./job-receita.js";

function parseIdxs(spec: string | undefined): number[] {
  if (!spec) return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const m = spec.match(/^(\d)-(\d)$/);
  if (m) { const a = +m[1], b = +m[2]; return Array.from({ length: b - a + 1 }, (_, i) => a + i); }
  if (/^\d$/.test(spec)) return [Number(spec)];
  return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
}

const posic = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const mesArg = posic.find((a) => /^\d{4}-\d{2}$/.test(a));
const idxs = parseIdxs(posic.find((a) => /^\d(-\d)?$/.test(a)));

const t0 = Date.now();
const mes = mesArg ?? (await listarMeses()).slice(-1)[0];
if (!mes) { console.error("Nenhum mês disponível no share da Receita."); process.exit(1); }

const client = novoClient();
console.log(`▶ Montando universo de CNPJs (gestores/emissores/sancionadas)...`);
const universo = await montarUniverso(client);
console.log(`  universo: ${universo.size.toLocaleString("pt-BR")} CNPJs básicos`);

console.log(`▶ Receita ${mes} — Empresas ${idxs.join(",")}...`);
const emp = await ingestEmpresas(mes, idxs, universo, client);
console.log(`▶ Receita ${mes} — Socios ${idxs.join(",")}...`);
const soc = await ingestSocios(mes, idxs, universo, client);

const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n✓ empresas: ${emp.gravadas} gravadas | sócios: ${soc.gravadas} gravados — ${elapsed}s`);
const erros = [...emp.erros, ...soc.erros];
if (erros.length) console.log("erros:", erros.slice(0, 5));
