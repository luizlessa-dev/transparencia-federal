/**
 * CLI MENSAL: acha sozinho o CSV de remuneração do mês mais recente do dataset
 * (o resource_id muda a cada mês), ingere, e PODA os snapshots antigos pra
 * manter a tabela enxuta (disco). Rodar via launchd em IP residencial BR.
 *
 * Uso:
 *   npm run ingestao-mg:mensal                 # acha o último mês, ingere, poda
 *   npm run ingestao-mg:mensal -- --keep-history   # não poda (acumula meses)
 *
 * Dataset: remuneracao-servidores-ativos (CGE). Resources nomeados
 *   servidores-YYYY-MM.csv(.gz)  (histórico)  e  servidores_MMYYYY.csv (recente).
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { packageShow } from "./ckan-client.js";
import { jobIngestaoRemuneracao } from "./job-remuneracao.js";
import { parseAnoMes, nomeArquivo } from "./mes.js";

const DATASET_ID = "98b58ea9-813e-4f50-8555-4ec0e15bbe91"; // remuneracao-servidores-ativos

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}
const prune = !process.argv.includes("--keep-history");

console.log("▶ Ingestão MENSAL — remuneração Executivo MG");

// 1. Acha o resource do mês mais recente.
const pkg = await packageShow(DATASET_ID);
const candidatos = (pkg.resources ?? [])
  .filter((r) => (r.format ?? "").toUpperCase() === "CSV" && /servidores/i.test(nomeArquivo(r.url) || (r.name ?? "")))
  // ⚠️ parsear o NOME DO ARQUIVO, não a URL (UUID tem dígitos que enganam o regex)
  .map((r) => ({ r, d: parseAnoMes(nomeArquivo(r.url) || (r.name ?? "")) }))
  .filter((x): x is { r: typeof x.r; d: { ano: number; mes: number } } => x.d !== null)
  .sort((a, b) => b.d.ano * 12 + b.d.mes - (a.d.ano * 12 + a.d.mes));

if (candidatos.length === 0) {
  console.error("Nenhum resource de remuneração reconhecido no dataset.");
  process.exit(1);
}

const { r: recurso, d } = candidatos[0];
const snapshotMes = `${d.ano}-${String(d.mes).padStart(2, "0")}-01`;
console.log(`  Mês mais recente: ${String(d.mes).padStart(2, "0")}/${d.ano}`);
console.log(`  Resource: ${recurso.url}`);

if (!recurso.url) {
  console.error("Resource sem URL de download.");
  process.exit(1);
}

// 2. Ingere (parser BR + bruto reconstruído já são default).
const t0 = Date.now();
const res = await jobIngestaoRemuneracao({
  supabaseUrl: url,
  supabaseServiceRoleKey: key,
  resourceUrl: recurso.url,
  snapshotMes,
  soSupersalarios: true, // só grava abate>0 (~2,3k linhas) — rápido, robusto, enxuto
  onProgress: ({ lidos, inseridos, supersalarios }) =>
    console.log(`  ... ${inseridos} gravados / ${supersalarios} supersalários (de ${lidos} lidos)`),
});

console.log(`  Status: ${res.status} | linhas ${res.totalLinhas} | gravados ${res.inseridos} | supersalários ${res.supersalarios}`);
if (res.erros.length) for (const e of res.erros.slice(0, 5)) console.log(`    erro: ${e}`);
if (res.status === "erro") process.exit(1);

// Histórico: como gravamos só supersalários (~2,3k linhas/mês), NÃO podamos —
// o histórico mês a mês é barato e útil. A view mg_remuneracao_atual já mostra
// só o snapshot mais recente. (Flag --keep-history mantida por compat; sem efeito.)
void prune;

console.log(`✓ Concluído em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
