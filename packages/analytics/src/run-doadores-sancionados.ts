/**
 * run-doadores-sancionados.ts
 * Cruza top_doadores de TSE com portal_sancionados e atualiza
 * doadores_sancionados em cam_parlamentar_risco.
 * Zero ingestão nova — usa dados já existentes no banco.
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("Variáveis obrigatórias ausentes."); process.exit(1); }

const sb = createClient(url, key);
const inicio = Date.now();

console.log("▶ Cruzamento doadores TSE × sancionados CEIS/CNEP");

// 1. Carrega todos os sancionados ativos (CPF/CNPJ normalizados)
const { data: sancs, error: e1 } = await sb
  .from("portal_sancionados")
  .select("cpf_cnpj, nome, tipo_registro");

if (e1) throw new Error(`portal_sancionados: ${e1.message}`);
const sancSet = new Set((sancs ?? []).map((s: { cpf_cnpj: string }) => s.cpf_cnpj));
const sancMap = new Map((sancs ?? []).map((s: { cpf_cnpj: string; nome: string; tipo_registro: string }) =>
  [s.cpf_cnpj, s]
));
console.log(`  Sancionados carregados: ${sancSet.size}`);

// 2. Carrega CPFs dos deputados (cam_parlamentar_risco.cpf → join com TSE)
const { data: risco, error: e2 } = await sb
  .from("cam_parlamentar_risco")
  .select("deputado_id, cpf")
  .not("cpf", "is", null);

if (e2) throw new Error(`cam_parlamentar_risco: ${e2.message}`);
const cpfParaDeputado = new Map<string, number>();
for (const r of (risco ?? []) as { deputado_id: number; cpf: string }[]) {
  cpfParaDeputado.set(r.cpf, r.deputado_id);
}
console.log(`  Deputados com CPF: ${cpfParaDeputado.size}`);

// 3. Carrega top_doadores de candidatos a deputado federal 2022
//    (paginado — pode ser >1000)
type TseRow = { nr_cpf_candidato: string; top_doadores: Array<{ nome: string; total: number; cpf_cnpj: string }> };

const PAGE = 1000;
const allTse: TseRow[] = [];
let from = 0;
while (true) {
  const { data, error } = await sb
    .from("tse_candidatos_receitas_agg")
    .select("nr_cpf_candidato, top_doadores")
    .eq("cd_cargo", 6)
    .eq("ano_eleicao", 2022)
    .range(from, from + PAGE - 1);
  if (error) throw new Error(`tse_candidatos_receitas_agg: ${error.message}`);
  const rows = (data ?? []) as TseRow[];
  allTse.push(...rows);
  if (rows.length < PAGE) break;
  from += PAGE;
}
console.log(`  Candidatos TSE com doadores: ${allTse.length}`);

// 4. Cruzamento
type Match = { deputado_id: number; doador_cpf: string; doador_nome: string; total: number; tipo_sancao: string };
const matches: Match[] = [];
const porDeputado = new Map<number, Set<string>>(); // deputado_id → CPFs sancionados únicos

for (const cand of allTse) {
  const cpfCand = String(cand.nr_cpf_candidato ?? "").replace(/\D/g, "");
  const depId = cpfParaDeputado.get(cpfCand);
  if (!depId) continue; // não é deputado eleito atual

  const doadores = Array.isArray(cand.top_doadores) ? cand.top_doadores : [];
  for (const d of doadores) {
    const cpfDoador = String(d.cpf_cnpj ?? "").replace(/\D/g, "");
    if (!cpfDoador || !sancSet.has(cpfDoador)) continue;

    const sanc = sancMap.get(cpfDoador);
    matches.push({
      deputado_id: depId,
      doador_cpf: cpfDoador,
      doador_nome: d.nome,
      total: d.total,
      tipo_sancao: sanc?.tipo_registro ?? "",
    });

    if (!porDeputado.has(depId)) porDeputado.set(depId, new Set());
    porDeputado.get(depId)!.add(cpfDoador);
  }
}

console.log(`\n  Deputados com doadores sancionados: ${porDeputado.size}`);
if (matches.length > 0) {
  console.log("  Matches encontrados:");
  for (const [depId, cpfs] of porDeputado) {
    console.log(`    deputado_id=${depId}: ${cpfs.size} doador(es) sancionado(s)`);
  }
}

// 5. Atualiza cam_parlamentar_risco.doadores_sancionados
let atualizados = 0;
for (const [depId, cpfs] of porDeputado) {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .update({ doadores_sancionados: cpfs.size, atualizado_em: new Date().toISOString() })
    .eq("deputado_id", depId);
  if (!error) atualizados++;
}

// Zera os que não têm (para caso de re-run após remoção de sancionados)
const idsComMatch = [...porDeputado.keys()];
if (idsComMatch.length < (risco ?? []).length) {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .update({ doadores_sancionados: 0 })
    .not("deputado_id", "in", `(${idsComMatch.length > 0 ? idsComMatch.join(",") : "0"})`);
  if (error) console.warn("  Aviso ao zerar doadores_sancionados:", error.message);
}

const duracao = Date.now() - inicio;
console.log(`\n✅ Cruzamento concluído em ${duracao}ms`);
console.log(`   Deputados com doadores sancionados: ${porDeputado.size}`);
console.log(`   Registros atualizados: ${atualizados}`);
