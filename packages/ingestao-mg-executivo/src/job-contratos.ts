/**
 * Ingestão flat de Contratos e Empresas Sancionadas do Executivo de MG.
 * Cruzamento por CNPJ normalizado (view mg_contratos_sancionados).
 *
 * Fontes CKAN dados.mg.gov.br (CC-BY-4.0):
 *   contratos   = portal_contratos (SEPLAG), contratosANO.csv
 *   sancionadas = empresas_sancionadas (CGE), empresas_sancionadas.csv
 * Ambos UTF-8, separador `;`, valores BR/ponto (parseValorBR cobre os dois).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchResourceText } from "./ckan-client.js";
import { parseCSV, mapColunas, parseValorBR, parseDataBR, normCNPJ } from "./csv.js";

export type ContratosOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  resourceUrl: string;
  encoding?: "utf-8" | "latin1";
};

export type IngestResult = {
  status: "ok" | "parcial" | "erro";
  total: number;
  inseridos: number;
  erros: string[];
  header: string[];
};

function sb(opts: ContratosOpts): SupabaseClient {
  return createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, { auth: { persistSession: false } });
}

function colFinder(header: string[]) {
  const idx = mapColunas(header);
  return (...cands: string[]) => {
    for (const c of cands) {
      const i = idx(c);
      if (i >= 0) return i;
    }
    return -1;
  };
}

async function carregar(opts: ContratosOpts): Promise<{ header: string[]; linhas: string[][] }> {
  const txt = await fetchResourceText(opts.resourceUrl, opts.encoding ?? "utf-8");
  return parseCSV(txt);
}

async function flushUpsert(
  client: SupabaseClient,
  tabela: string,
  onConflict: string,
  buffer: Record<string, unknown>[],
  erros: string[],
): Promise<number> {
  if (!buffer.length) return 0;
  const { error } = await client.from(tabela).upsert(buffer, { onConflict, ignoreDuplicates: true });
  if (error) {
    erros.push(`upsert ${tabela}: ${error.message}`);
    return 0;
  }
  return buffer.length;
}

// ── Empresas sancionadas ────────────────────────────────────────────────────
export async function ingestSancionadas(opts: ContratosOpts): Promise<IngestResult> {
  const erros: string[] = [];
  let header: string[] = [];
  let linhas: string[][] = [];
  try {
    ({ header, linhas } = await carregar(opts));
  } catch (e) {
    return { status: "erro", total: 0, inseridos: 0, header, erros: [`carga: ${e instanceof Error ? e.message : e}`] };
  }
  const c = colFinder(header);
  const C = {
    cnpj: c("cnpj"),
    empresa: c("empresas_processadas", "empresa"),
    tipo: c("tipo_societario"),
    conduta: c("conduta"),
    decisao: c("decisao"),
    fase: c("fase"),
    multa: c("valor_multa_aplicada", "valor_multa"),
    instaurador: c("orgao_instaurador"),
    lesado: c("orgao_lesado"),
    ano: c("ano"),
    dataDecisao: c("data_publicacao_decisao"),
    sei: c("sei"),
  };
  const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  const client = sb(opts);
  let inseridos = 0;
  let buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const cnpjFmt = at(l, C.cnpj);
    buffer.push({
      cnpj_norm: normCNPJ(cnpjFmt) || null,
      cnpj_fmt: cnpjFmt || null,
      empresa: at(l, C.empresa) || null,
      tipo_societario: at(l, C.tipo) || null,
      conduta: at(l, C.conduta) || null,
      decisao: at(l, C.decisao) || null,
      fase: at(l, C.fase) || null,
      valor_multa: parseValorBR(at(l, C.multa)),
      orgao_instaurador: at(l, C.instaurador) || null,
      orgao_lesado: at(l, C.lesado) || null,
      ano: Number(at(l, C.ano)) || null,
      data_publicacao_decisao: parseDataBR(at(l, C.dataDecisao)),
      sei: at(l, C.sei) || null,
    });
    if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_empresas_sancionadas", "cnpj_norm,sei", buffer, erros); buffer = []; }
  }
  inseridos += await flushUpsert(client, "mg_empresas_sancionadas", "cnpj_norm,sei", buffer, erros);
  return { status: erros.length === 0 ? "ok" : inseridos > 0 ? "parcial" : "erro", total: linhas.length, inseridos, erros, header };
}

// ── Contratos ───────────────────────────────────────────────────────────────
export async function ingestContratos(opts: ContratosOpts): Promise<IngestResult> {
  const erros: string[] = [];
  let header: string[] = [];
  let linhas: string[][] = [];
  try {
    ({ header, linhas } = await carregar(opts));
  } catch (e) {
    return { status: "erro", total: 0, inseridos: 0, header, erros: [`carga: ${e instanceof Error ? e.message : e}`] };
  }
  const c = colFinder(header);
  const C = {
    ano: c("ano_assinatura_contrato", "ano"),
    orgaoCod: c("codigo_orgao_entidade_contratante"),
    orgao: c("nome_orgao_entidade_contratante"),
    fornecedor: c("nome_empresarial_nome_fornecedor"),
    cnpj: c("cnpj_cpf_fornecedor_formatado"),
    tipoPessoa: c("tipo_pessoa_fornecedor"),
    numContrato: c("numero_contrato"),
    numProcesso: c("numero_processo_formatado"),
    situacao: c("situacao_contrato"),
    tipoContrato: c("descricao_tipo_de_contrato"),
    objeto: c("objeto_contrato"),
    dataAss: c("data_assinatura_contrato"),
    dataIni: c("data_inicio_vigencia_contrato"),
    dataFim: c("data_termino_vigencia_contrato"),
    valorTotal: c("valor_total_atualizado"),
    valorEmp: c("valor_despesa_empenhada"),
    valorLiq: c("valor_despesa_liquidada"),
  };
  const at = (l: string[], i: number) => (i >= 0 ? (l[i] ?? "").trim() : "");
  const client = sb(opts);
  let inseridos = 0;
  let buffer: Record<string, unknown>[] = [];
  for (const l of linhas) {
    const fornecedor = at(l, C.fornecedor);
    if (!fornecedor && !at(l, C.numContrato)) continue;
    const cnpjFmt = at(l, C.cnpj);
    buffer.push({
      ano: Number(at(l, C.ano)) || null,
      orgao_codigo: at(l, C.orgaoCod) || null,
      orgao: at(l, C.orgao) || null,
      fornecedor: fornecedor || null,
      cnpj_norm: normCNPJ(cnpjFmt) || null,
      cnpj_fmt: cnpjFmt || null,
      tipo_pessoa: at(l, C.tipoPessoa) || null,
      numero_contrato: at(l, C.numContrato) || null,
      numero_processo: at(l, C.numProcesso) || null,
      situacao: at(l, C.situacao) || null,
      tipo_contrato: at(l, C.tipoContrato) || null,
      objeto: at(l, C.objeto) || null,
      data_assinatura: parseDataBR(at(l, C.dataAss)),
      data_inicio: parseDataBR(at(l, C.dataIni)),
      data_termino: parseDataBR(at(l, C.dataFim)),
      valor_total: parseValorBR(at(l, C.valorTotal)),
      valor_empenhado: parseValorBR(at(l, C.valorEmp)),
      valor_liquidado: parseValorBR(at(l, C.valorLiq)),
    });
    if (buffer.length >= 500) { inseridos += await flushUpsert(client, "mg_contratos", "numero_contrato,cnpj_norm,ano", buffer, erros); buffer = []; }
  }
  inseridos += await flushUpsert(client, "mg_contratos", "numero_contrato,cnpj_norm,ano", buffer, erros);
  return { status: erros.length === 0 ? "ok" : inseridos > 0 ? "parcial" : "erro", total: linhas.length, inseridos, erros, header };
}
