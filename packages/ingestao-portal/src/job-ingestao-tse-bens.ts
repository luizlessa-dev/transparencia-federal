/**
 * job_ingestao_tse_bens
 * Ingere declarações de bens de candidatos (bem_candidato_{ANO}.zip) do CDN do TSE.
 *
 * Fluxo:
 *  1. Baixa o ZIP do CDN do TSE para /tmp
 *  2. Extrai o CSV com `unzip -p`
 *  3. Decodifica em latin-1
 *  4. Filtra apenas candidatos existentes em tse_candidatos_receitas_agg
 *  5. Upsert em tse_bens_candidatos (lotes de 500)
 *  6. Computa e upsert tse_bens_agg
 *  7. Remove o ZIP (a menos que manter_zip: true)
 */

import { createWriteStream, existsSync, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { execSync } from "child_process";
import { createSupabaseClient } from "./db.js";

const TAMANHO_LOTE = 500;
const ANOS_ELEITORAIS_DEFAULT = [2022, 2018];
const CDN_BASE = "https://cdn.tse.jus.br/estatistica/sead/odsele/bem_candidato";

// ─── helpers ────────────────────────────────────────────────────────────────

function parseLinha(linha: string): string[] {
  return linha.split(";").map((f) => f.replace(/^"|"$/g, "").trim());
}

function parseBRL(valor: string): number {
  if (!valor || valor === '""') return 0;
  return parseFloat(valor.replace(/\./g, "").replace(",", ".")) || 0;
}

async function downloadZip(url: string, destPath: string): Promise<void> {
  console.log(`  Baixando ${url}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download falhou: ${res.status} ${url}`);
  const ws = createWriteStream(destPath);
  const nodeStream = Readable.fromWeb(
    res.body as Parameters<typeof Readable.fromWeb>[0]
  );
  await pipeline(nodeStream, ws);
  console.log(`  ZIP salvo em ${destPath}`);
}

function nomeCsvNoZip(zipPath: string, ano: number): string | null {
  try {
    const out = execSync(`unzip -Z1 "${zipPath}"`, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
    });
    const entries = out
      .split("\n")
      .map((l) => l.trim())
      .filter((e) => e.endsWith(".csv"));

    // Prioridade: BRASIL > BR > qualquer outro CSV com o ano
    // (alguns anos têm bem_candidato_2018_BRASIL.csv como arquivo completo
    //  e bem_candidato_2018_BR.csv como arquivo reduzido/por estado)
    const brasil = entries.find((e) =>
      e.toLowerCase().includes(`bem_candidato_${ano}_brasil`)
    );
    if (brasil) return brasil;

    const br = entries.find((e) =>
      e.toLowerCase().includes(`bem_candidato_${ano}_br`) &&
      !e.toLowerCase().includes("brasil")
    );
    if (br) return br;

    // fallback: primeiro CSV com o ano no nome
    return entries.find((e) => e.includes(String(ano))) ?? entries[0] ?? null;
  } catch {
    return null;
  }
}

// ─── interfaces ─────────────────────────────────────────────────────────────

export interface JobIngestaoTseBensConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anosEleitorais?: number[]; // default: [2022, 2018]
  manter_zip?: boolean;
}

export interface ResultadoJobTseBens {
  status: "sucesso" | "erro";
  resultados_por_ano: Array<{
    ano: number;
    total_csv: number;
    filtrados: number;
    inseridos: number;
    erros: number;
    duracao_ms: number;
    erro?: string;
  }>;
  erro?: string;
}

// ─── função principal ────────────────────────────────────────────────────────

