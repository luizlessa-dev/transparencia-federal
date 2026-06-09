/**
 * job_voos_senado
 * Faz parsing do campo `detalhamento` das passagens aéreas do Senado
 * (ceaps_senado_brutas) e materializa:
 *   - voos_senado                  (1 linha por passageiro × perna)
 *   - voos_senado_parlamentar_agg  (gasto/trechos por senador × ano)
 *   - voos_senado_companhia_agg    (faturamento/share por companhia × ano)
 *   - voos_senado_terceiros_agg    (voos pagos pela cota em nome de não-parlamentar)
 *
 * O parser é defensivo: blocos não reconhecidos são contados e amostrados,
 * nunca derrubam o job. Rode com dryRun=true para auditar a taxa de parse
 * antes de persistir.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const JOB_NOME = "job_voos_senado";
const FILTRO_PASSAGEM = "%passagens aéreas%"; // tipo_despesa ilike

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface SegmentoVoo {
  companhia: string; // normalizada (canônica) ou nome bruto se não for aérea conhecida
  companhia_eh_aerea: boolean;
  agencia: string | null; // preenchido quando companhia_eh_aerea = false
  localizador: string | null;
  passageiro: string;
  vinculo: string;
  eh_parlamentar: boolean;
  voo_numero: string | null;
  origem: string | null;
  destino: string | null;
  data_voo: string | null; // ISO YYYY-MM-DD
}

interface LinhaBruta {
  cod_documento: string;
  ano: number;
  mes: number | null;
  senador_normalizado: string | null;
  senador: string | null;
  detalhamento: string | null;
  valor_reembolsado: number | null;
}

export interface JobVoosSenadoConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  dryRun?: boolean;
}

// ---------------------------------------------------------------------------
// Normalização de companhia aérea
// ---------------------------------------------------------------------------

/** Aéreas conhecidas → rótulo canônico. Chave = substring (uppercase, sem acento). */
const AEREAS: Array<[RegExp, string]> = [
  [/\bAZUL CONECTA\b|\bTWO TAXI\b/, "AZUL CONECTA"],
  [/\bAZUL\b/, "AZUL"],
  [/\bGOL\b|\bVRG\b|\bSMILES\b/, "GOL"],
  [/\bLATAM\b|\bTAM\b/, "LATAM"],
  [/\bAVIANCA\b|\bOCEANAIR\b/, "AVIANCA"],
  [/\bAZUL\b/, "AZUL"],
  [/\bPASSAREDO\b|\bVOEPASS\b/, "VOEPASS"],
  [/\bITA\b/, "ITA"],
  [/\bMAP\b/, "MAP"],
  [/\bWEBJET\b/, "WEBJET"],
  [/\bTRIP\b/, "TRIP"],
  [/\bAEROLINEAS ARGENTINAS\b/, "AEROLINEAS ARGENTINAS"],
  [/\bTAP\b/, "TAP"],
  [/\bAMERICAN AIRLINES\b/, "AMERICAN AIRLINES"],
  [/\bIBERIA\b/, "IBERIA"],
];

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Retorna [companhiaCanonica, ehAerea]. Se não bater nenhuma aérea conhecida,
 * devolve o nome bruto (provável agência de viagem) com ehAerea=false. */
export function normalizarCompanhia(raw: string): [string, boolean] {
  const up = semAcento(raw).toUpperCase().trim();
  for (const [re, canon] of AEREAS) {
    if (re.test(up)) return [canon, true];
  }
  return [raw.trim(), false];
}

// ---------------------------------------------------------------------------
// Parser de detalhamento
// ---------------------------------------------------------------------------

const RE_COMPANHIA = /Companhia A[ée]rea:\s*(.+?)\s*,\s*Localizador:/i;
const RE_LOCALIZADOR = /Localizador:\s*([A-Z0-9]+)/i;
const RE_PASSAGEIRO = /([^,;(]+?)\s*\(\s*Matr[íi]cula\s*\d+\s*,\s*([^)]+?)\s*\)/gi;
const RE_VOO_TRECHO = /Voo:\s*([\d-]+)?\s*-?\s*([A-Z\\\/\s-]+?)\s*-\s*(\d{2}\/\d{2}\/\d{4})/i;
const RE_DATA = /(\d{2})\/(\d{2})\/(\d{4})/;
const RE_AEROPORTO = /\b([A-Z]{3})\b/g;

