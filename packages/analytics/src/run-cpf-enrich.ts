/**
 * run-cpf-enrich.ts
 * Busca CPF de cada deputado via API da Câmara e persiste em cam_parlamentar_risco.
 * Necessário para fazer join correto com dados TSE (que usam nome civil completo).
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios."); process.exit(1); }

const sb = createClient(url, key);
const CAMARA_BASE = "https://dadosabertos.camara.leg.br/api/v2";
const THROTTLE_MS = 150;

interface DepRow { deputado_id: number; nome: string }

const inicio = Date.now();
console.log("▶ Enriquecimento CPF — deputados 57ª legislatura");

// 1. Busca IDs de todos os deputados
const { data: deps, error: depErr } = await sb
  .from("cam_parlamentar_risco")
  .select("deputado_id, nome")
  .is("cpf", null);

if (depErr) { console.error(depErr.message); process.exit(1); }
const lista = (deps ?? []) as DepRow[];
console.log(`  ${lista.length} deputados sem CPF cadastrado`);

if (lista.length === 0) {
  console.log("  Nada a fazer.");
  process.exit(0);
}

// 2. Para cada deputado, busca CPF na API da Câmara
let ok = 0, falhas = 0;
const batch: { deputado_id: number; cpf: string }[] = [];

for (let i = 0; i < lista.length; i++) {
  const dep = lista[i];

  try {
    const res = await fetch(`${CAMARA_BASE}/deputados/${dep.deputado_id}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      falhas++;
      continue;
    }

    const json = (await res.json()) as { dados?: { cpf?: string } };
    const cpf = json.dados?.cpf?.replace(/\D/g, "") ?? "";

    if (cpf && cpf.length === 11) {
      batch.push({ deputado_id: dep.deputado_id, cpf });
      ok++;
    } else {
      falhas++;
    }
  } catch {
    falhas++;
  }

  if ((i + 1) % 50 === 0) {
    process.stdout.write(`\r  Processados: ${i + 1}/${lista.length} (ok=${ok}, falhas=${falhas})`);
  }

  await new Promise((r) => setTimeout(r, THROTTLE_MS));
}

process.stdout.write(`\r  Processados: ${lista.length}/${lista.length} (ok=${ok}, falhas=${falhas})\n`);

// 3. Update CPFs — uma por uma para garantir que não sobrescreve linhas ausentes
let errosUpdate = 0;
for (const r of batch) {
  const { error } = await sb
    .from("cam_parlamentar_risco")
    .update({ cpf: r.cpf, atualizado_em: new Date().toISOString() })
    .eq("deputado_id", r.deputado_id);
  if (error) { errosUpdate++; }
}
if (errosUpdate > 0) console.warn(`  ${errosUpdate} erros no update de CPF`);

const duracao = Date.now() - inicio;
console.log(`\n✅ CPF enriquecido em ${duracao}ms`);
console.log(`   OK: ${ok} | Falhas: ${falhas}`);
