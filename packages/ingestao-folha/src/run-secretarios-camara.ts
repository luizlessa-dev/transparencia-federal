/**
 * Ingestão Fase 1 — Secretários Parlamentares da Câmara dos Deputados.
 *
 * Fonte: arquivo único de funcionários (snapshot diário, sem histórico nativo).
 *   https://dadosabertos.camara.leg.br/arquivos/funcionarios/csv/funcionarios.csv
 *
 * Filtra `grupo = "Secretário Parlamentar"`. O `uriLotacao` aponta direto
 * para o deputado (/api/v2/deputados/{id}) → extraímos o id_externo por regex,
 * sem fuzzy match de nome. `cargo` (ex: SP09C) é o nível salarial — guardado
 * para a Fase 2. SEM salário nesta fase.
 *
 * Uso:
 *   npm run secretarios-camara:ts -w @transparencia/ingestao-folha
 *   npm run secretarios-camara:ts -w @transparencia/ingestao-folha -- 2026-05-01   # força snapshot_date
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
  stripBOM,
  splitCodigoNome,
  parseDataBR,
  snapshotMesISO,
} from "./csv.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const FONTE_URL =
  "https://dadosabertos.camara.leg.br/arquivos/funcionarios/csv/funcionarios.csv";
const GRUPO_ALVO = "Secretário Parlamentar";
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
  console.log(`▶ Secretários Parlamentares (Câmara) — snapshot ${snapshot}`);
  console.log(`  Baixando ${FONTE_URL} ...`);

  const res = await fetch(FONTE_URL);
  if (!res.ok) throw new Error(`Download falhou: ${res.status}`);
  const content = stripBOM(await res.text());
  const linhas = content.split("\n").filter((l) => l.trim().length > 0);
  console.log(`  ${linhas.length - 1} funcionários no total`);

  const cabecalho = parseLinha(linhas[0]);
  const col = mapColunas(cabecalho);
  const iPonto = col("ponto");
  const iGrupo = col("grupo");
  const iNome = col("nome");
  const iCargo = col("cargo");
  const iLotacao = col("lotacao");
  const iFuncao = col("funcao");
  const iDataNom = col("dataNomeacao");
  const iUri = col("uriLotacao");

  const nowISO = new Date().toISOString();
  let lidas = 0;
  let upserts = 0;
  let semDeputado = 0;
  let duplicadas = 0;
  let batch: object[] = [];
  // `ponto` pode repetir no arquivo (histórico de lotação). Dedup no snapshot:
  // a chave do upsert é (casa, chave_natural, snapshot_date) e o Postgres recusa
  // afetar a mesma linha duas vezes no mesmo comando.
  const chavesVistas = new Set<string>();

  for (let i = 1; i < linhas.length; i++) {
    const c = parseLinha(linhas[i]);
    if (c[iGrupo] !== GRUPO_ALVO) continue;

    const ponto = c[iPonto]?.trim();
    if (!ponto) continue;
    if (chavesVistas.has(ponto)) {
      duplicadas++;
      continue;
    }
    chavesVistas.add(ponto);

    const lotacao = c[iLotacao]?.trim() ?? "";
    const { codigo, nome: nomeGab } = splitCodigoNome(lotacao);
    const uri = c[iUri]?.trim() ?? "";
    const depId = uri.match(/\/deputados\/(\d+)/)?.[1] ?? null;
    if (!depId) semDeputado++;

    batch.push({
      casa: "camara",
      snapshot_date: snapshot,
      chave_natural: ponto,
      secretario_nome: c[iNome]?.trim() || null,
      secretario_id_externo: ponto,
      cargo: c[iCargo]?.trim() || null,
      funcao: c[iFuncao]?.trim() || null,
      vinculo: null,
      parlamentar_id_externo: depId,
      parlamentar_nome: nomeGab,
      gabinete_codigo: codigo,
      gabinete_raw: lotacao || null,
      data_nomeacao: parseDataBR(c[iDataNom]),
      data_admissao: null,
      dados: { uriLotacao: uri || null },
      updated_at: nowISO,
    });
    lidas++;

    if (batch.length >= BATCH) {
      upserts += await upsertBatch(batch);
      batch = [];
      if (lidas % 5000 === 0) console.log(`    ${lidas} secretários processados...`);
    }
  }
  if (batch.length > 0) upserts += await upsertBatch(batch);

  console.log(
    `  ✓ secretários=${lidas} upserts=${upserts} sem_deputado_vinculado=${semDeputado} duplicadas_ignoradas=${duplicadas}`,
  );
  console.log(`▶ Concluído.`);
}

main().catch((err) => {
  console.error(`✗ Erro: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
