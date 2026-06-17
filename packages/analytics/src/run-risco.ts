import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const sb = createClient(url, key);

// ── Normalização de nomes ────────────────────────────────────────────────────

function normNome(s: string): string {
  return s
    .toUpperCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos (combining marks)
    .replace(/\s+/g, " ")
    .trim();
}

// ── Tipos internos ───────────────────────────────────────────────────────────

interface Deputado {
  deputado_id: number;
  nome: string;
  sigla_partido: string | null;
  sigla_uf: string | null;
  url_foto: string | null;
  pct_presenca: number | null;
  concordancia_partido: number | null;
  cpf: string | null;
}

interface CeapRow {
  deputado_id: number;
  total_liquido: number;
  passagem_aerea: number;
  percentil: number;
}

interface TseRow {
  nm_candidato: string;
  total_receitas: number;
  fefc: number;
  fundo_partidario: number;
  recursos_proprios: number;
  percentil: number;
}

interface ProducaoRow {
  deputado_id: number;
  total: number;
  total_substantivo: number;
}

interface EmendaRow {
  autor_nome: string;
  valor_total: number;
  valor_rp9: number;
}

interface RiscoUpsert {
  deputado_id: number;
  nome: string;
  sigla_partido: string | null;
  sigla_uf: string | null;
  url_foto: string | null;
  cpf: string | null;
  score_total: number;
  dim_ceap: number;
  dim_presenca: number;
  dim_producao: number;
  dim_financiamento: number;
  dim_rp9: number;
  ceap_total_2024: number | null;
  passagens_aereas_2024: number | null;
  presenca_pct: number | null;
  concordancia_partido: number | null;
  total_proposicoes: number | null;
  total_substantivo: number | null;
  financiamento_total: number | null;
  financiamento_fefc: number | null;
  patrimonio_2022: number | null;
  fornecedores_sancionados: number;
  doadores_sancionados?: number; // owner = run-doadores-sancionados.ts
  atualizado_em: string;
}

// ── Queries paralelas ────────────────────────────────────────────────────────

async function loadDeputados(): Promise<Deputado[]> {
  // Carrega dados de votação + CPF (já enriquecido por run-cpf-enrich.ts em cam_parlamentar_risco)
  const { data: agg, error } = await sb
    .from("plen_deputado_agg")
    .select("deputado_id, nome, sigla_partido, sigla_uf, url_foto, pct_presenca, concordancia_partido")
    .eq("id_legislatura", 57);
  if (error) throw new Error(`loadDeputados: ${error.message}`);

  // Busca CPFs enriquecidos
  const { data: cpfRows } = await sb
    .from("cam_parlamentar_risco")
    .select("deputado_id, cpf")
    .not("cpf", "is", null);

  const cpfMap = new Map<number, string>();
  for (const r of (cpfRows ?? []) as { deputado_id: number; cpf: string }[]) {
    cpfMap.set(r.deputado_id, r.cpf);
  }

  return (agg ?? []).map((d) => ({
    ...(d as Omit<Deputado, "cpf">),
    cpf: cpfMap.get((d as { deputado_id: number }).deputado_id) ?? null,
  })) as Deputado[];
}

