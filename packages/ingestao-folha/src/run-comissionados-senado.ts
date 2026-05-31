/**
 * Ingestão Fase 2 — Comissionados de gabinete do Senado, COM salário.
 *
 * Fonte: API de dados abertos administrativos do Senado (UTF-8). Substitui a
 * fonte pública secrh da Fase 1 porque traz `SEQUENCIAL` (matrícula), que
 * permite join LIMPO com a remuneração — sem casar por nome.
 *
 *   comissionados:  GET /api/v1/servidores/servidores/comissionados/csv
 *   remuneração:    GET /api/v1/servidores/remuneracoes/{ano}/{mes}/csv
 *
 * Filtra SITUAÇÃO=ATIVO e lotação de um senador específico (Gabinete ou
 * Escritório de Apoio); exclui lideranças/blocos/institucional. `valor_remune-
 * racao` recebe a REMUNERAÇÃO BÁSICA (TIPO FOLHA=Normal) do mês de referência.
 *
 * Uso:
 *   npm run comissionados-senado:ts -w @transparencia/ingestao-folha
 *   npm run comissionados-senado:ts -w @transparencia/ingestao-folha -- 2026-05-01 2026-04
 *     (1º arg = snapshot YYYY-MM-DD; 2º arg = mês da remuneração YYYY-MM)
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
  normNome,
  nomeSenadorDeLotacao,
  parseValorBR,
  snapshotMesISO,
} from "./csv.js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const API = "https://adm.senado.gov.br/adm-dadosabertos/api/v1/servidores";
const BATCH = 500;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const snapshot = process.argv[2]?.match(/^\d{4}-\d{2}-\d{2}$/) ? process.argv[2] : snapshotMesISO();

// Mês de referência da remuneração: arg explícito ou mês anterior ao corrente.
function mesReferencia(): { ano: number; mes: number } {
  const arg = process.argv[3]?.match(/^(\d{4})-(\d{2})$/);
  if (arg) return { ano: Number(arg[1]), mes: Number(arg[2]) };
  const now = new Date();
  let ano = now.getFullYear();
  let mes = now.getMonth(); // 0-index = mês anterior em base-1; 0 → dezembro do ano anterior
  if (mes === 0) {
    mes = 12;
    ano -= 1;
  }
  return { ano, mes };
}

type Remun = { basica: number | null; liquida: number | null; vantagens: number | null; funcao: number | null };

async function baixarCsv(url: string): Promise<string[] | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const txt = stripBOM(await res.text());
  const linhas = txt.split("\n").filter((l) => l.trim().length > 0);
  return linhas.length > 1 ? linhas : null;
}

// Busca remuneração tentando o mês alvo e, se vazio, até 2 meses atrás.
// O join é por NOME normalizado: o campo SEQUENCIAL difere entre os endpoints
// (é sequencial por arquivo, não ID de pessoa). Nomes repetidos viram ambíguos.
async function carregarRemuneracao(): Promise<{
  ref: string;
  mapa: Map<string, Remun>;
  ambiguos: Set<string>;
}> {
  let { ano, mes } = mesReferencia();
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const linhas = await baixarCsv(`${API}/remuneracoes/${ano}/${mes}/csv`);
    if (linhas) {
      const cab = parseLinha(linhas[0]);
      const col = mapColunas(cab);
      const iNome = col("NOME");
      const iTipo = col("TIPO FOLHA");
      const iBasica = col("REMUNERAÇÃO BÁSICA");
      const iLiquida = col("REMUNERAÇÃO LÍQUIDA");
      const iVant = col("VANTAGENS PESSOAIS");
      const iFunc = col("FUNÇÃO COMISSIONADA");
      const mapa = new Map<string, Remun>();
      const ambiguos = new Set<string>();
      for (let i = 1; i < linhas.length; i++) {
        const c = parseLinha(linhas[i]);
        if ((c[iTipo] ?? "").trim() !== "Normal") continue; // ignora Suplementar
        const nome = normNome(c[iNome]);
        if (!nome) continue;
        if (mapa.has(nome) || ambiguos.has(nome)) {
          mapa.delete(nome); // homônimo: salário indeterminável → não atribui
          ambiguos.add(nome);
          continue;
        }
        const basica = parseValorBR(c[iBasica]);
        mapa.set(nome, {
          basica: basica != null && basica > 0 ? basica : null, // descarta estorno/zero
          liquida: parseValorBR(c[iLiquida]),
          vantagens: parseValorBR(c[iVant]),
          funcao: parseValorBR(c[iFunc]),
        });
      }
      if (mapa.size > 0) return { ref: `${ano}-${String(mes).padStart(2, "0")}`, mapa, ambiguos };
    }
    // recua um mês
    mes -= 1;
    if (mes === 0) {
      mes = 12;
      ano -= 1;
    }
  }
  return { ref: "indisponível", mapa: new Map(), ambiguos: new Set() };
}

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
  console.log(`▶ Comissionados de gabinete (Senado, API admin) — snapshot ${snapshot}`);

  const { ref, mapa: remun, ambiguos } = await carregarRemuneracao();
  console.log(`  Remuneração de referência: ${ref} (${remun.size} nomes únicos, ${ambiguos.size} homônimos)`);

  console.log(`  Baixando comissionados...`);
  const linhas = await baixarCsv(`${API}/servidores/comissionados/csv`);
  if (!linhas) throw new Error("Falha ao baixar comissionados.");

  const cab = parseLinha(linhas[0]);
  const col = mapColunas(cab);
  const iSeq = col("SEQUENCIAL");
  const iNome = col("NOME");
  const iVinc = col("VINCULO");
  const iSit = col("SITUAÇÃO");
  const iCargo = col("CARGO");
  const iFuncao = col("FUNÇÃO");
  const iSigla = col("SIGLA LOTAÇÃO");
  const iNomeLot = col("NOME LOTAÇÃO");
  const iCategoria = col("NOME CATEGORIA");

  const nowISO = new Date().toISOString();
  let ativos = 0;
  let semSenador = 0;
  let comSalario = 0;
  let upserts = 0;
  const vistos = new Set<string>();
  let batch: object[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const c = parseLinha(linhas[i]);
    if ((c[iSit] ?? "").trim().toUpperCase() !== "ATIVO") continue;
    ativos++;

    const lot = c[iNomeLot]?.trim() ?? "";
    const senador = nomeSenadorDeLotacao(lot);
    if (!senador) {
      semSenador++;
      continue; // liderança/bloco/institucional
    }

    const seq = c[iSeq]?.trim();
    if (!seq || vistos.has(seq)) continue;
    vistos.add(seq);

    const nomeNorm = normNome(c[iNome]);
    const r = remun.get(nomeNorm) ?? null;
    const ambiguo = ambiguos.has(nomeNorm);
    if (r?.basica != null) comSalario++;

    batch.push({
      casa: "senado",
      snapshot_date: snapshot,
      chave_natural: seq,
      secretario_nome: c[iNome]?.trim() || null,
      secretario_id_externo: seq,
      cargo: c[iCargo]?.trim() || c[iCategoria]?.trim() || null,
      funcao: c[iFuncao]?.trim() || null,
      vinculo: c[iVinc]?.trim() || null,
      parlamentar_id_externo: null,
      parlamentar_nome: senador,
      gabinete_codigo: c[iSigla]?.trim() || null,
      gabinete_raw: lot || null,
      data_nomeacao: null,
      data_admissao: null,
      valor_remuneracao: r?.basica ?? null,
      dados: {
        remuneracao_mes_ref: ref,
        remuneracao_liquida: r?.liquida ?? null,
        vantagens_pessoais: r?.vantagens ?? null,
        funcao_comissionada: r?.funcao ?? null,
        nome_categoria: c[iCategoria]?.trim() || null,
        salario_ambiguo: ambiguo || undefined,
      },
      updated_at: nowISO,
    });

    if (batch.length >= BATCH) {
      upserts += await upsertBatch(batch);
      batch = [];
    }
  }
  if (batch.length > 0) upserts += await upsertBatch(batch);

  // Remove linhas antigas do Senado neste snapshot (Fase 1 sem matrícula, ou
  // comissionados que saíram): tudo que não foi tocado nesta execução.
  const { error: delErr, count: removidas } = await supabase
    .from("folha_gabinete")
    .delete({ count: "exact" })
    .eq("casa", "senado")
    .eq("snapshot_date", snapshot)
    .lt("updated_at", nowISO);
  if (delErr) console.warn(`  Aviso ao limpar antigas: ${delErr.message}`);

  const cobertura = vistos.size > 0 ? ((comSalario / vistos.size) * 100).toFixed(1) : "0";
  console.log(
    `  ✓ ativos=${ativos} de_senador=${vistos.size} institucional_ignorado=${semSenador}`,
  );
  console.log(`  ✓ upserts=${upserts} com_salario=${comSalario} (${cobertura}%) antigas_removidas=${removidas ?? 0}`);
  console.log(`▶ Concluído.`);
}

main().catch((err) => {
  console.error(`✗ Erro: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
