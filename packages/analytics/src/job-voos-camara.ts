/**
 * job_voos_camara
 * Agrega as passagens aéreas da cota da Câmara (ceaps_brutas) em dois recortes:
 *   - voos_camara_deputado_agg   (gasto com voo por deputado × ano)
 *   - voos_camara_companhia_agg  (faturamento/share por companhia × ano)
 *
 * A Câmara não publica trecho nem passageiro — só fornecedor + valor. A companhia
 * vem de nome_fornecedor, normalizada pela mesma função do job do Senado.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizarCompanhia } from "./job-voos-senado.js";

const JOB_NOME = "job_voos_camara";
// Câmara: todas as categorias com "AÉRE" são voo (SIGEPA, REEMBOLSO, RPA, EMISSÃO).
// ilike é case-insensitive; o acento é literal e casa AÉREA/AÉREAS.
const FILTRO_VOO = "%aére%";
// Cobre 2019+ (todo o histórico ingerido). O bug de parsing de decimal do CSV
// histórico (2019–2022) foi corrigido em fix(ceap) — valores agora corretos.
const ANO_MIN = 2019;
const ANO_MAX = 2026;

export interface JobVoosCamaraConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export interface ResultadoVoosCamara {
  status: "sucesso" | "erro";
  registros: number;
  deputados: number;
  companhias: number;
  total_gasto: number;
  erro?: string;
}

interface DepInfo {
  nome: string | null;
  partido: string | null;
  uf: string | null;
}

async function carregarDeputados(sb: SupabaseClient): Promise<Map<string, DepInfo>> {
  const mapa = new Map<string, DepInfo>();
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await sb
      .from("deputados_brutas")
      .select("id_externo, nome, sigla_partido, sigla_uf")
      .range(offset, offset + PAGE - 1);
    if (error) throw new Error(`Ler deputados_brutas: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const d of data) {
      mapa.set(String(d.id_externo), {
        nome: d.nome ?? null,
        partido: d.sigla_partido ?? null,
        uf: d.sigla_uf ?? null,
      });
    }
    offset += data.length;
    if (data.length < PAGE) break;
  }
  return mapa;
}

export async function jobVoosCamara(
  config: JobVoosCamaraConfig
): Promise<ResultadoVoosCamara> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: exec } = await sb
    .from("execucoes_pipeline")
    .insert({ job_nome: JOB_NOME, status: "em_andamento", detalhes: {} })
    .select("id")
    .single();
  const execucao_id = exec?.id as string | undefined;

  try {
    const deputados = await carregarDeputados(sb);

    // Acumuladores
    const depAgg = new Map<
      string,
      { dep: string; ano: number; gasto: number; docs: number }
    >();
    const compAgg = new Map<
      string,
      { companhia: string; ehAerea: boolean; ano: number; gasto: number; docs: number }
    >();
    const totalAno = new Map<number, number>();

    // Varre ceaps_brutas (voo) ANO A ANO e paginado. Um ilike "%aére%" sobre a
    // tabela inteira (curinga à esquerda, sem índice) estoura o statement timeout;
    // escopar por ano mantém cada query leve.
    const PAGE = 1000;
    let registros = 0;
    for (let ano = ANO_MIN; ano <= ANO_MAX; ano++) {
      let offset = 0;
      while (true) {
        const { data, error } = await sb
          .from("ceaps_brutas")
          .select("deputado_id_externo, ano, nome_fornecedor, valor_liquido")
          .eq("ano", ano)
          .ilike("tipo_despesa", FILTRO_VOO)
          .range(offset, offset + PAGE - 1);
        if (error) throw new Error(`Ler ceaps_brutas ano=${ano}: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const r of data) {
          const anoR = Number(r.ano);
          const valor = Number(r.valor_liquido ?? 0);
          const depId = String(r.deputado_id_externo);
          const [companhia, ehAerea] = normalizarCompanhia(r.nome_fornecedor ?? "(não informado)");

          const dk = `${depId}|${anoR}`;
          const da = depAgg.get(dk) ?? { dep: depId, ano: anoR, gasto: 0, docs: 0 };
          da.gasto += valor;
          da.docs += 1;
          depAgg.set(dk, da);

          const ck = `${companhia}|${anoR}`;
          const ca = compAgg.get(ck) ?? { companhia, ehAerea, ano: anoR, gasto: 0, docs: 0 };
          ca.gasto += valor;
          ca.docs += 1;
          compAgg.set(ck, ca);

          totalAno.set(anoR, (totalAno.get(anoR) ?? 0) + valor);
          registros++;
        }

        offset += data.length;
        if (data.length < PAGE) break;
      }
    }

    // Monta linhas deputado
    const depRows = [...depAgg.values()]
      .sort((a, b) => b.gasto - a.gasto)
      .map((v, idx) => {
        const info = deputados.get(v.dep);
        return {
          deputado_id_externo: v.dep,
          nome: info?.nome ?? null,
          sigla_partido: info?.partido ?? null,
          sigla_uf: info?.uf ?? null,
          ano: v.ano,
          total_gasto: Math.round(v.gasto * 100) / 100,
          n_documentos: v.docs,
          posicao: idx + 1,
          atualizado_em: new Date().toISOString(),
        };
      });

    // Monta linhas companhia
    const compRows = [...compAgg.values()]
      .sort((a, b) => b.gasto - a.gasto)
      .map((v, idx) => ({
        companhia: v.companhia,
        companhia_eh_aerea: v.ehAerea,
        ano: v.ano,
        total_gasto: Math.round(v.gasto * 100) / 100,
        n_documentos: v.docs,
        share_pct:
          (totalAno.get(v.ano) ?? 0) > 0
            ? Math.round((v.gasto / (totalAno.get(v.ano) ?? 1)) * 10000) / 100
            : 0,
        posicao: idx + 1,
        atualizado_em: new Date().toISOString(),
      }));

    await regravar(sb, "voos_camara_deputado_agg", depRows);
    await regravar(sb, "voos_camara_companhia_agg", compRows);

    const totalGasto = [...totalAno.values()].reduce((s, v) => s + v, 0);

    if (execucao_id) {
      await sb
        .from("execucoes_pipeline")
        .update({
          status: "sucesso",
          finalizado_em: new Date().toISOString(),
          detalhes: { registros, deputados: depRows.length, companhias: compRows.length },
        })
        .eq("id", execucao_id);
    }

    return {
      status: "sucesso",
      registros,
      deputados: depRows.length,
      companhias: compRows.length,
      total_gasto: Math.round(totalGasto * 100) / 100,
    };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    if (execucao_id) {
      await sb
        .from("execucoes_pipeline")
        .update({ status: "erro", finalizado_em: new Date().toISOString(), detalhes: { erro } })
        .eq("id", execucao_id);
    }
    return { status: "erro", registros: 0, deputados: 0, companhias: 0, total_gasto: 0, erro };
  }
}

async function regravar(sb: SupabaseClient, tabela: string, rows: object[]): Promise<void> {
  const { error: errDel } = await sb.from(tabela).delete().not("atualizado_em", "is", null);
  if (errDel) throw new Error(`Limpar ${tabela}: ${errDel.message}`);
  const LOTE = 500;
  for (let i = 0; i < rows.length; i += LOTE) {
    const { error } = await sb.from(tabela).insert(rows.slice(i, i + LOTE));
    if (error) throw new Error(`Insert ${tabela}: ${error.message}`);
  }
}