function dataIso(br: string | null | undefined): string | null {
  if (!br) return null;
  const m = br.match(RE_DATA);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/** Quebra um documento em segmentos (passageiro × perna). Pode devolver vazio
 * se o bloco não casar com o formato esperado. */
export function parseDetalhamento(detalhamento: string): {
  segmentos: SegmentoVoo[];
  blocosTotal: number;
  blocosOk: number;
} {
  const blocos = detalhamento
    .split(";")
    .map((b) => b.trim())
    .filter(Boolean);

  const segmentos: SegmentoVoo[] = [];
  let blocosVoo = 0; // blocos que são voo (têm "Companhia Aérea")
  let blocosCompletos = 0; // voos com passageiro capturado (detalhe completo)

  for (const bloco of blocos) {
    const mComp = bloco.match(RE_COMPANHIA);
    // Sem "Companhia Aérea" → passagem terrestre/aquática ou observação: não é voo.
    if (!mComp) continue;
    blocosVoo++;

    const [companhia, ehAerea] = normalizarCompanhia(mComp[1]);
    const agencia = ehAerea ? null : mComp[1].trim();
    const localizador = bloco.match(RE_LOCALIZADOR)?.[1] ?? null;

    // Passageiros (pode haver mais de um por bloco). Isola a seção entre
    // "Passageiros:" e "Voo:" para não capturar o prefixo "Localizador: XXX."
    // antes do nome.
    const iPass = bloco.search(/Passageiros?:/i);
    let secPass = "";
    if (iPass >= 0) {
      secPass = bloco.slice(iPass).replace(/Passageiros?:/i, "");
      const iVoo = secPass.search(/\bVoo:/i);
      if (iVoo >= 0) secPass = secPass.slice(0, iVoo);
    }
    const passageiros: Array<{ nome: string; vinculo: string }> = [];
    let mp: RegExpExecArray | null;
    RE_PASSAGEIRO.lastIndex = 0;
    while ((mp = RE_PASSAGEIRO.exec(secPass)) !== null) {
      const nome = mp[1].trim();
      const vinculo = mp[2].trim().toUpperCase();
      if (nome) passageiros.push({ nome, vinculo });
    }
    if (passageiros.length > 0) blocosCompletos++;

    // Voo / trecho / data
    const mVoo = bloco.match(RE_VOO_TRECHO);
    let vooNumero: string | null = null;
    let aeroportos: string[] = [];
    let dataVoo: string | null = null;
    if (mVoo) {
      vooNumero = mVoo[1] ? mVoo[1].replace(/-+$/, "").trim() || null : null;
      const seqAeroportos = mVoo[2] ?? "";
      const ms = seqAeroportos.toUpperCase().match(RE_AEROPORTO) ?? [];
      // dedupe consecutivo preservando ordem (BSB,CNF,CNF → BSB,CNF)
      aeroportos = ms.filter((v, i) => i === 0 || ms[i - 1] !== v);
      dataVoo = dataIso(mVoo[3]);
    }

    // Pernas consecutivas a partir da sequência de aeroportos
    const pernas: Array<{ origem: string | null; destino: string | null }> = [];
    if (aeroportos.length >= 2) {
      for (let i = 0; i < aeroportos.length - 1; i++) {
        pernas.push({ origem: aeroportos[i], destino: aeroportos[i + 1] });
      }
    } else {
      pernas.push({ origem: aeroportos[0] ?? null, destino: null });
    }

    // Truncado na fonte (companhia presente mas sem passageiro): emite segmento
    // mínimo para que companhia + valor do documento ainda sejam contabilizados.
    const paxList =
      passageiros.length > 0
        ? passageiros
        : [{ nome: "(não informado)", vinculo: "NÃO INFORMADO" }];

    for (const pax of paxList) {
      const ehParlamentar = pax.vinculo === "PARLAMENTAR";
      for (const perna of pernas) {
        segmentos.push({
          companhia,
          companhia_eh_aerea: ehAerea,
          agencia,
          localizador,
          passageiro: pax.nome,
          vinculo: pax.vinculo,
          eh_parlamentar: ehParlamentar,
          voo_numero: vooNumero,
          origem: perna.origem,
          destino: perna.destino,
          data_voo: dataVoo,
        });
      }
    }
  }

  return { segmentos, blocosTotal: blocosVoo, blocosOk: blocosCompletos };
}

// ---------------------------------------------------------------------------
// Leitura paginada
// ---------------------------------------------------------------------------

async function lerPassagens(sb: SupabaseClient): Promise<LinhaBruta[]> {
  const PAGE = 1000;
  let offset = 0;
  const linhas: LinhaBruta[] = [];

  while (true) {
    const { data, error } = await sb
      .from("ceaps_senado_brutas")
      .select(
        "cod_documento, ano, mes, senador, senador_normalizado, detalhamento, valor_reembolsado"
      )
      .ilike("tipo_despesa", FILTRO_PASSAGEM)
      .not("detalhamento", "is", null)
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`Ler ceaps_senado_brutas: ${error.message}`);
    if (!data || data.length === 0) break;
    linhas.push(...(data as LinhaBruta[]));
    offset += data.length;
    if (data.length < PAGE) break;
  }

  return linhas;
}

