/**
 * Job: ingere remuneração de servidores do Executivo de MG → mg_remuneracao.
 * Foco do MVP: supersalários.
 *
 * Fonte CONFIRMADA: dataset CKAN `remuneracao-servidores-ativos` (CGE),
 * CSVs mensais `servidores-YYYY-MM.csv(.gz)`. Colunas (via datastore):
 *   nome, masp(matrícula), descsitser(situação ATIVO/INATIVO), nmefet(cargo
 *   efetivo), desccomi(cargo comissionado), descinst(órgão), descunid(unidade),
 *   carga_hora, remuner(bruto), ir, prev, rem_pos(líquido), teto(ABATE-TETO),
 *   ferias, decter(13º), premio, jetons, eventual, ...
 *
 * ⚠️ Valores vêm em CENTAVOS inteiros sem separador ("3452656" = R$ 34.526,56).
 *    Conferido: remuner − ir − prev = rem_pos. Por isso valorFormat='centavos'.
 *
 * ⚠️ `teto` é o VALOR DO ABATE-TETO (corte por exceder o teto). teto > 0 é o
 *    sinal OFICIAL de supersalário — vai pra coluna abate_teto, e acima_teto
 *    (gerada na tabela) usa esse sinal.
 *
 * Idempotência: UNIQUE (snapshot_mes, orgao, servidor_nome, cargo,
 * remuneracao_base) + ignoreDuplicates.
 */
import { createClient } from "@supabase/supabase-js";
import { datastoreSearch, fetchResourceText } from "./ckan-client.js";
import { parseCSV, mapColunas, parseCentavos, parseValorBR, snapshotMesISO } from "./csv.js";

/** Campos do nosso schema → candidatos de nome de coluna na fonte (case/acento-insensitive). */
export type ColMap = Record<
  | "orgao"
  | "unidade"
  | "servidor_nome"
  | "servidor_id_externo"
  | "cargo_efetivo"
  | "cargo_comissionado"
  | "situacao"
  | "carga_horaria"
  | "remuner"
  | "ir"
  | "prev"
  | "rem_pos"
  | "abate_teto",
  string[]
>;

export const COLMAP_PADRAO: ColMap = {
  // ⚠️ No CSV real de MG a coluna de órgão é `orgao_exercicio` (e `orgao_origem`),
  // NÃO `descinst` (esse é o nome no datastore). Confirmado via dados.jsonb.
  orgao: ["orgao_exercicio", "orgao_origem", "descinst", "orgao", "instituicao"],
  unidade: ["unidade_exercicio", "descunid", "unidade"],
  servidor_nome: ["nome", "servidor", "nome_servidor"],
  servidor_id_externo: ["masp", "matricula"],
  cargo_efetivo: ["cargo_efetivo", "nmefet", "cargo"],
  cargo_comissionado: ["cargo_comissao", "desccomi", "cargo_comissionado", "comissao", "simbolo_cargo"],
  situacao: ["situacao_servidor", "descsitser", "situacao"],
  carga_horaria: ["carga_horaria_semanal", "carga_hora", "carga_horaria"],
  remuner: ["remuneracao", "remuner", "remuneracao_bruta", "bruto"],
  ir: ["imposto_renda", "ir"],
  prev: ["previdencia", "prev"],
  rem_pos: ["remuneracao_liquida", "rem_pos", "liquido"],
  abate_teto: ["abate_teto", "teto", "abate"],
};

export type JobRemuneracaoOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  resourceUrl?: string;
  resourceId?: string;
  encoding?: "utf-8" | "latin1"; // default latin1 (acentos da fonte MG)
  /** Como ler os valores. 'centavos' (default p/ este dataset) | 'br' (vírgula decimal). */
  valorFormat?: "centavos" | "br";
  snapshotMes?: string; // YYYY-MM-01; default mês corrente
  ano?: number;
  mes?: number;
  tetoReferencia?: number; // sobrescreve o default da tabela
  /** Se true, grava SÓ supersalários (abate_teto > 0). Parse dos demais é em
   *  memória mas não vai pro banco — tabela enxuta, ingest rápido e robusto. */
  soSupersalarios?: boolean;
  colmap?: Partial<ColMap>;
  onProgress?: (info: { lidos: number; inseridos: number; supersalarios: number }) => void;
};

