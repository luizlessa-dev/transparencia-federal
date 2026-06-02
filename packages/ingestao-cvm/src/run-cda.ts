/**
 * CLI: ingere as arestas fundo→fundo da CDA (mês mais recente populado).
 *   npm run ingestao-cvm:cda                    # acha o mês populado mais novo
 *   npm run ingestao-cvm:cda -- --mes 202602
 *   npm run ingestao-cvm:cda -- --zip /tmp/cda_fi_202602.zip --mes 202602
 *
 * A CDA sai com lag: o mês corrente costuma vir vazio (~3KB). O probe anda pra
 * trás até achar um zip > 1MB.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { ingestCdaEdges } from "./job-cda.js";

const BASE = "https://dados.cvm.gov.br/dados/FI/DOC/CDA/DADOS";
const UA = process.env.CVM_USER_AGENT ?? "TheBRInsider/1.0 (+https://thebrinsider.com)";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function acharMesPopulado(): Promise<string> {
  const now = new Date();
  for (let back = 0; back < 8; back++) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const mes = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    try {
      const res = await fetch(`${BASE}/cda_fi_${mes}.zip`, { method: "HEAD", headers: { "User-Agent": UA } });
      const len = Number(res.headers.get("content-length") ?? 0);
      if (len > 1_000_000) return mes;
    } catch { /* tenta o anterior */ }
  }
  throw new Error("nenhum mês populado da CDA encontrado nos últimos 8 meses");
}

const mes = arg("--mes") ?? (await acharMesPopulado());
const zip = arg("--zip");

const t0 = Date.now();
console.log(`▶ Ingerindo arestas fundo→fundo da CDA — competência ${mes}...`);
const r = await ingestCdaEdges(mes, zip);
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`\n[${r.status}] ${r.inseridos} arestas de ${r.total} linhas BLC_2 — ${elapsed}s`);
if (r.erros.length) console.log("erros:", r.erros.slice(0, 5));
