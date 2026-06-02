/**
 * Ingestão das ARESTAS fundo→fundo da CDA (Composição e Diversificação das
 * Aplicações) → cvm_carteira_edge.
 *
 * Fonte: dados.cvm.gov.br/dados/FI/DOC/CDA/DADOS/cda_fi_YYYYMM.zip (universo 555).
 * O ZIP mensal tem ~11 CSVs (latin-1, `;`), um por bloco de ativo. O bloco de
 * COTAS DE FUNDOS é o BLC_2 — recon 01/jun/2026, header:
 *   ...;CNPJ_FUNDO_CLASSE;DENOM_SOCIAL;DT_COMPTC;...;VL_MERC_POS_FINAL;...;
 *   CNPJ_FUNDO_CLASSE_COTA;ID_SUBCLASSE;NM_FUNDO_CLASSE_SUBCLASSE_COTA
 * Aresta: detentor = CNPJ_FUNDO_CLASSE → detido = CNPJ_FUNDO_CLASSE_COTA.
 *
 * Enxuto: só as 5 colunas da aresta; descompacta SÓ o BLC_2 via `unzip -p`
 * (stream, sem materializar o ZIP inteiro de 250MB).
 */
import { execFileSync } from "child_process";
import { writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { fetchResourceBuffer } from "./ckan-client.js";
import { eachRow, normCNPJ, parseValorBR, parseDataBR } from "./csv.js";
import { flushUpsert, sb, finalizar, type IngestResult } from "./ingest-util.js";

const BASE = "https://dados.cvm.gov.br/dados/FI/DOC/CDA/DADOS";

/** Baixa o zip do mês (se ainda não estiver em disco) e devolve o caminho local. */
async function obterZip(mes: string, zipLocal?: string): Promise<string> {
  if (zipLocal && existsSync(zipLocal)) return zipLocal;
  const dest = resolve(tmpdir(), `cda_fi_${mes}.zip`);
  if (existsSync(dest)) return dest;
  const buf = await fetchResourceBuffer(`${BASE}/cda_fi_${mes}.zip`);
  writeFileSync(dest, buf);
  return dest;
}

export async function ingestCdaEdges(mes: string, zipLocal?: string): Promise<IngestResult> {
  const erros: string[] = [];
  let header: string[] = [];
  let texto: string;
  try {
    const zip = await obterZip(mes, zipLocal);
    // Extrai só o BLC_2 (cotas de fundos) pro stdout, decodificando latin-1.
    texto = execFileSync("unzip", ["-p", zip, `cda_fi_BLC_2_${mes}.csv`], {
      encoding: "latin1",
      maxBuffer: 512 * 1024 * 1024,
    });
  } catch (e) {
    return { status: "erro", total: 0, inseridos: 0, header, erros: [`carga BLC_2 ${mes}: ${e instanceof Error ? e.message : e}`] };
  }

  const client = sb();
  let inseridos = 0;
  let idx = { holder: -1, held: -1, nome: -1, vl: -1, dt: -1 };
  let buffer: Record<string, unknown>[] = [];
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const total = eachRow(
    texto,
    (h) => {
      header = h;
      const find = (...c: string[]) => h.findIndex((x) => c.includes(norm(x)));
      idx = {
        holder: find("cnpj_fundo_classe", "cnpj_fundo"),
        held: find("cnpj_fundo_classe_cota"),
        nome: find("nm_fundo_classe_subclasse_cota", "denom_social_cota"),
        vl: find("vl_merc_pos_final"),
        dt: find("dt_comptc"),
      };
    },
    (cols) => {
      const holder = normCNPJ(cols[idx.holder] ?? "");
      const held = normCNPJ(cols[idx.held] ?? "");
      if (!holder || !held) return; // só arestas fundo→fundo completas
      buffer.push({
        cnpj_fundo: holder,
        cnpj_ativo: held,
        denom_ativo: (cols[idx.nome] ?? "").trim() || null,
        tipo_aplic: "Cotas de Fundos",
        vl_merc: parseValorBR(cols[idx.vl] ?? ""),
        dt_comptc: parseDataBR(cols[idx.dt] ?? ""),
      });
    },
  );

  // flush em lotes (o eachRow não awaita; drenamos o buffer em blocos aqui).
  for (let i = 0; i < buffer.length; i += 500) {
    inseridos += await flushUpsert(client, "cvm_carteira_edge", "cnpj_fundo,cnpj_ativo,dt_comptc", buffer.slice(i, i + 500), erros);
  }
  return finalizar(total, inseridos, erros, header);
}