async function loadCeapPercentis(): Promise<Map<number, CeapRow>> {
  // Usar PERCENT_RANK para calcular percentil de cada deputado em 2024
  const { data, error } = await sb.rpc("exec_sql" as never, {
    sql: `
      SELECT
        deputado_id_externo::INT AS deputado_id,
        total_liquido,
        COALESCE((por_categoria->>'PASSAGEM AÉREA - SIGEPA')::NUMERIC, 0) AS passagem_aerea,
        ROUND(PERCENT_RANK() OVER (ORDER BY total_liquido) * 100, 1) AS percentil
      FROM ceaps_ranking
      WHERE ano = 2024
    `,
  });

  // Se RPC não existe, fazer a query normal e calcular percentil em memória
  if (error) {
    console.log("  RPC exec_sql indisponível — calculando percentis CEAP em memória");
    const { data: rows, error: e2 } = await sb
      .from("ceaps_ranking")
      .select("deputado_id_externo, total_liquido, por_categoria")
      .eq("ano", 2024)
      .order("total_liquido", { ascending: true });

    if (e2) throw new Error(`loadCeapPercentis: ${e2.message}`);

    const all = (rows ?? []) as Array<{
      deputado_id_externo: string;
      total_liquido: number;
      por_categoria: Record<string, number> | null;
    }>;

    const n = all.length;
    const map = new Map<number, CeapRow>();
    all.forEach((r, idx) => {
      const depId = parseInt(r.deputado_id_externo, 10);
      if (isNaN(depId)) return;
      const percentil = n > 1 ? Math.round((idx / (n - 1)) * 100 * 10) / 10 : 0;
      const passagem = r.por_categoria?.["PASSAGEM AÉREA - SIGEPA"] ?? 0;
      map.set(depId, {
        deputado_id: depId,
        total_liquido: r.total_liquido,
        passagem_aerea: passagem,
        percentil,
      });
    });
    return map;
  }

  const map = new Map<number, CeapRow>();
  for (const r of (data ?? []) as CeapRow[]) {
    map.set(r.deputado_id, r);
  }
  return map;
}

