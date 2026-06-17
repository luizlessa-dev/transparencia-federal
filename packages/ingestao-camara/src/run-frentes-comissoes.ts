/**
 * run-frentes-comissoes.ts
 * Ingere frentes parlamentares (57ª leg.) e comissões permanentes da Câmara.
 * Popula: cam_frentes, cam_frentes_membros, cam_comissoes, cam_comissoes_membros
 * e atualiza contadores em cam_parlamentar_risco.
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
const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const THROTTLE = 150;
const h = { Accept: "application/json" };

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchJSON<T>(urlStr: string): Promise<T | null> {
  try {
    const r = await fetch(urlStr, { headers: h, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return null;
    const j = await r.json() as { dados?: T };
    return j.dados ?? null;
  } catch {
    return null;
  }
}

// ── Paginação genérica ────────────────────────────────────────────────────────

async function paginarCamara<T>(path: string, extra = ""): Promise<T[]> {
  const all: T[] = [];
  let pagina = 1;
  while (true) {
    const data = await fetchJSON<T[]>(`${CAMARA}${path}?itens=100&pagina=${pagina}${extra}`);
    if (!data || !Array.isArray(data) || data.length === 0) break;
    all.push(...data);
    if (data.length < 100) break;
    pagina++;
    await sleep(THROTTLE);
  }
  return all;
}

// ── FRENTES ──────────────────────────────────────────────────────────────────

const inicio = Date.now();
console.log("▶ Ingestão: Frentes Parlamentares + Comissões");

console.log("\n[Frentes] Buscando lista da 57ª legislatura...");
const frentes = await paginarCamara<{ id: number; titulo: string; idLegislatura: number }>(
  "/frentes", "&idLegislatura=57"
);
console.log(`  ${frentes.length} frentes encontradas`);

// Upsert frentes
if (frentes.length > 0) {
  const { error } = await sb.from("cam_frentes").upsert(
    frentes.map((f) => ({ id: f.id, titulo: f.titulo, id_legislatura: f.idLegislatura ?? 57, atualizado_em: new Date().toISOString() })),
    { onConflict: "id" }
  );
  if (error) throw new Error(`upsert cam_frentes: ${error.message}`);
}

// Busca membros de cada frente
let totalMembros = 0;
const frentesDeputado = new Map<number, number>(); // deputado_id → contagem de frentes

for (let i = 0; i < frentes.length; i++) {
  const fr = frentes[i];
  await sleep(THROTTLE);

  const membros = await fetchJSON<Array<{ id: number; nome: string; siglaPartido: string; siglaUf: string }>>(
    `${CAMARA}/frentes/${fr.id}/membros`
  );
  if (!membros || !Array.isArray(membros) || membros.length === 0) continue;

  // Upsert membros em lotes de 200
  // Filtra membros sem id (senadores/externos sem ID de deputado)
  const rows = membros
    .filter((m) => m.id != null)
    .map((m) => ({
      frente_id: fr.id,
      deputado_id: m.id,
      nome: m.nome,
      sigla_partido: m.siglaPartido ?? null,
      sigla_uf: m.siglaUf ?? null,
    }));

  for (let j = 0; j < rows.length; j += 200) {
    const { error } = await sb.from("cam_frentes_membros")
      .upsert(rows.slice(j, j + 200), { onConflict: "frente_id,deputado_id" });
    if (error) console.warn(`  Erro upsert membros frente ${fr.id}: ${error.message}`);
  }

  totalMembros += membros.length;
  for (const m of membros) {
    frentesDeputado.set(m.id, (frentesDeputado.get(m.id) ?? 0) + 1);
  }

  if ((i + 1) % 10 === 0) process.stdout.write(`\r  Frentes processadas: ${i + 1}/${frentes.length}`);
}
console.log(`\r  Frentes processadas: ${frentes.length}/${frentes.length} — ${totalMembros} membros totais`);

// ── COMISSÕES ────────────────────────────────────────────────────────────────

console.log("\n[Comissões] Buscando comissões permanentes...");

// codTipoOrgao=2 = Comissão Permanente
const comissoes = await paginarCamara<{
  id: number; sigla: string; nome: string; apelido: string; tipoOrgao: string; codTipoOrgao: number
}>("/orgaos", "&codTipoOrgao=2");
console.log(`  ${comissoes.length} comissões encontradas`);

if (comissoes.length > 0) {
  const { error } = await sb.from("cam_comissoes").upsert(
    comissoes.map((c) => ({
      id: c.id,
      sigla: c.sigla ?? null,
      nome: c.nome,
      apelido: c.apelido ?? null,
      tipo_orgao: c.tipoOrgao ?? null,
      atualizado_em: new Date().toISOString(),
    })),
    { onConflict: "id" }
  );
  if (error) throw new Error(`upsert cam_comissoes: ${error.message}`);
}

let totalMembrosCom = 0;
const comissoesDeputado = new Map<number, number>(); // deputado_id → contagem comissões

for (let i = 0; i < comissoes.length; i++) {
  const com = comissoes[i];
  await sleep(THROTTLE);

  // Pagina todos os papéis: a API default retorna 15 (só Titulares).
  // Com paginação vêm Titular(101), Suplente(102), Presidente(1), Vice-Presidentes(2-4).
  const membros = await paginarCamara<{
    id: number; nome: string; siglaPartido: string; siglaUf: string;
    titulo: string; codTitulo: number; dataInicio: string; dataFim: string;
  }>(`/orgaos/${com.id}/membros`);

  if (!Array.isArray(membros) || membros.length === 0) continue;

  // Ordena por codTitulo ASC pra hierarquia (Presidente=1, Vice=2-4, Titular=101, Suplente=102)
  // — assim o dedup que mantém o primeiro grava o papel de maior precedência.
  const membrosOrdenados = [...membros].sort((a, b) => (a.codTitulo ?? 999) - (b.codTitulo ?? 999));

  const seen = new Set<number>();
  const rows = membrosOrdenados
    .filter((m) => m.id != null && !seen.has(m.id) && seen.add(m.id))
    .map((m) => ({
      comissao_id: com.id,
      deputado_id: m.id,
      nome: m.nome,
      sigla_partido: m.siglaPartido ?? null,
      sigla_uf: m.siglaUf ?? null,
      titulo: m.titulo ?? null,
      data_inicio: m.dataInicio ? m.dataInicio.slice(0, 10) : null,
      data_fim: m.dataFim ? m.dataFim.slice(0, 10) : null,
    }));

  for (let j = 0; j < rows.length; j += 200) {
    const { error } = await sb.from("cam_comissoes_membros")
      .upsert(rows.slice(j, j + 200), { onConflict: "comissao_id,deputado_id" });
    if (error) console.warn(`  Erro membros comissão ${com.id}: ${error.message}`);
  }

  totalMembrosCom += membros.length;
  for (const m of membros) {
    comissoesDeputado.set(m.id, (comissoesDeputado.get(m.id) ?? 0) + 1);
  }

  if ((i + 1) % 5 === 0) process.stdout.write(`\r  Comissões processadas: ${i + 1}/${comissoes.length}`);
}
console.log(`\r  Comissões processadas: ${comissoes.length}/${comissoes.length} — ${totalMembrosCom} membros totais`);

// ── Atualiza contadores em cam_parlamentar_risco ─────────────────────────────

console.log("\n[Contadores] Atualizando cam_parlamentar_risco...");

// Unifica todos os deputado_ids que aparecem em frentes ou comissões
const allDepIds = new Set([...frentesDeputado.keys(), ...comissoesDeputado.keys()]);
let atualizados = 0;

for (const depId of allDepIds) {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .update({
      total_frentes: frentesDeputado.get(depId) ?? 0,
      total_comissoes: comissoesDeputado.get(depId) ?? 0,
      atualizado_em: new Date().toISOString(),
    })
    .eq("deputado_id", depId);
  if (!error) atualizados++;
}

const duracao = Date.now() - inicio;
console.log(`\n✅ Concluído em ${duracao}ms`);
console.log(`   Frentes: ${frentes.length} | Comissões: ${comissoes.length}`);
console.log(`   Deputados com frente: ${frentesDeputado.size}`);
console.log(`   Deputados com comissão: ${comissoesDeputado.size}`);
console.log(`   Contadores atualizados: ${atualizados}`);
