/**
 * job_ingestao_tse_receitas
 * Ingere receitas de candidatos a Deputado Federal (CD_CARGO=6) e Senador (CD_CARGO=5)
 * a partir dos ZIPs do TSE (prestacao_de_contas_eleitorais_candidatos_{ANO}.zip).
 *
 * Fluxo:
 *  1. Baixa o ZIP do CDN do TSE para /tmp
 *  2. Extrai cada arquivo receitas_candidatos_{ANO}_{UF}.csv (ignora _BRASIL = duplicata)
 *  3. Filtra CD_CARGO in [5, 6]
 *  4. Faz upsert em tse_receitas_brutas
 */

import { createWriteStream, existsSync, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { execSync } from "child_process";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_tse_receitas";
const ETAPA_NOME = "ingestao_tse_receitas";
const TAMANHO_LOTE = 300;
const CARGOS_ALVO = new Set(["5", "6"]); // Senador=5, Deputado Federal=6

const CDN_BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele/prestacao_contas";

const ANOS_ELEITORAIS_DEFAULT = [2022, 2018]; // anos com eleições federais

const COLUNAS = [
  "DT_GERACAO","HH_GERACAO","AA_ELEICAO","CD_TIPO_ELEICAO","NM_TIPO_ELEICAO",
  "CD_ELEICAO","DS_ELEICAO","DT_ELEICAO","ST_TURNO","TP_PRESTACAO_CONTAS",
  "DT_PRESTACAO_CONTAS","SQ_PRESTADOR_CONTAS","SG_UF","SG_UE","NM_UE",
  "NR_CNPJ_PRESTADOR_CONTA","CD_CARGO","DS_CARGO","SQ_CANDIDATO","NR_CANDIDATO",
  "NM_CANDIDATO","NR_CPF_CANDIDATO","NR_CPF_VICE_CANDIDATO","NR_PARTIDO",
  "SG_PARTIDO","NM_PARTIDO","CD_FONTE_RECEITA","DS_FONTE_RECEITA",
  "CD_ORIGEM_RECEITA","DS_ORIGEM_RECEITA","CD_NATUREZA_RECEITA","DS_NATUREZA_RECEITA",
  "CD_ESPECIE_RECEITA","DS_ESPECIE_RECEITA","CD_CNAE_DOADOR","DS_CNAE_DOADOR",
  "NR_CPF_CNPJ_DOADOR","NM_DOADOR","NM_DOADOR_RFB","CD_ESFERA_PARTIDARIA_DOADOR",
  "DS_ESFERA_PARTIDARIA_DOADOR","SG_UF_DOADOR","CD_MUNICIPIO_DOADOR","NM_MUNICIPIO_DOADOR",
  "SQ_CANDIDATO_DOADOR","NR_CANDIDATO_DOADOR","CD_CARGO_CANDIDATO_DOADOR",
  "DS_CARGO_CANDIDATO_DOADOR","NR_PARTIDO_DOADOR","SG_PARTIDO_DOADOR","NM_PARTIDO_DOADOR",
  "NR_RECIBO_DOACAO","NR_DOCUMENTO_DOACAO","SQ_RECEITA","DT_RECEITA","DS_RECEITA",
  "VR_RECEITA","DS_NATUREZA_RECURSO_ESTIMAVEL","DS_GENERO","DS_COR_RACA",
];

function sanitize(v: string): string | null {
  if (!v || v === "#NULO" || v === "#NULO#" || v === "#NE" || v === "#NE#") return null;
  return v.trim() || null;
}

function parseIntSafe(v: string): number | null {
  const n = parseInt(v.trim(), 10);
  return isNaN(n) || n < 0 ? null : n;
}

function parseBRL(v: string): number {
  const s = v.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(v: string): string | null {
  // "02/09/2022" → "2022-09-02"
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function parseLine(line: string): string[] {
  // CSV com separador ';' e campos entre aspas duplas
  const fields: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ";" && !inQuote) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

function mapRow(fields: string[], ano: number): Record<string, unknown> | null {
  const row: Record<string, string> = {};
  COLUNAS.forEach((col, i) => { row[col] = fields[i] ?? ""; });

  if (!CARGOS_ALVO.has(row.CD_CARGO?.trim())) return null;

  const sq = parseIntSafe(row.SQ_RECEITA);
  if (sq === null) return null;

  return {
    sq_receita: sq,
    ano_eleicao: ano,
    sq_candidato: sanitize(row.SQ_CANDIDATO) ?? "",
    nm_candidato: sanitize(row.NM_CANDIDATO) ?? "",
    nr_cpf_candidato: sanitize(row.NR_CPF_CANDIDATO),
    cd_cargo: parseIntSafe(row.CD_CARGO),
    ds_cargo: sanitize(row.DS_CARGO) ?? "",
    sg_uf: sanitize(row.SG_UF) ?? "",
    nr_partido: parseIntSafe(row.NR_PARTIDO),
    sg_partido: sanitize(row.SG_PARTIDO),
    nm_partido: sanitize(row.NM_PARTIDO),
    cd_fonte_receita: parseIntSafe(row.CD_FONTE_RECEITA),
    ds_fonte_receita: sanitize(row.DS_FONTE_RECEITA),
    cd_origem_receita: parseIntSafe(row.CD_ORIGEM_RECEITA),
    ds_origem_receita: sanitize(row.DS_ORIGEM_RECEITA),
    cd_especie_receita: parseIntSafe(row.CD_ESPECIE_RECEITA),
    ds_especie_receita: sanitize(row.DS_ESPECIE_RECEITA),
    nr_cpf_cnpj_doador: sanitize(row.NR_CPF_CNPJ_DOADOR),
    nm_doador: sanitize(row.NM_DOADOR),
    nm_doador_rfb: sanitize(row.NM_DOADOR_RFB),
    cd_cnae_doador: sanitize(row.CD_CNAE_DOADOR),
    ds_cnae_doador: sanitize(row.DS_CNAE_DOADOR),
    sg_uf_doador: sanitize(row.SG_UF_DOADOR),
    vr_receita: parseBRL(row.VR_RECEITA ?? "0"),
    dt_receita: parseDate(row.DT_RECEITA ?? ""),
    ds_receita: sanitize(row.DS_RECEITA),
    dados: row,
    atualizado_em: new Date().toISOString(),
  };
}

async function downloadZip(url: string, destPath: string): Promise<void> {
  console.log(`  Baixando ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download falhou: ${res.status} ${url}`);
  const ws = createWriteStream(destPath);
  // Node 18+ fetch returns Web Streams — converter para Node Readable
  const nodeStream = Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]);
  await pipeline(nodeStream, ws);
  console.log(`  ZIP salvo em ${destPath}`);
}

function listZipEntries(zipPath: string): string[] {
  try {
    const out = execSync(`unzip -Z1 "${zipPath}"`, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    return out.split("\n").map(l => l.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function processarCsvEntry(
  zipPath: string,
  entry: string,
  ano: number,
  sb: SupabaseClient
): Promise<{ total: number; inseridos: number; erros: number }> {
  let inseridos = 0, erros = 0;

  const proc = execSync(`unzip -p "${zipPath}" "${entry}"`, {
    encoding: "buffer",
    maxBuffer: 200 * 1024 * 1024,
  });

  // Decodificar latin-1
  const content = proc.toString("latin1");
  const lines = content.split("\n");

  // Construir mapa para deduplicar por sq_receita (TSE retorna duplicatas)
  const mapa = new Map<string, Record<string, unknown>>();
  let isHeader = true;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isHeader) { isHeader = false; continue; }

    const fields = parseLine(line);
    const row = mapRow(fields, ano);
    if (!row) continue;

    const key = `${row.sq_receita}|${row.ano_eleicao}`;
    mapa.set(key, row);
  }

  const rows = Array.from(mapa.values());

  // Upsert em lotes
  for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
    const lote = rows.slice(i, i + TAMANHO_LOTE);
    const { error } = await sb.from("tse_receitas_brutas").upsert(lote, { onConflict: "sq_receita,ano_eleicao" });
    if (error) {
      erros += lote.length;
      console.error(`    Upsert erro: ${error.message}`);
    } else {
      inseridos += lote.length;
    }
  }

  return { total: rows.length, inseridos, erros };
}

export interface JobTseReceitasConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anosEleitorais?: number[];
  manter_zip?: boolean; // manter o ZIP local (padrão: deletar)
}

export interface ResultadoAnoTse {
  ano: number;
  total: number;
  inseridos: number;
  erros: number;
  duracao_ms: number;
  erro?: string;
}

export interface ResultadoJobTseReceitas {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoTse[];
  erro?: string;
}

export async function jobIngestaoTseReceitas(
  config: JobTseReceitasConfig
): Promise<ResultadoJobTseReceitas> {
  const sb = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const anos = config.anosEleitorais ?? ANOS_ELEITORAIS_DEFAULT;
  const tmpDir = join(tmpdir(), "transparencia-tse");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const execucao_id = await inserirExecucao(sb, {
    job_nome: JOB_NOME,
    status: "em_andamento",
    detalhes: { anos },
  });

  const etapa_id = await inserirEtapa(sb, {
    execucao_id,
    etapa_nome: ETAPA_NOME,
    status: "em_andamento",
    detalhes: {},
  });

  const resultados_por_ano: ResultadoAnoTse[] = [];

  try {
    for (const ano of anos) {
      const t0 = Date.now();
      let total = 0, inseridos = 0, erros = 0;
      const zipPath = join(tmpDir, `candidatos_${ano}.zip`);
      const zipUrl = `${CDN_BASE}/prestacao_de_contas_eleitorais_candidatos_${ano}.zip`;

      console.log(`\n  [${ano}] Iniciando...`);
      try {
        if (!existsSync(zipPath)) {
          await downloadZip(zipUrl, zipPath);
        } else {
          console.log(`  [${ano}] ZIP já existe, reutilizando.`);
        }

        const entries = listZipEntries(zipPath);
        // Processar apenas receitas_candidatos_XXXX_{UF}.csv — excluir _BRASIL (duplicata)
        const csvEntries = entries.filter(e =>
          e.startsWith(`receitas_candidatos_${ano}_`) &&
          !e.includes("_BRASIL") &&
          !e.includes("doador_originario") &&
          e.endsWith(".csv")
        );

        console.log(`  [${ano}] ${csvEntries.length} arquivos de UF a processar`);

        for (const entry of csvEntries) {
          const uf = entry.replace(`receitas_candidatos_${ano}_`, "").replace(".csv", "");
          const r = await processarCsvEntry(zipPath, entry, ano, sb);
          total += r.total;
          inseridos += r.inseridos;
          erros += r.erros;
          console.log(`  [${ano}/${uf}] ${r.inseridos} registros (${r.total} candidatos federais)`);
        }

        if (!config.manter_zip) {
          await unlink(zipPath);
          console.log(`  [${ano}] ZIP removido.`);
        }

        const duracao_ms = Date.now() - t0;
        console.log(`  [${ano}] ✓ ${total} receitas, ${inseridos} inseridas, ${erros} erros — ${duracao_ms}ms`);
        resultados_por_ano.push({ ano, total, inseridos, erros, duracao_ms });

      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        console.error(`  [${ano}] ERRO: ${erro}`);
        const duracao_ms = Date.now() - t0;
        resultados_por_ano.push({ ano, total, inseridos, erros, duracao_ms, erro });
      }
    }

    await atualizarEtapa(sb, etapa_id, {
      finalizado_em: new Date().toISOString(),
      status: "sucesso",
      detalhes: { resultados_por_ano },
    });
    await atualizarExecucao(sb, execucao_id, {
      finalizado_em: new Date().toISOString(),
      status: "sucesso",
      detalhes: { resultados_por_ano },
    });

    return { execucao_id, status: "sucesso", resultados_por_ano };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    await atualizarEtapa(sb, etapa_id, { finalizado_em: new Date().toISOString(), status: "erro", detalhes: { erro } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em: new Date().toISOString(), status: "erro", detalhes: { erro } });
    return { execucao_id, status: "erro", resultados_por_ano, erro };
  }
}