async function loadTsePercentis(): Promise<{ byCpf: Map<string, TseRow>; byNome: Map<string, TseRow>; byCpfToSq: Map<string, string> }> {
  // Busca todos candidatos a deputado federal 2022 (paginado — pode ter >1000 registros)
  type TseRaw = {
    sq_candidato: string;
    nm_candidato: string;
    nr_cpf_candidato: string;
    total_receitas: number;
    fefc: number;
    fundo_partidario: number;
    recursos_proprios: number;
  };

  const PAGE = 1000;
  const all: TseRaw[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await sb
      .from("tse_candidatos_receitas_agg")
      .select("sq_candidato, nm_candidato, nr_cpf_candidato, total_receitas, fefc, fundo_partidario, recursos_proprios")
      .eq("cd_cargo", 6)
      .eq("ano_eleicao", 2022)
      .order("total_receitas", { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`loadTsePercentis: ${error.message}`);
    const rows = (data ?? []) as TseRaw[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  const n = all.length;
  const byCpf = new Map<string, TseRow>();
  const byNome = new Map<string, TseRow>();
  const byCpfToSq = new Map<string, string>();

  all.forEach((r, idx) => {
    const percentil = n > 1 ? Math.round((idx / (n - 1)) * 100 * 10) / 10 : 0;
    const row: TseRow = {
      nm_candidato: r.nm_candidato,
      total_receitas: r.total_receitas,
      fefc: r.fefc ?? 0,
      fundo_partidario: r.fundo_partidario ?? 0,
      recursos_proprios: r.recursos_proprios ?? 0,
      percentil,
    };
    // Indexa por CPF (prioridade) e por nome normalizado (fallback)
    const cpf = String(r.nr_cpf_candidato ?? "").replace(/\D/g, "").trim();
    if (cpf && cpf.length === 11) {
      byCpf.set(cpf, row);
      if (r.sq_candidato) byCpfToSq.set(cpf, String(r.sq_candidato));
    }
    byNome.set(normNome(r.nm_candidato), row);
  });

  return { byCpf, byNome, byCpfToSq };
}

async function loadPatrimonio2022(): Promise<Map<string, number>> {
  const PAGE = 1000;
  const map = new Map<string, number>();
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("tse_bens_agg")
      .select("sq_candidato, total_patrimonio")
      .eq("ano_eleicao", 2022)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`loadPatrimonio2022: ${error.message}`);
    const rows = (data ?? []) as Array<{ sq_candidato: string; total_patrimonio: number | null }>;
    for (const r of rows) {
      if (r.sq_candidato != null && r.total_patrimonio != null) {
        map.set(String(r.sq_candidato), Number(r.total_patrimonio));
      }
    }
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return map;
}

async function loadProducao(): Promise<Map<number, ProducaoRow>> {
  const { data, error } = await sb
    .from("cam_proposicoes_agg")
    .select("deputado_id, total, total_substantivo");
  if (error) throw new Error(`loadProducao: ${error.message}`);

  const map = new Map<number, ProducaoRow>();
  for (const r of (data ?? []) as ProducaoRow[]) {
    map.set(r.deputado_id, r);
  }
  return map;
}

async function loadEmendas(): Promise<Map<string, EmendaRow>> {
  // Agrupa emendas individuais por autor: total e quanto é RP9
  const { data, error } = await sb
    .from("emendas_completas")
    .select("autor_nome, eh_rp9, valor_empenhado")
    .ilike("tipo_emenda", "%individual%");

  if (error) throw new Error(`loadEmendas: ${error.message}`);

  const map = new Map<string, EmendaRow>();
  for (const r of (data ?? []) as Array<{
    autor_nome: string;
    eh_rp9: boolean;
    valor_empenhado: number;
  }>) {
    const key = normNome(r.autor_nome);
    const cur = map.get(key) ?? { autor_nome: r.autor_nome, valor_total: 0, valor_rp9: 0 };
    cur.valor_total += r.valor_empenhado ?? 0;
    if (r.eh_rp9) cur.valor_rp9 += r.valor_empenhado ?? 0;
    map.set(key, cur);
  }
  return map;
}

// ── Cálculo de score ─────────────────────────────────────────────────────────

const PESOS = {
  dim_ceap: 0.30,
  dim_presenca: 0.20,
  dim_producao: 0.15,
  dim_financiamento: 0.20,
  dim_rp9: 0.15,
};

function calcScore(dims: {
  dim_ceap: number;
  dim_presenca: number;
  dim_producao: number;
  dim_financiamento: number;
  dim_rp9: number;
}): number {
  const raw =
    dims.dim_ceap * PESOS.dim_ceap +
    dims.dim_presenca * PESOS.dim_presenca +
    dims.dim_producao * PESOS.dim_producao +
    dims.dim_financiamento * PESOS.dim_financiamento +
    dims.dim_rp9 * PESOS.dim_rp9;
  return Math.round(raw * 10) / 10;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

// ── Upsert em lotes ──────────────────────────────────────────────────────────

async function upsertLote(rows: RiscoUpsert[]): Promise<void> {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .upsert(rows, { onConflict: "deputado_id" });
  if (error) throw new Error(`upsertLote: ${error.message}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const inicio = Date.now();
console.log("▶ G5 — Score de Risco Composto");

const [deputados, ceapMap, tseResult, patrimSqMap, producaoMap, emendasMap] = await Promise.all([
  loadDeputados(),
  loadCeapPercentis(),
  loadTsePercentis(),
  loadPatrimonio2022(),
  loadProducao(),
  loadEmendas(),
]);

const tseByCpf = tseResult.byCpf;
const tseByNome = tseResult.byNome;

// Combina sq_candidato→cpf (tse_candidatos_receitas_agg) com sq_candidato→patrimonio (tse_bens_agg)
const cpfToPatrim = new Map<string, number>();
for (const [cpf, sq] of tseResult.byCpfToSq) {
  const v = patrimSqMap.get(sq);
  if (v != null) cpfToPatrim.set(cpf, v);
}

console.log(`  Deputados: ${deputados.length}`);
console.log(`  CEAP 2024: ${ceapMap.size} registros`);
console.log(`  TSE 2022:  ${tseByCpf.size} candidatos (por CPF) / ${tseByNome.size} (por nome)`);
console.log(`  Patrimônios 2022: ${patrimSqMap.size} candidatos (TSE) / ${cpfToPatrim.size} com CPF`);
console.log(`  Proposicoes: ${producaoMap.size} registros`);
console.log(`  Emendas individuais: ${emendasMap.size} autores`);

const agora = new Date().toISOString();
const batch: RiscoUpsert[] = [];
let matchCeap = 0, matchTse = 0, matchEmendas = 0, matchPatrim = 0;

for (const dep of deputados) {
  // — CEAP
  const ceap = ceapMap.get(dep.deputado_id);
  if (ceap) matchCeap++;
  const dim_ceap = clamp(ceap?.percentil ?? 0);

  // — Presença
  const presenca = dep.pct_presenca ?? 100;
  const dim_presenca = clamp(100 - presenca);

  // — Produção legislativa
  const prod = producaoMap.get(dep.deputado_id);
  let dim_producao = 50; // neutro se sem dados
  if (prod && prod.total > 0) {
    const pct_procedural = ((prod.total - prod.total_substantivo) / prod.total) * 100;
    dim_producao = clamp(pct_procedural);
  }

  // — Financiamento TSE (match por CPF → fallback por nome)
  const nomeNorm = normNome(dep.nome);
  const tse = (dep.cpf ? tseByCpf.get(dep.cpf) : undefined) ?? tseByNome.get(nomeNorm);
  if (tse) matchTse++;
  const dim_financiamento = clamp(tse?.percentil ?? 0);

  // — Emendas RP9 (match por nome — prefixo)
  // Tentar nome exato primeiro, depois prefixo
  const emenda = emendasMap.get(nomeNorm);
  if (emenda) matchEmendas++;
  let dim_rp9 = 0;
  if (emenda && emenda.valor_total > 0) {
    dim_rp9 = clamp((emenda.valor_rp9 / emenda.valor_total) * 100);
  }

  const dims = { dim_ceap, dim_presenca, dim_producao, dim_financiamento, dim_rp9 };
  const score_total = calcScore(dims);

  const patrimonio_2022 = dep.cpf ? (cpfToPatrim.get(dep.cpf) ?? null) : null;
  if (patrimonio_2022 != null) matchPatrim++;

  batch.push({
    deputado_id: dep.deputado_id,
    nome: dep.nome,
    sigla_partido: dep.sigla_partido,
    sigla_uf: dep.sigla_uf,
    url_foto: dep.url_foto,
    cpf: dep.cpf ?? null,
    score_total,
    ...dims,
    ceap_total_2024: ceap?.total_liquido ?? null,
    passagens_aereas_2024: ceap?.passagem_aerea ?? null,
    presenca_pct: dep.pct_presenca ?? null,
    concordancia_partido: dep.concordancia_partido ?? null,
    total_proposicoes: prod?.total ?? null,
    total_substantivo: prod?.total_substantivo ?? null,
    financiamento_total: tse?.total_receitas ?? null,
    financiamento_fefc: tse?.fefc ?? null,
    patrimonio_2022,
    fornecedores_sancionados: 0,
    atualizado_em: agora,
  });
}

// Upsert em lotes de 100
const LOTE = 100;
for (let i = 0; i < batch.length; i += LOTE) {
  const slice = batch.slice(i, i + LOTE);
  await upsertLote(slice);
  process.stdout.write(`\r  Upserting... ${Math.min(i + LOTE, batch.length)}/${batch.length}`);
}
console.log();

const duracao = Date.now() - inicio;
console.log(`\n✅ Score de Risco calculado em ${duracao}ms`);
console.log(`   Deputados processados: ${batch.length}`);
console.log(`   Match CEAP:       ${matchCeap}/${batch.length} (${Math.round(matchCeap / batch.length * 100)}%)`);
console.log(`   Match TSE:        ${matchTse}/${batch.length} (${Math.round(matchTse / batch.length * 100)}%)`);
console.log(`   Match Patrimônio: ${matchPatrim}/${batch.length} (${Math.round(matchPatrim / batch.length * 100)}%)`);
console.log(`   Match Emendas:    ${matchEmendas}/${batch.length} (${Math.round(matchEmendas / batch.length * 100)}%)`);
