/**
 * CLI: ingere Convênios de saída (ft_convenio × dm_convenente, star schema).
 * Repasses do Estado a entidades (ONGs, associações, municípios). Nomeado + CNPJ.
 *   npm run ingestao-mg:convenios
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR, normCNPJ } from "./csv.js";

const BASE = "https://dados.mg.gov.br/dataset/52fcf7e5-d9a6-4b17-a491-12a5a978aecd/resource";
const FT_URL = `${BASE}/d8b48c2b-c2ec-451a-99f0-0421987ceeba/download/ft_convenio.csv.gz`;
const DM_CONVENENTE_URL = `${BASE}/3b9d9df2-1a50-451d-bc7e-3a0b82fcf821/download/dm_convenente.csv.gz`;

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }

console.log("▶ Ingestão Convênios de saída (MG)");

// 1. dim convenente → mapa id → {nome, cnpj}
const dm = await carregarCSV(DM_CONVENENTE_URL, "utf-8");
const dc = colFinder(dm.header);
const dId = dc("id_convenente"), dDoc = dc("nr_documento"), dNome = dc("nome");
const convenentes = new Map<string, { nome: string; cnpj: string }>();
for (const l of dm.linhas) {
  const id = (l[dId] ?? "").trim();
  if (id) convenentes.set(id, { nome: (l[dNome] ?? "").trim(), cnpj: normCNPJ(l[dDoc]) });
}
console.log(`  dim convenente: ${convenentes.size} entidades`);

// 2. fato
const ft = await carregarCSV(FT_URL, "utf-8");
const fc = colFinder(ft.header);
const F = {
  conv: fc("id_convenio"), convenente: fc("id_convenente"), ano: fc("ano_particao"),
  orgao: fc("id_orgao"), municipio: fc("id_municipio"),
  vrTotal: fc("vr_total_atual"), vrConcede: fc("vr_concede_atual"), vrEmenda: fc("vr_emen_parl_atual"),
};
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");

const client = createClient(url, key, { auth: { persistSession: false } });
const erros: string[] = [];
let inseridos = 0;
let buffer: Record<string, unknown>[] = [];
for (const l of ft.linhas) {
  const conv = at(l, F.conv);
  if (!conv) continue;
  const ent = convenentes.get(at(l, F.convenente));
  buffer.push({
    convenio_id: conv,
    ano: Number(at(l, F.ano)) || null,
    orgao_id: at(l, F.orgao) || null,
    municipio_id: at(l, F.municipio) || null,
    convenente: ent?.nome || null,
    convenente_cnpj: ent?.cnpj || null,
    vr_total: parseValorBR(at(l, F.vrTotal)),
    vr_concede: parseValorBR(at(l, F.vrConcede)),
    vr_emenda_parl: parseValorBR(at(l, F.vrEmenda)),
  });
  if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_convenios", "convenio_id,ano", buffer, erros); buffer = []; }
}
inseridos += await flushUpsert(client, "mg_convenios", "convenio_id,ano", buffer, erros);
const r = finalizar(ft.linhas.length, inseridos, erros, ft.header);
console.log(`  status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
for (const e of r.erros.slice(0, 5)) console.log(`  erro: ${e}`);
if (r.status === "erro") { console.log(`  header ft: ${ft.header.join(" | ")}`); process.exit(1); }
