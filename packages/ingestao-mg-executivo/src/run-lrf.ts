/**
 * CLI: ingere LRF — despesa de pessoal do Executivo MG (flat, dois arquivos).
 *   npm run ingestao-mg:lrf
 * Agregado de contexto: macro fiscal, sem favorecidos.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { carregarCSV, colFinder, flushUpsert, finalizar } from "./ingest-util.js";
import { parseValorBR } from "./csv.js";

const DS = "d3a0711b-eb56-4863-95c8-3bf080d5fcc1";
const URL_PESSOAL = `https://dados.mg.gov.br/dataset/${DS}/resource/cb05125e-e879-420f-9bf6-0fcbc75bbc8e/download/despesa_pessoal_mensal.csv`;
const URL_LIMITES = `https://dados.mg.gov.br/dataset/${DS}/resource/1671e0ee-6ef4-4cf0-a9f0-702df49b2428/download/limites_lrf.csv`;

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios."); process.exit(1); }

const MESES: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};
/** "jan-22" → { ano: 2022, mes: 1 }. */
function parseMesAno(s: string): { ano: number | null; mes: number | null } {
  const m = (s ?? "").trim().toLowerCase().match(/([a-z]{3})\D+(\d{2,4})/);
  if (!m) return { ano: null, mes: null };
  const mes = MESES[m[1]] ?? null;
  let ano = parseInt(m[2], 10);
  if (ano < 100) ano += 2000;
  return { ano: Number.isFinite(ano) ? ano : null, mes };
}
const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
const client = createClient(url, key, { auth: { persistSession: false } });

// ── 1. Despesa de pessoal mensal ──────────────────────────────────────────
async function ingestPessoal() {
  console.log("▶ LRF — despesa de pessoal mensal");
  const { header, linhas } = await carregarCSV(URL_PESSOAL, "utf-8");
  const c = colFinder(header);
  const C = {
    mesAno: c("mes_ano"),
    bruta: c("despesa_bruta_com_pessoal_i", "despesa_bruta_com_pessoal"),
    ativo: c("pessoal_ativo"),
    inativo: c("pessoal_inativo_e_pensionistas"),
    terc: c("outras_despesas_terceirizacoes"),
    liquida: c("despesa_liquida_pessoal"),
  };
  const erros: string[] = [];
  let inseridos = 0;
  let buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const mesAno = at(l, C.mesAno);
    if (!mesAno) continue;
    const { ano, mes } = parseMesAno(mesAno);
    buffer.push({
      mes_ano: mesAno,
      ano, mes,
      despesa_bruta: parseValorBR(at(l, C.bruta)),
      pessoal_ativo: parseValorBR(at(l, C.ativo)),
      pessoal_inativo: parseValorBR(at(l, C.inativo)),
      terceirizacoes: parseValorBR(at(l, C.terc)),
      despesa_liquida: parseValorBR(at(l, C.liquida)),
    });
    if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_lrf_pessoal", "mes_ano", buffer, erros); buffer = []; }
  }
  inseridos += await flushUpsert(client, "mg_lrf_pessoal", "mes_ano", buffer, erros);
  const r = finalizar(linhas.length, inseridos, erros, header);
  console.log(`  pessoal: status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
  for (const e of r.erros.slice(0, 3)) console.log(`  erro: ${e}`);
  if (r.status === "erro") console.log(`  header: ${header.join(" | ")}`);
  return r.status !== "erro";
}

// ── 2. Limites LRF (janela móvel 12m) ──────────────────────────────────────
async function ingestLimites() {
  console.log("▶ LRF — limites (DTP x RCL)");
  const { header, linhas } = await carregarCSV(URL_LIMITES, "utf-8");
  const c = colFinder(header);
  const C = {
    periodo: c("mes_ano_a_mes_ano", "periodo"),
    rcl: c("rcl"),
    rclAj: c("rcl_ajustada"),
    dtp: c("dtp_rcl", "dtp"),
    max: c("limite_maximo"),
    prud: c("limite_prudencial"),
    alerta: c("limite_alerta"),
  };
  const erros: string[] = [];
  let inseridos = 0;
  const buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const periodo = at(l, C.periodo);
    if (!periodo) continue;
    const anos = periodo.match(/\d{4}/g);
    const anoRef = anos && anos.length ? parseInt(anos[anos.length - 1], 10) : null;
    buffer.push({
      periodo,
      ano_ref: anoRef,
      rcl: parseValorBR(at(l, C.rcl)),
      rcl_ajustada: parseValorBR(at(l, C.rclAj)),
      dtp: parseValorBR(at(l, C.dtp)),
      limite_maximo: parseValorBR(at(l, C.max)),
      limite_prudencial: parseValorBR(at(l, C.prud)),
      limite_alerta: parseValorBR(at(l, C.alerta)),
    });
  }
  inseridos += await flushUpsert(client, "mg_lrf_limites", "periodo", buffer, erros);
  const r = finalizar(linhas.length, inseridos, erros, header);
  console.log(`  limites: status ${r.status} | linhas ${r.total} | gravados ${r.inseridos}`);
  for (const e of r.erros.slice(0, 3)) console.log(`  erro: ${e}`);
  if (r.status === "erro") console.log(`  header: ${header.join(" | ")}`);
  return r.status !== "erro";
}

const ok1 = await ingestPessoal();
const ok2 = await ingestLimites();
if (!ok1 || !ok2) process.exit(1);
console.log("✓ LRF concluída");
