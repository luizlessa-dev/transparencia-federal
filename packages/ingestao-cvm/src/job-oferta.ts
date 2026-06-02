/**
 * Ingestão de ofertas públicas de distribuição → cvm_oferta (emissores).
 *
 * Fonte: dados.cvm.gov.br/dados/OFERTA/DISTRIB/DADOS/oferta_distribuicao.zip
 * Dois CSVs (latin-1, `;`):
 *   oferta_distribuicao.csv  — ICVM 400 + histórico (Tipo_Ativo, Valor_Total)
 *   oferta_resolucao_160.csv — RCVM 160 (Valor_Mobiliario, Valor_Total_Registrado)
 * Ambos têm CNPJ_Emissor/Nome_Emissor → base do cross emissor × sancionada.
 * Muitos registros antigos vêm sem CNPJ (fica null; o cross só usa os com CNPJ).
 */
import { execFileSync } from "child_process";
import { writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { fetchResourceBuffer } from "./ckan-client.js";
import { eachRow, normCNPJ, parseValorBR, parseDataBR, normHeader } from "./csv.js";
import { flushUpsert, sb, finalizar, type IngestResult } from "./ingest-util.js";

const URL_ZIP = "https://dados.cvm.gov.br/dados/OFERTA/DISTRIB/DADOS/oferta_distribuicao.zip";

async function obterZip(zipLocal?: string): Promise<string> {
  if (zipLocal && existsSync(zipLocal)) return zipLocal;
  const dest = resolve(tmpdir(), "oferta_distribuicao.zip");
  if (existsSync(dest)) return dest;
  writeFileSync(dest, await fetchResourceBuffer(URL_ZIP));
  return dest;
}

function extrair(zip: string, membro: string): string {
  return execFileSync("unzip", ["-p", zip, membro], { encoding: "latin1", maxBuffer: 256 * 1024 * 1024 });
}

type ColMap = (h: string[]) => Record<string, number>;

async function ingestArquivo(
  texto: string,
  colmap: ColMap,
  build: (cols: string[], C: Record<string, number>) => Record<string, unknown> | null,
  client: ReturnType<typeof sb>,
  erros: string[],
): Promise<{ total: number; inseridos: number }> {
  let C: Record<string, number> = {};
  let buffer: Record<string, unknown>[] = [];
  let inseridos = 0;
  const total = eachRow(
    texto,
    (h) => { C = colmap(h); },
    (cols) => { const row = build(cols, C); if (row) buffer.push(row); },
  );
  for (let i = 0; i < buffer.length; i += 500) {
    inseridos += await flushUpsert(client, "cvm_oferta", "id_oferta,cnpj_emissor,tipo_ativo", buffer.slice(i, i + 500), erros);
  }
  return { total, inseridos };
}

const find = (h: string[], ...c: string[]) => h.findIndex((x) => c.includes(normHeader(x)));
const at = (cols: string[], i: number) => (i >= 0 ? (cols[i] ?? "").trim() : "");

export async function ingestOfertas(zipLocal?: string): Promise<IngestResult> {
  const erros: string[] = [];
  let zip: string;
  try {
    zip = await obterZip(zipLocal);
  } catch (e) {
    return { status: "erro", total: 0, inseridos: 0, header: [], erros: [`zip: ${e instanceof Error ? e.message : e}`] };
  }
  const client = sb();
  let total = 0, inseridos = 0;

  // ── oferta_distribuicao.csv (ICVM 400 + histórico) ──
  try {
    const txt = extrair(zip, "oferta_distribuicao.csv");
    const r = await ingestArquivo(
      txt,
      (h) => ({
        id: find(h, "numero_registro_oferta", "numero_processo"),
        cnpj: find(h, "cnpj_emissor"),
        nome: find(h, "nome_emissor"),
        tipo: find(h, "tipo_ativo"),
        valor: find(h, "valor_total"),
        data: find(h, "data_registro_oferta", "data_inicio_oferta", "data_encerramento_oferta"),
        rito: find(h, "rito_oferta"),
      }),
      (cols, C) => {
        const id = at(cols, C.id) || null;
        const cnpj = normCNPJ(at(cols, C.cnpj)) || null;
        const tipo = at(cols, C.tipo) || null;
        if (!id && !cnpj) return null;
        return {
          id_oferta: id, cnpj_emissor: cnpj, nome_emissor: at(cols, C.nome) || null,
          tipo_ativo: tipo, valor: parseValorBR(at(cols, C.valor)),
          data_oferta: parseDataBR(at(cols, C.data)), situacao: null, rito: at(cols, C.rito) || null,
        };
      },
      client, erros,
    );
    total += r.total; inseridos += r.inseridos;
  } catch (e) { erros.push(`oferta_distribuicao: ${e instanceof Error ? e.message : e}`); }

  // ── oferta_resolucao_160.csv (RCVM 160) ──
  try {
    const txt = extrair(zip, "oferta_resolucao_160.csv");
    const r = await ingestArquivo(
      txt,
      (h) => ({
        id: find(h, "numero_requerimento", "numero_processo"),
        cnpj: find(h, "cnpj_emissor"),
        nome: find(h, "nome_emissor"),
        tipo: find(h, "valor_mobiliario"),
        valor: find(h, "valor_total_registrado"),
        data: find(h, "data_registro", "data_requerimento"),
        rito: find(h, "rito_requerimento"),
        situacao: find(h, "status_requerimento"),
      }),
      (cols, C) => {
        const id = at(cols, C.id) || null;
        const cnpj = normCNPJ(at(cols, C.cnpj)) || null;
        const tipo = at(cols, C.tipo) || null;
        if (!id && !cnpj) return null;
        return {
          id_oferta: id, cnpj_emissor: cnpj, nome_emissor: at(cols, C.nome) || null,
          tipo_ativo: tipo, valor: parseValorBR(at(cols, C.valor)),
          data_oferta: parseDataBR(at(cols, C.data)), situacao: at(cols, C.situacao) || null, rito: at(cols, C.rito) || null,
        };
      },
      client, erros,
    );
    total += r.total; inseridos += r.inseridos;
  } catch (e) { erros.push(`oferta_resolucao_160: ${e instanceof Error ? e.message : e}`); }

  return finalizar(total, inseridos, erros, []);
}