export async function jobIngestaoTseBens(
  config: JobIngestaoTseBensConfig
): Promise<ResultadoJobTseBens> {
  const sb = createSupabaseClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey
  );
  const anos = config.anosEleitorais ?? ANOS_ELEITORAIS_DEFAULT;
  const tmpDir = join(tmpdir(), "transparencia-tse-bens");
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

  const resultados_por_ano: ResultadoJobTseBens["resultados_por_ano"] = [];

  for (const ano of anos) {
    const t0 = Date.now();
    let total_csv = 0,
      filtrados = 0,
      inseridos = 0,
      erros = 0;
    const zipPath = join(tmpDir, `tse_bens_${ano}.zip`);
    const zipUrl = `${CDN_BASE}/bem_candidato_${ano}.zip`;

    console.log(`\n  [${ano}] Iniciando ingestão de bens...`);

    try {
      // 1. Download
      if (!existsSync(zipPath)) {
        await downloadZip(zipUrl, zipPath);
      } else {
        console.log(`  [${ano}] ZIP já existe, reutilizando.`);
      }

      // 2. Identificar CSV dentro do ZIP
      const csvEntry = nomeCsvNoZip(zipPath, ano);
      if (!csvEntry) {
        throw new Error(`Nenhum CSV encontrado no ZIP de ${ano}`);
      }
      console.log(`  [${ano}] CSV encontrado: ${csvEntry}`);

      // 3. Extrair e decodificar
      const rawBuf = execSync(`unzip -p "${zipPath}" "${csvEntry}"`, {
        encoding: "buffer",
        maxBuffer: 500 * 1024 * 1024,
      });
      const content = rawBuf.toString("latin1");
      const lines = content.split("\n");
      console.log(`  [${ano}] ${lines.length} linhas lidas do CSV`);

      // 4. Carregar candidatos válidos em memória (paginado — Supabase limite 1000/query)
      console.log(`  [${ano}] Carregando candidatos válidos do Supabase...`);
      const candidatosValidos = new Set<string>();
      let page = 0;
      const PAGE_SIZE = 1000;
      while (true) {
        const { data: candidatosDb, error: errCands } = await sb
          .from("tse_candidatos_receitas_agg")
          .select("sq_candidato")
          .eq("ano_eleicao", ano)
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

        if (errCands) throw new Error(`Erro ao buscar candidatos: ${errCands.message}`);
        if (!candidatosDb || candidatosDb.length === 0) break;
        for (const c of candidatosDb) candidatosValidos.add(c.sq_candidato);
        if (candidatosDb.length < PAGE_SIZE) break;
        page++;
      }
      console.log(`  [${ano}] ${candidatosValidos.size} candidatos válidos`);

      // 5. Parsear linhas
      // mapa: chave = "sq_candidato|ano|nr_ordem" → evitar duplicatas
      const mapa = new Map<
        string,
        {
          sq_candidato: string;
          ano_eleicao: number;
          sg_uf: string | null;
          nr_ordem: number;
          cd_tipo: number | null;
          ds_tipo: string | null;
          ds_bem: string | null;
          vr_bem: number;
        }
      >();

      let isHeader = true;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
        if (isHeader) {
          isHeader = false;
          continue;
        }

        total_csv++;
        const f = parseLinha(line);

        // índices conforme header documentado
        const anoEleicao = parseInt(f[2] ?? "", 10);
        const sg_uf = f[8]?.trim() || null;
        const sq_candidato = f[11]?.trim() ?? "";
        const nr_ordem = parseInt(f[12] ?? "1", 10) || 1;
        const cd_tipo = parseInt(f[13] ?? "", 10) || null;
        const ds_tipo = f[14]?.trim() || null;
        const ds_bem = f[15]?.trim() || null;
        const vr_bem = parseBRL(f[16] ?? "0");

        if (!sq_candidato) continue;
        if (!candidatosValidos.has(sq_candidato)) continue;

        filtrados++;
        const key = `${sq_candidato}|${anoEleicao}|${nr_ordem}`;
        mapa.set(key, {
          sq_candidato,
          ano_eleicao: isNaN(anoEleicao) ? ano : anoEleicao,
          sg_uf,
          nr_ordem,
          cd_tipo: isNaN(cd_tipo as number) ? null : cd_tipo,
          ds_tipo,
          ds_bem,
          vr_bem,
        });
      }

      const rows = Array.from(mapa.values());
      console.log(
        `  [${ano}] ${total_csv} linhas lidas, ${filtrados} filtradas, ${rows.length} únicas`
      );

      // 6. Upsert tse_bens_candidatos em lotes
      for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
        const lote = rows.slice(i, i + TAMANHO_LOTE);
        const { error } = await sb
          .from("tse_bens_candidatos")
          .upsert(lote, { onConflict: "sq_candidato,ano_eleicao,nr_ordem" });
        if (error) {
          erros += lote.length;
          console.error(`    Upsert erro: ${error.message}`);
        } else {
          inseridos += lote.length;
        }
      }

      // 7. Computar e upsert tse_bens_agg
      const aggMap = new Map<
        string,
        { sq_candidato: string; ano_eleicao: number; total_bens: number; total_patrimonio: number }
      >();
      for (const r of rows) {
        const key = `${r.sq_candidato}|${r.ano_eleicao}`;
        const existing = aggMap.get(key);
        if (existing) {
          existing.total_bens++;
          existing.total_patrimonio += r.vr_bem;
        } else {
          aggMap.set(key, {
            sq_candidato: r.sq_candidato,
            ano_eleicao: r.ano_eleicao,
            total_bens: 1,
            total_patrimonio: r.vr_bem,
          });
        }
      }

      const aggRows = Array.from(aggMap.values());
      for (let i = 0; i < aggRows.length; i += TAMANHO_LOTE) {
        const lote = aggRows.slice(i, i + TAMANHO_LOTE);
        const { error } = await sb
          .from("tse_bens_agg")
          .upsert(lote, { onConflict: "sq_candidato,ano_eleicao" });
        if (error) {
          console.error(`    Upsert agg erro: ${error.message}`);
        }
      }
      console.log(`  [${ano}] ${aggRows.length} entradas upsertadas em tse_bens_agg`);

      // 8. Deletar ZIP
      if (!config.manter_zip) {
        await unlink(zipPath);
        console.log(`  [${ano}] ZIP removido.`);
      }

      const duracao_ms = Date.now() - t0;
      console.log(
        `  [${ano}] ✓ total_csv=${total_csv} filtrados=${filtrados} inseridos=${inseridos} erros=${erros} — ${duracao_ms}ms`
      );
      resultados_por_ano.push({ ano, total_csv, filtrados, inseridos, erros, duracao_ms });
    } catch (err) {
      const erro = err instanceof Error ? err.message : String(err);
      console.error(`  [${ano}] ERRO: ${erro}`);
      const duracao_ms = Date.now() - t0;
      resultados_por_ano.push({ ano, total_csv, filtrados, inseridos, erros, duracao_ms, erro });
    }
  }

  const temErro = resultados_por_ano.some((r) => r.erro);
  return {
    status: temErro ? "erro" : "sucesso",
    resultados_por_ano,
  };
}
