/**
 * run-migrate-judiciario.ts
 *
 * Fase 2 da unificação do Observatório Judiciário no banco canônico TF.
 * Lê do projeto Supabase legado (corklqwtrblervixxtan) e escreve nas
 * tabelas criadas pela migration 20260524000000_create_judiciario_schema.sql
 * no projeto canônico (redggdtakzmsabwvjzhb).
 *
 * Idempotente: upsert por `identificador_externo` em processos e por
 * (semana_referencia, posicao) em highlights. Pode rodar várias vezes.
 *
 * Pré-condições:
 *   1. Migration canônica `20260524000000_create_judiciario_schema.sql` já aplicada.
 *   2. `.env` na raiz contém:
 *        SUPABASE_URL                              (destino — TF canônico)
 *        SUPABASE_SERVICE_ROLE_KEY                 (destino)
 *        JUDICIARIO_LEGACY_SUPABASE_URL            (origem — corklqwtrblervixxtan)
 *        JUDICIARIO_LEGACY_SERVICE_ROLE_KEY        (origem)
 *
 * Estratégia:
 *   - UUIDs preservados (`id` do processo é re-inserido tal qual).
 *     Garante que `highlights.processo_id` continua referenciando depois.
 *   - `tribunal` (text) → `tribunal_id` (FK) via lookup no destino.
 *   - Tribunais sem match no destino: linha pulada com warning (raro — só
 *     se a sigla do legado divergir do seed canônico).
 *   - Refresh das 4 MVs no fim.
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEST_URL = process.env.SUPABASE_URL ?? "";
const DEST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const SRC_URL  = process.env.JUDICIARIO_LEGACY_SUPABASE_URL ?? "";
const SRC_KEY  = process.env.JUDICIARIO_LEGACY_SERVICE_ROLE_KEY ?? "";

if (!DEST_URL || !DEST_KEY) {
  console.error("✖ SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios (destino).");
  process.exit(1);
}
if (!SRC_URL || !SRC_KEY) {
  console.error("✖ JUDICIARIO_LEGACY_SUPABASE_URL e JUDICIARIO_LEGACY_SERVICE_ROLE_KEY são obrigatórios (origem).");
  process.exit(1);
}
if (DEST_URL === SRC_URL) {
  console.error("✖ Origem e destino apontam pro mesmo projeto. Abortando pra não corromper dados.");
  process.exit(1);
}

const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
const dst = createClient(DEST_URL, DEST_KEY, { auth: { persistSession: false } });

const BATCH = 500;
const inicio = Date.now();

// ─── 1. Lookup tribunal sigla → tribunal_id (destino) ─────────────────────
console.log("▶ Carregando lookup de tribunais (destino)…");
const { data: tribunais, error: errT } = await dst
  .from("tribunais")
  .select("id, sigla");

if (errT) {
  console.error(`✖ Erro ao ler tribunais no destino: ${errT.message}`);
  console.error("   Aplicou a migration 20260524000000_create_judiciario_schema.sql?");
  process.exit(1);
}

const siglaParaId = new Map<string, number>(
  (tribunais ?? []).map((t) => [t.sigla as string, t.id as number])
);
console.log(`  ${siglaParaId.size} tribunais carregados.`);

// ─── 2. Migração processos (paginação 1000/req → batch 500/upsert) ────────

interface ProcessoLegacy {
  id: string;
  tribunal: string;
  classe: string | null;
  numero_processo: string;
  relator: string | null;
  orgao_julgador: string | null;
  tipo_decisao: string | null;
  data_decisao: string | null;
  tema: string | null;
  ementa: string | null;
  link_oficial: string | null;
  fonte: string | null;
  identificador_externo: string;
  metadata: Record<string, unknown> | null;
  data_coleta: string | null;
}

interface ProcessoCanonico {
  id: string;
  tribunal_id: number;
  identificador_externo: string;
  numero_processo: string;
  classe: string | null;
  relator: string | null;
  orgao_julgador: string | null;
  tipo_decisao: string | null;
  data_decisao: string | null;
  tema: string | null;
  ementa: string | null;
  link_oficial: string | null;
  fonte: string;
  metadata: Record<string, unknown> | null;
  data_coleta: string;
}

console.log("\n▶ Migração processos…");

// 2a. Conta total na origem (best-effort — Supabase HEAD count)
const { count: totalSrc } = await src
  .from("processos")
  .select("*", { count: "exact", head: true });
console.log(`  Total na origem: ${totalSrc ?? "?"}`);

let offset = 0;
let migrados = 0;
let pulados = 0;
let identificadoresSintetizados = 0;
const tribunaisDesconhecidos = new Set<string>();

while (true) {
  const { data: lote, error } = await src
    .from("processos")
    .select("*")
    .order("data_coleta", { ascending: true, nullsFirst: true })
    .range(offset, offset + 999);

  if (error) {
    console.error(`✖ Erro ao ler processos offset=${offset}: ${error.message}`);
    process.exit(1);
  }
  if (!lote || lote.length === 0) break;

  const rows: ProcessoCanonico[] = [];
  for (const p of lote as ProcessoLegacy[]) {
    const tribunal_id = siglaParaId.get(p.tribunal?.toUpperCase());
    if (!tribunal_id) {
      tribunaisDesconhecidos.add(p.tribunal);
      pulados++;
      continue;
    }
    // Fallback: alguns registros legados (pré-padronização do sync-datajud)
    // têm identificador_externo NULL. O UUID interno é único, então
    // `legacy-<uuid>` satisfaz o UNIQUE no destino sem colidir com IDs
    // novos (que seguem o padrão `<sigla>-<datajud_id>`).
    let identificador = p.identificador_externo;
    if (!identificador) {
      identificador = `legacy-${p.id}`;
      identificadoresSintetizados++;
    }

    rows.push({
      id: p.id,
      tribunal_id,
      identificador_externo: identificador,
      numero_processo: p.numero_processo,
      classe: p.classe,
      relator: p.relator,
      orgao_julgador: p.orgao_julgador,
      tipo_decisao: p.tipo_decisao,
      data_decisao: p.data_decisao,
      tema: p.tema,
      ementa: p.ementa,
      link_oficial: p.link_oficial,
      fonte: p.fonte ?? "datajud",
      metadata: p.metadata,
      data_coleta: p.data_coleta ?? new Date().toISOString(),
    });
  }

  // Upsert em sub-lotes de BATCH
  for (let i = 0; i < rows.length; i += BATCH) {
    const sub = rows.slice(i, i + BATCH);
    const { error: errU } = await dst
      .from("judiciario_processos")
      .upsert(sub, { onConflict: "identificador_externo", ignoreDuplicates: false });
    if (errU) {
      console.error(`✖ Erro ao upsert processos (offset=${offset}, sub=${i}): ${errU.message}`);
      process.exit(1);
    }
    migrados += sub.length;
  }

  const pct = totalSrc ? ((migrados / totalSrc) * 100).toFixed(1) : "?";
  console.log(`  +${lote.length} lidos · ${migrados} migrados · ${pulados} pulados · ${pct}%`);

  if (lote.length < 1000) break;
  offset += 1000;
}

if (tribunaisDesconhecidos.size > 0) {
  console.warn(`⚠ Tribunais sem match no destino (${tribunaisDesconhecidos.size}): ${[...tribunaisDesconhecidos].join(", ")}`);
  console.warn(`  ${pulados} linhas puladas. Adicione esses tribunais ao seed da migration se forem válidos.`);
}

console.log(`\n  ✓ processos: ${migrados} migrados, ${pulados} pulados, ${identificadoresSintetizados} com identificador_externo sintetizado (legacy-<uuid>).`);

// ─── 3. Migração highlights ─────────────────────────────────────────────

interface HighlightLegacy {
  id: string;
  titulo_curto: string;
  resumo: string;
  tribunal: string | null;
  tema: string | null;
  link_externo: string | null;
  posicao: number;
  semana_referencia: string;
  processo_id: string | null;
  ativo?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface HighlightCanonico {
  id: string;
  titulo_curto: string;
  resumo: string;
  tribunal_id: number | null;
  tema: string | null;
  link_externo: string | null;
  posicao: number;
  semana_referencia: string;
  processo_id: string | null;
  ativo: boolean;
  created_at?: string;
  updated_at?: string;
}

console.log("\n▶ Migração highlights…");

const { data: hls, error: errH } = await src.from("highlights").select("*");
if (errH) {
  console.error(`✖ Erro ao ler highlights: ${errH.message}`);
  process.exit(1);
}

const hlsLote = (hls ?? []) as HighlightLegacy[];
console.log(`  Total na origem: ${hlsLote.length}`);

const hlsCanonicos: HighlightCanonico[] = [];
let hlsPulados = 0;

for (const h of hlsLote) {
  let tribunal_id: number | null = null;
  if (h.tribunal) {
    const tid = siglaParaId.get(h.tribunal.toUpperCase());
    if (!tid) {
      hlsPulados++;
      continue;
    }
    tribunal_id = tid;
  }
  hlsCanonicos.push({
    id: h.id,
    titulo_curto: h.titulo_curto,
    resumo: h.resumo,
    tribunal_id,
    tema: h.tema,
    link_externo: h.link_externo,
    posicao: h.posicao,
    semana_referencia: h.semana_referencia,
    processo_id: h.processo_id,
    ativo: h.ativo ?? true,
    created_at: h.created_at,
    updated_at: h.updated_at,
  });
}

if (hlsCanonicos.length > 0) {
  const { error: errUH } = await dst
    .from("judiciario_highlights")
    .upsert(hlsCanonicos, { onConflict: "semana_referencia,posicao", ignoreDuplicates: false });
  if (errUH) {
    console.error(`✖ Erro ao upsert highlights: ${errUH.message}`);
    process.exit(1);
  }
}

console.log(`  ✓ highlights: ${hlsCanonicos.length} migrados, ${hlsPulados} pulados.`);

// ─── 4. Refresh das materialized views ──────────────────────────────────

console.log("\n▶ Refresh judiciario_stats_*…");
const { error: errR } = await dst.rpc("refresh_judiciario_stats");
if (errR) {
  console.error(`⚠ Refresh falhou: ${errR.message}`);
  console.error("  Rode manualmente depois: SELECT public.refresh_judiciario_stats();");
} else {
  console.log("  ✓ MVs atualizadas.");
}

// ─── 5. Smoke test final ────────────────────────────────────────────────

const { count: destCount } = await dst
  .from("judiciario_processos")
  .select("*", { count: "exact", head: true });

const { data: porTrib } = await dst
  .from("judiciario_stats_por_tribunal")
  .select("tribunal, total")
  .order("total", { ascending: false })
  .limit(10);

console.log("\n▶ Smoke test destino:");
console.log(`  Total judiciario_processos: ${destCount ?? "?"}`);
console.log(`  Top tribunais por volume:`);
for (const r of (porTrib ?? []) as { tribunal: string; total: number }[]) {
  console.log(`    ${r.tribunal.padEnd(6)}  ${r.total.toLocaleString("pt-BR")}`);
}

const segundos = Math.round((Date.now() - inicio) / 1000);
console.log(`\n✔ Migração concluída em ${Math.floor(segundos / 60)}m${segundos % 60}s.`);