// ---------------------------------------------------------------------------
// Job principal
// ---------------------------------------------------------------------------

export interface ResultadoVoosSenado {
  status: "sucesso" | "erro";
  documentos: number;
  blocos: number;
  blocos_ok: number;
  taxa_parse: number;
  segmentos: number;
  amostra_nao_parseados: string[];
  erro?: string;
}

export async function jobVoosSenado(
  config: JobVoosSenadoConfig
): Promise<ResultadoVoosSenado> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const dry = config.dryRun ?? false;

  let execucao_id: string | undefined;
  if (!dry) {
    const { data: exec } = await sb
      .from("execucoes_pipeline")
      .insert({ job_nome: JOB_NOME, status: "em_andamento", detalhes: {} })
      .select("id")
      .single();
    execucao_id = exec?.id as string | undefined;
  }

  try {
    const linhas = await lerPassagens(sb);

    let blocos = 0;
    let blocosOk = 0;
    const amostraNaoParseados: string[] = [];

    interface VooRow {
      cod_documento: string;
      ano: number;
      mes: number | null;
      senador_normalizado: string | null;
      companhia: string;
      companhia_eh_aerea: boolean;
      agencia: string | null;
      localizador: string | null;
      passageiro: string;
      vinculo: string;
      eh_parlamentar: boolean;
      voo_numero: string | null;
      origem: string | null;
      destino: string | null;
      data_voo: string | null;
      valor_reembolsado_doc: number | null;
      raw_detalhamento: string;
    }

    const voosRows: VooRow[] = [];

    for (const l of linhas) {
      if (!l.detalhamento) continue;
      const { segmentos, blocosTotal, blocosOk: ok } = parseDetalhamento(l.detalhamento);
      blocos += blocosTotal;
      blocosOk += ok;

      if (blocosTotal > 0 && ok === 0 && amostraNaoParseados.length < 25) {
        amostraNaoParseados.push(l.detalhamento.slice(0, 240));
      }

      for (const s of segmentos) {
        voosRows.push({
          cod_documento: l.cod_documento,
          ano: l.ano,
          mes: l.mes,
          senador_normalizado: l.senador_normalizado ?? l.senador,
          companhia: s.companhia,
          companhia_eh_aerea: s.companhia_eh_aerea,
          agencia: s.agencia,
          localizador: s.localizador,
          passageiro: s.passageiro,
          vinculo: s.vinculo,
          eh_parlamentar: s.eh_parlamentar,
          voo_numero: s.voo_numero,
          origem: s.origem,
          destino: s.destino,
          data_voo: s.data_voo,
          valor_reembolsado_doc: l.valor_reembolsado,
          raw_detalhamento: l.detalhamento,
        });
      }
    }

    const taxa = blocos > 0 ? blocosOk / blocos : 0;

    if (!dry) {
      // Persiste voos_senado e recomputa aggs
      await persistir(sb, voosRows);
    }

    if (execucao_id) {
      await sb
        .from("execucoes_pipeline")
        .update({
          status: "sucesso",
          finalizado_em: new Date().toISOString(),
          detalhes: {
            documentos: linhas.length,
            segmentos: voosRows.length,
            taxa_parse: taxa,
          },
        })
        .eq("id", execucao_id);
    }

    return {
      status: "sucesso",
      documentos: linhas.length,
      blocos,
      blocos_ok: blocosOk,
      taxa_parse: taxa,
      segmentos: voosRows.length,
      amostra_nao_parseados: amostraNaoParseados,
    };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    if (execucao_id) {
      await sb
        .from("execucoes_pipeline")
        .update({
          status: "erro",
          finalizado_em: new Date().toISOString(),
          detalhes: { erro },
        })
        .eq("id", execucao_id);
    }
    return {
      status: "erro",
      documentos: 0,
      blocos: 0,
      blocos_ok: 0,
      taxa_parse: 0,
      segmentos: 0,
      amostra_nao_parseados: [],
      erro,
    };
  }
}

