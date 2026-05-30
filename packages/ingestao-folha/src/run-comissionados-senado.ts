/**
 * Ingestão Fase 1 — Comissionados de gabinete do Senado Federal.
 *
 * Fonte: lista de servidores comissionados (snapshot diário, latin-1).
 *   https://www.senado.leg.br/transparencia/lai/secrh/servidores_comissionados.csv
 *
 * Filtra `SETOR2` começando com "GABSEN" (Gabinetes dos Senadores). O
 * `SETOR_EXERCÍCIO` traz o gabinete ("GSACORON - GABINETE DO SENADOR ANGELO
 * CORONEL") → extraímos código + nome do senador. Lideranças (GABLID) ficam
 * fora desta fase (não ligam a um senador específico).
 *
 * Sem ID/matrícula na fonte: a chave natural é nome|gabinete_codigo. O vínculo
 * ao senador é por NOME (parlamentar_nome), resolvido depois no analytics.
 *
 * Uso:
 *   npm run comissionados-senado:ts -w @transparencia/ingestao-folha
 *   npm run comissionados-senado:ts -w @transparencia/ingestao-folha -- 2026-05-01
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import {
  parseLinha,
  mapColunas,
  splitCodigoNome,
  nomeSenadorDoGabinete,
  parseDataBR,
  snapshotMesISO,
} from "./csv.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FONTE_URL =
  "https://www.senado.leg.br/transparencia/lai/secrh/servidores_comissionados.csv";
const BATCH = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const snapshot = process.argv[2]?.match(/^\d{4}-\d{2}-\d{2}$/) ? process.argv[2] : snapshotMesISO();

async function upsertBatch(rows: object[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase
    .from("folha_gabinete")
    .upsert(rows, { onConflict: "casa,chave_natural,snapshot_date", ignoreDuplicates: false })
    .select("id");
  if (error) throw new Error(`Upsert folha_gabinete: ${error.message}`);
  return Array.isArray(data) ? data.length : 0;
}

async function main() {
  console.log(`▶ Comissionados de gabinete (Senado) — snapshot ${snapshot}`);
  console.log(`  Baixando ${FONTE_URL} ...`);

  const res = await fetch(FONTE_URL);
  if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
  // Fonte é latin-1.
  const buf = Buffer.from(await res.arrayBuffer());
  const content = buf.toString("latin1");
  const linhas = content.split("\n").filter((l) => l.trim().length > 0);

  // Linha 0 = "ÚLTIMA ATUALIZAÇÃO;<data>"; linha 1 = cabeçalho.
  const headerIdx = linhas.findIndex((l) => l.toUpperCase().includes("SETOR1"));
  if (headerIdx === -1) throw new Error("Cabeçalho (SETOR1) não encontrado.");
  const cabecalho = parseLinha(linhas[headerIdx]);
  const col = mapColunas(cabecalho);
  const iSetor2 = col("SETOR2");
  const iSetorEx = col("SETOR_EXERCÍCIO");
  const iNome = col("NOME");
  const iVinculo = col("TIPO DO VÍNCULO");
  const iAdmissao = col("ADMISSÃO");
  const iCargo = col("CARGO");
  const iCategoria = col("CATEGORIA");
  const iFuncao = col("FUNÇÃO");

  const nowISO = new Date().toISOString();
  let lidas = 0;
  let upserts = 0;
  let batch: object[] = [];
  const chavesVistas = new Set<string>();
  let duplicadas = 0;

  for (let i = headerIdx + 1; i < linhas.length; i++) {
    const c = parseLinha(linhas[i]);
    const setor2 = (c[iSetor2] ?? "").toUpperCase();
    if (!setor2.startsWith("GABSEN")) continue;

    const nome = c[iNome]?.trim();
    if (!nome) continue;

    const setorEx = c[iSetorEx]?.trim() ?? "";
    const { codigo, nome: gabNome } = splitCodigoNome(setorEx);
    const senador = nomeSenadorDoGabinete(gabNome);

    // Sem ID na fonte → chave por nome|gabinete. Deduplica dentro do snapshot.
    const chave = `${nome}|${codigo ?? ""}`;
    if (chavesVistas.has(chave)) {
      duplicadas++;
      continue;
    }
    chavesVistas.add(chave);

    batch.push({
      casa: "senado",
      snapshot_date: snapshot,
      chave_natural: chave,
      secretario_nome: nome,
      secretario_id_externo: null,
      cargo: c[iCargo]?.trim() || c[iCategoria]?.trim() || null,
      funcao: c[iFuncao]?.trim() || null,
      vinculo: c[iVinculo]?.trim() || null,
      parlamentar_id_externo: null,
      parlamentar_nome: senador,
      gabinete_codigo: codigo,
      gabinete_raw: setorEx || null,
      data_nomeacao: null,
      data_admissao: parseDataBR(c[iAdmissao]),
      dados: { categoria: c[iCategoria]?.trim() || null },
      updated_at: nowISO,
    });
    lidas++;

    if (batch.length >= BATCH) {
      upserts += await upsertBatch(batch);
      batch = [];
    }
  }
  if (batch.length > 0) upserts += await upsertBatch(batch);

  console.log(`  ✓ comissionados_gabsen=${lidas} upserts=${upserts} duplicadas_ignoradas=${duplicadas}`);
  console.log(`▶ Concluído.`);
}

main().catch((err) => {
  console.error(`✗ Erro: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