export type JobRemuneracaoResult = {
  status: "ok" | "erro" | "parcial";
  snapshotMes: string;
  totalLinhas: number;
  inseridos: number;
  supersalarios: number;
  headerDetectado: string[];
  colunasNaoEncontradas: string[];
  erros: string[];
};

type Row = Record<string, unknown>;

// Campos guardados no `dados` jsonb (SLIM) — só a quebra de proventos que não
// vira coluna, pra transparência (penduricalhos). Evita gravar a linha inteira
// (~40 campos = ~1,5KB/linha → inchava a tabela pra GBs).
const DADOS_KEYS = [
  "remuneracao", "ferias", "decimo_terceiro", "premio",
  "ferias_premio", "jetons", "eventual", "orgao_origem", "mes_ano",
];

function resolver(idx: (n: string) => number, candidatos: string[]): number {
  for (const c of candidatos) {
    const i = idx(c);
    if (i >= 0) return i;
  }
  return -1;
}

export async function jobIngestaoRemuneracao(opts: JobRemuneracaoOpts): Promise<JobRemuneracaoResult> {
  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const snapshotMes = opts.snapshotMes ?? snapshotMesISO();
  const colmap: ColMap = { ...COLMAP_PADRAO, ...(opts.colmap ?? {}) } as ColMap;
  // ⚠️ A fonte de MG usa DECIMAL BR ("89581,3" = 89.581,30, casas variáveis),
  // NÃO centavos inteiros. Default = br. parseCentavos só se explicitado.
  const parseValor = opts.valorFormat === "centavos" ? parseCentavos : parseValorBR;
  const erros: string[] = [];

  // 1. Carrega header + linhas como arrays posicionais.
  let header: string[] = [];
  let linhas: string[][] = [];
  try {
    if (opts.resourceUrl) {
      const txt = await fetchResourceText(opts.resourceUrl, opts.encoding ?? "latin1");
      const csv = parseCSV(txt);
      header = csv.header;
      linhas = csv.linhas;
    } else if (opts.resourceId) {
      let offset = 0;
      const limit = 1000;
      let fieldOrder: string[] = [];
      for (;;) {
        const page = await datastoreSearch(opts.resourceId, { limit, offset });
        if (offset === 0) {
          fieldOrder = page.fields.map((f) => f.id).filter((id) => id !== "_id");
          header = fieldOrder;
        }
        for (const rec of page.records) linhas.push(fieldOrder.map((f) => String(rec[f] ?? "")));
        offset += page.records.length;
        if (page.records.length < limit || offset >= page.total) break;
      }
    } else {
      return { status: "erro", snapshotMes, totalLinhas: 0, inseridos: 0, supersalarios: 0,
        headerDetectado: [], colunasNaoEncontradas: [], erros: ["informe resourceUrl ou resourceId"] };
    }
  } catch (err) {
    return { status: "erro", snapshotMes, totalLinhas: 0, inseridos: 0, supersalarios: 0,
      headerDetectado: header, colunasNaoEncontradas: [],
      erros: [`carga da fonte: ${err instanceof Error ? err.message : String(err)}`] };
  }

  // 2. Resolve índices de coluna.
  const idx = mapColunas(header);
  const col = Object.fromEntries(
    (Object.keys(colmap) as (keyof ColMap)[]).map((k) => [k, resolver(idx, colmap[k])]),
  ) as Record<keyof ColMap, number>;

  const naoEncontradas = (["servidor_nome", "remuner"] as (keyof ColMap)[]).filter((k) => col[k] < 0);
  if (naoEncontradas.length) {
    return { status: "erro", snapshotMes, totalLinhas: linhas.length, inseridos: 0, supersalarios: 0,
      headerDetectado: header, colunasNaoEncontradas: naoEncontradas,
      erros: [`colunas essenciais não encontradas: ${naoEncontradas.join(", ")}. Header: ${header.join(" | ")}`] };
  }

  const at = (l: string[], c: number) => (c >= 0 ? l[c] : undefined);

  // 3. Monta linhas e faz upsert em lotes.
  const ano = opts.ano ?? Number(snapshotMes.slice(0, 4));
  const mes = opts.mes ?? Number(snapshotMes.slice(5, 7));
  const teto = opts.tetoReferencia;
  const FLUSH = 500;
  let inseridos = 0;
  let supersalarios = 0;
  let buffer: Row[] = [];

  const flush = async () => {
    if (!buffer.length) return;
    const { error } = await supabase.from("mg_remuneracao").upsert(buffer, {
      onConflict: "snapshot_mes,orgao,servidor_nome,cargo,remuneracao_base",
      ignoreDuplicates: true,
    });
    if (error) erros.push(`upsert lote: ${error.message}`);
    else inseridos += buffer.length;
    buffer = [];
  };

  for (const l of linhas) {
    const nome = (at(l, col.servidor_nome) ?? "").trim();
    if (!nome) continue;
    const basica = parseValor(at(l, col.remuner));   // remuneração básica (campo `remuneracao`)
    const liquida = parseValor(at(l, col.rem_pos));
    const ir = parseValor(at(l, col.ir)) ?? 0;
    const prev = parseValor(at(l, col.prev)) ?? 0;
    const abate = parseValor(at(l, col.abate_teto));
    // BRUTO TOTAL real = líquida + IR + previdência + abate-teto. Reconstrói
    // todos os rendimentos do mês (inclui eventuais/retroativos/penduricalhos),
    // não só a parcela básica. Fallback p/ básica se não houver líquida.
    const bruta = liquida != null ? liquida + ir + prev + (abate ?? 0) : basica;
    const base = bruta;
    const cargo = (at(l, col.cargo_comissionado) ?? "").trim() || (at(l, col.cargo_efetivo) ?? "").trim() || null;
    const acimaPorAbate = (abate ?? 0) > 0;
    if (acimaPorAbate || (base != null && teto != null && base > teto)) supersalarios++;
    // Modo enxuto: só grava quem teve corte oficial (abate > 0).
    if (opts.soSupersalarios && !acimaPorAbate) continue;

    buffer.push({
      snapshot_mes: snapshotMes,
      ano, mes,
      poder: "executivo",
      orgao: (at(l, col.orgao) ?? null) || null,
      servidor_nome: nome,
      servidor_id_externo: (at(l, col.servidor_id_externo) ?? null) || null,
      cargo,
      funcao: (at(l, col.cargo_comissionado) ?? null) || null,
      situacao: (at(l, col.situacao) ?? null) || null,
      carga_horaria: (at(l, col.carga_horaria) ?? null) || null,
      remuneracao_bruta: bruta,
      descontos: ir + prev || null,
      remuneracao_liquida: liquida,
      remuneracao_base: base,
      abate_teto: abate,
      ...(teto != null ? { teto_referencia: teto } : {}),
      dados: Object.fromEntries(
        DADOS_KEYS.map((k) => {
          const i = idx(k);
          return i >= 0 ? [k, l[i]] : null;
        }).filter(Boolean) as [string, string][],
      ),
      url_origem: opts.resourceUrl ?? null,
    });
    if (buffer.length >= FLUSH) {
      await flush();
      opts.onProgress?.({ lidos: linhas.length, inseridos, supersalarios });
    }
  }
  await flush();
  opts.onProgress?.({ lidos: linhas.length, inseridos, supersalarios });

  return {
    status: erros.length === 0 ? "ok" : inseridos > 0 ? "parcial" : "erro",
    snapshotMes, totalLinhas: linhas.length, inseridos, supersalarios,
    headerDetectado: header, colunasNaoEncontradas: [], erros,
  };
}