// ---------------------------------------------------------------------------
// Persistência + agregações
// ---------------------------------------------------------------------------

interface VooRowPersist {
  cod_documento: string;
  ano: number;
  mes: number | null;
  senador_normalizado: string | null;
  companhia: string;
  companhia_eh_aerea: boolean;
  agencia: string | null;
  localizador: string | null;
  passageiro: string;
  vinculo: string;
  eh_parlamentar: boolean;
  voo_numero: string | null;
  origem: string | null;
  destino: string | null;
  data_voo: string | null;
  valor_reembolsado_doc: number | null;
  raw_detalhamento: string;
}

async function persistir(sb: SupabaseClient, rows: VooRowPersist[]): Promise<void> {
  // Limpa e regrava (idempotente; tabela é derivada)
  await sb.from("voos_senado").delete().neq("cod_documento", "__never__");

  const LOTE = 500;
  for (let i = 0; i < rows.length; i += LOTE) {
    const { error } = await sb.from("voos_senado").insert(rows.slice(i, i + LOTE));
    if (error) throw new Error(`Insert voos_senado: ${error.message}`);
  }

  // ---- Agg parlamentar (gasto deduplicado por documento) ----
  const docVistos = new Map<string, Set<string>>(); // senador|ano → set de cod_documento
  const parlMap = new Map<
    string,
    { senador: string | null; ano: number; gasto: number; trechos: number; trechosTerceiros: number }
  >();
  const docValor = new Map<string, number>(); // cod_documento → valor (uma vez)
  const docChave = new Map<string, string>(); // cod_documento → chave senador|ano

  for (const r of rows) {
    const senador = r.senador_normalizado;
    const chave = `${senador}|${r.ano}`;
    if (!parlMap.has(chave)) {
      parlMap.set(chave, { senador, ano: r.ano, gasto: 0, trechos: 0, trechosTerceiros: 0 });
      docVistos.set(chave, new Set());
    }
    const agg = parlMap.get(chave)!;
    agg.trechos += 1;
    if (!r.eh_parlamentar) agg.trechosTerceiros += 1;

    if (!docValor.has(r.cod_documento)) {
      docValor.set(r.cod_documento, Number(r.valor_reembolsado_doc ?? 0));
      docChave.set(r.cod_documento, chave);
    }
  }
  // soma valor por documento (uma vez) na chave certa
  for (const [cod, valor] of docValor) {
    const chave = docChave.get(cod)!;
    parlMap.get(chave)!.gasto += valor;
    docVistos.get(chave)!.add(cod);
  }

  const parlRows = [...parlMap.values()]
    .sort((a, b) => b.gasto - a.gasto)
    .map((v, idx) => {
      const nDocs = docVistos.get(`${v.senador}|${v.ano}`)!.size;
      return {
        senador_normalizado: v.senador,
        ano: v.ano,
        total_gasto: Math.round(v.gasto * 100) / 100,
        n_documentos: nDocs,
        n_trechos: v.trechos,
        n_trechos_terceiros: v.trechosTerceiros,
        ticket_medio: nDocs > 0 ? Math.round((v.gasto / nDocs) * 100) / 100 : 0,
        posicao: idx + 1,
        atualizado_em: new Date().toISOString(),
      };
    });
  await regravar(sb, "voos_senado_parlamentar_agg", parlRows);

  // ---- Agg companhia (faturamento por companhia × ano, dedupe valor por documento) ----
  const compDocCompanhia = new Map<string, string>(); // cod_documento → companhia (1ª vista)
  const compMap = new Map<string, { companhia: string; ano: number; gasto: number; trechos: number; docs: Set<string> }>();
  const totalAnoGasto = new Map<number, number>();

  for (const r of rows) {
    const key = `${r.companhia}|${r.ano}`;
    if (!compMap.has(key)) compMap.set(key, { companhia: r.companhia, ano: r.ano, gasto: 0, trechos: 0, docs: new Set() });
    compMap.get(key)!.trechos += 1;
    if (!compDocCompanhia.has(r.cod_documento)) {
      compDocCompanhia.set(r.cod_documento, r.companhia);
      const valor = Number(r.valor_reembolsado_doc ?? 0);
      compMap.get(key)!.gasto += valor;
      compMap.get(key)!.docs.add(r.cod_documento);
      totalAnoGasto.set(r.ano, (totalAnoGasto.get(r.ano) ?? 0) + valor);
    }
  }
  const compRows = [...compMap.values()]
    .sort((a, b) => b.gasto - a.gasto)
    .map((v, idx) => ({
      companhia: v.companhia,
      ano: v.ano,
      total_gasto: Math.round(v.gasto * 100) / 100,
      n_documentos: v.docs.size,
      n_trechos: v.trechos,
      share_pct:
        (totalAnoGasto.get(v.ano) ?? 0) > 0
          ? Math.round((v.gasto / (totalAnoGasto.get(v.ano) ?? 1)) * 10000) / 100
          : 0,
      posicao: idx + 1,
      atualizado_em: new Date().toISOString(),
    }));
  await regravar(sb, "voos_senado_companhia_agg", compRows);

  // ---- Agg terceiros (passageiro não-parlamentar) ----
  const terMap = new Map<
    string,
    { passageiro: string; vinculo: string; senador: string | null; trechos: number }
  >();
  for (const r of rows) {
    if (r.eh_parlamentar || r.vinculo === "NÃO INFORMADO") continue;
    const key = `${r.passageiro}|${r.vinculo}|${r.senador_normalizado}`;
    if (!terMap.has(key))
      terMap.set(key, { passageiro: r.passageiro, vinculo: r.vinculo, senador: r.senador_normalizado, trechos: 0 });
    terMap.get(key)!.trechos += 1;
  }
  const terRows = [...terMap.values()]
    .sort((a, b) => b.trechos - a.trechos)
    .map((v) => ({
      passageiro: v.passageiro,
      vinculo: v.vinculo,
      senador_normalizado: v.senador,
      n_trechos: v.trechos,
      atualizado_em: new Date().toISOString(),
    }));
  await regravar(sb, "voos_senado_terceiros_agg", terRows);

  // ---- Agg companhia × senador (quem mais usa cada companhia) ----
  const compSenMap = new Map<
    string,
    { companhia: string; senador: string | null; trechos: number; docs: Set<string> }
  >();
  for (const r of rows) {
    const key = `${r.companhia}|${r.senador_normalizado}`;
    if (!compSenMap.has(key))
      compSenMap.set(key, { companhia: r.companhia, senador: r.senador_normalizado, trechos: 0, docs: new Set() });
    const a = compSenMap.get(key)!;
    a.trechos += 1;
    a.docs.add(r.cod_documento);
  }
  const compSenRows = [...compSenMap.values()]
    .sort((a, b) => b.trechos - a.trechos)
    .map((v) => ({
      companhia: v.companhia,
      senador_normalizado: v.senador,
      n_trechos: v.trechos,
      n_documentos: v.docs.size,
      atualizado_em: new Date().toISOString(),
    }));
  await regravar(sb, "voos_senado_companhia_senador_agg", compSenRows);

  // ---- Agg companhia × rota (trechos com origem e destino) ----
  const rotaMap = new Map<
    string,
    { companhia: string; origem: string; destino: string; trechos: number }
  >();
  for (const r of rows) {
    if (!r.origem || !r.destino) continue;
    const key = `${r.companhia}|${r.origem}|${r.destino}`;
    if (!rotaMap.has(key))
      rotaMap.set(key, { companhia: r.companhia, origem: r.origem, destino: r.destino, trechos: 0 });
    rotaMap.get(key)!.trechos += 1;
  }
  const rotaRows = [...rotaMap.values()]
    .sort((a, b) => b.trechos - a.trechos)
    .map((v) => ({
      companhia: v.companhia,
      origem: v.origem,
      destino: v.destino,
      n_trechos: v.trechos,
      atualizado_em: new Date().toISOString(),
    }));
  await regravar(sb, "voos_senado_rota_agg", rotaRows);
}

async function regravar(sb: SupabaseClient, tabela: string, rows: object[]): Promise<void> {
  // Todas as tabelas _agg têm `atualizado_em not null` → deleta tudo (PostgREST
  // exige um filtro; este casa todas as linhas).
  const { error: errDel } = await sb.from(tabela).delete().not("atualizado_em", "is", null);
  if (errDel) throw new Error(`Limpar ${tabela}: ${errDel.message}`);
  const LOTE = 500;
  for (let i = 0; i < rows.length; i += LOTE) {
    const { error } = await sb.from(tabela).insert(rows.slice(i, i + LOTE));
    if (error) throw new Error(`Insert ${tabela}: ${error.message}`);
  }
}
