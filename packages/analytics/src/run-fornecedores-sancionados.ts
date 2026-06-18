/**
 * run-fornecedores-sancionados.ts
 * Cruza fornecedores de CEAP (ceaps_brutas.cnpj_cpf_fornecedor) com
 * portal_sancionados e atualiza fornecedores_sancionados em
 * cam_parlamentar_risco. Zero ingestão nova — usa dados já existentes no banco.
 *
 * Por que só CEAP? emendas_completas não expõe cnpj_favorecido em coluna
 * dedicada (só autor_nome + valores); o linker emendas_favorecidos existe
 * apenas em view e não tem CREATE TABLE versionado nas migrations. Quando
 * essa fonte for incorporada, o cruzamento pode crescer aqui via UNION
 * mantendo o mesmo Set<cnpj> por deputado.
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

console.log("▶ Cruzamento fornecedores CEAP × sancionados CEIS/CNEP");

function normCnpj(s: unknown): string {
  return String(s ?? "").replace(/\D/g, "");
}

// 1. Carrega todos os sancionados paginado (22k+ registros, supera o limite de 1000 do PostgREST)
const sancSet = new Set<string>();
{
  let sfrom = 0;
  const SPAGE = 1000;
  while (true) {
    const { data, error } = await sb
      .from("portal_sancionados")
      .select("cpf_cnpj")
      .range(sfrom, sfrom + SPAGE - 1);
    if (error) throw new Error(`portal_sancionados: ${error.message}`);
    for (const s of (data ?? []) as { cpf_cnpj: string }[]) {
      sancSet.add(normCnpj(s.cpf_cnpj));
    }
    if ((data ?? []).length < SPAGE) break;
    sfrom += SPAGE;
  }
}
console.log(`  Sancionados carregados: ${sancSet.size}`);

// 2. Conta total de deputados em cam_parlamentar_risco (para o passo de zeragem)
const { count: totalDeputados, error: e2 } = await sb
  .from("cam_parlamentar_risco")
  .select("deputado_id", { count: "exact", head: true });
if (e2) throw new Error(`cam_parlamentar_risco: ${e2.message}`);
console.log(`  Deputados em cam_parlamentar_risco: ${totalDeputados ?? 0}`);

// 3. Carrega ceaps_brutas via cursor pagination por id (PK uuid, indexed).
//    Offset-based pagination é O(N) no PostgreSQL — a 100k+ rows estoura o
//    statement_timeout. Cursor por id é O(log N) independente do tamanho.
type CeapRow = { id: string; deputado_id_externo: string; cnpj_cpf_fornecedor: string | null };

const PAGE = 1000;
const porDeputado = new Map<number, Set<string>>(); // deputado_id → CNPJs sancionados únicos
let totalLidos = 0;
let totalMatches = 0;
let lastId: string | null = null;

while (true) {
  let query = sb
    .from("ceaps_brutas")
    .select("id, deputado_id_externo, cnpj_cpf_fornecedor")
    .not("cnpj_cpf_fornecedor", "is", null)
    .order("id", { ascending: true })
    .limit(PAGE);

  if (lastId !== null) query = query.gt("id", lastId);

  const { data, error } = await query;
  if (error) throw new Error(`ceaps_brutas cursor ${lastId ?? "start"}: ${error.message}`);
  const rows = (data ?? []) as CeapRow[];
  totalLidos += rows.length;

  for (const r of rows) {
    const cnpj = normCnpj(r.cnpj_cpf_fornecedor);
    if (cnpj.length !== 14) continue; // só PJ; ignora CPF de pessoa física
    if (!sancSet.has(cnpj)) continue;

    const depId = parseInt(String(r.deputado_id_externo), 10);
    if (!Number.isFinite(depId)) continue;

    if (!porDeputado.has(depId)) porDeputado.set(depId, new Set());
    porDeputado.get(depId)!.add(cnpj);
    totalMatches++;
  }

  if (rows.length > 0) lastId = rows[rows.length - 1].id;
  process.stdout.write(`\r  Lendo ceaps_brutas... ${totalLidos} rows, ${totalMatches} matches`);
  if (rows.length < PAGE) break;
}
console.log();
console.log(`\n  CEAP lido: ${totalLidos} rows, ${totalMatches} matches de fornecedor sancionado`);
console.log(`  Deputados com fornecedor sancionado: ${porDeputado.size}`);

if (porDeputado.size > 0) {
  console.log("  Top 10 deputados por fornecedores sancionados únicos:");
  const top = [...porDeputado.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 10);
  for (const [depId, cnpjs] of top) {
    console.log(`    deputado_id=${depId}: ${cnpjs.size} fornecedor(es) sancionado(s)`);
  }
}

// 4. Atualiza cam_parlamentar_risco.fornecedores_sancionados
let atualizados = 0;
for (const [depId, cnpjs] of porDeputado) {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .update({ fornecedores_sancionados: cnpjs.size, atualizado_em: new Date().toISOString() })
    .eq("deputado_id", depId);
  if (!error) atualizados++;
}

// 5. Zera os que não têm (para caso de re-run após remoção de sancionados)
const idsComMatch = [...porDeputado.keys()];
if (idsComMatch.length < (totalDeputados ?? 0)) {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .update({ fornecedores_sancionados: 0 })
    .not("deputado_id", "in", `(${idsComMatch.length > 0 ? idsComMatch.join(",") : "0"})`);
  if (error) console.warn("  Aviso ao zerar fornecedores_sancionados:", error.message);
}

const duracao = Date.now() - inicio;
console.log(`\n✅ Cruzamento concluído em ${duracao}ms`);
console.log(`   Deputados com fornecedores sancionados: ${porDeputado.size}`);
console.log(`   Registros atualizados: ${atualizados}`);
