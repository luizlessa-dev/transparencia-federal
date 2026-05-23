/**
 * Job: ingere verba indenizatória ALMG de um período (mes/ano) → gastos_parlamentares.
 *
 * REFACTOR (2026-05-23): após a migration `20260523000000_create_canonical_casas_schema`,
 * `almg_verba_indenizatoria` virou VIEW sobre `gastos_parlamentares`. Este job
 * agora escreve direto na tabela canônica com casa_id = ALMG.
 *
 * Fluxo:
 *   1. Resolve casa_id ALMG.
 *   2. Carrega mapa (id_externo ALMG, INT como string → parlamentar_id UUID).
 *      Filtra por casa_id = ALMG. Se omitido `deputadoIds`, pega só ativos.
 *   3. Pra cada deputado, faz POST no detalhe.html com periodo=MMYYYY (throttle 1s).
 *   4. Parseia HTML → upsert em `gastos_parlamentares` com parlamentar_id.
 *
 * Idempotência: UNIQUE CONSTRAINT em
 * (parlamentar_id, ano, mes, num_documento, cnpj_cpf, categoria, valor_bruto).
 * Reexecutar o mesmo período é seguro — não duplica.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { fetchDetalhe, parseDetalhe, type GastoVerba } from "./parser.js";
import { Throttle } from "./throttle.js";

// O cliente do Supabase tipado com SupabaseClient<any> evita o conflito
// estrutural com os generics default novos da lib quando schema é "public".
type SbClient = SupabaseClient<any>;

export type JobVerbaOpts = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  mes: number; // 1-12
  ano: number;
  deputadoIds?: number[]; // IDs ALMG (INT) — se omitido, pega todos os ativos do banco
  throttleMs?: number; // default 1100 (1.1s — folga sobre o limite de 1s)
  onProgress?: (info: { idx: number; total: number; deputadoId: number; gastos: number }) => void;
};

export type JobVerbaResult = {
  status: "ok" | "erro" | "parcial";
  periodo: string;
  deputadosProcessados: number;
  totalGastos: number;
  inseridos: number;
  falhas: { deputadoId: number; erro: string }[];
};

const SIGLA_CASA = "ALMG";

export async function jobIngestaoVerba(opts: JobVerbaOpts): Promise<JobVerbaResult> {
  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const periodo = `${String(opts.mes).padStart(2, "0")}${opts.ano}`;
  const throttle = new Throttle({ minIntervalMs: opts.throttleMs ?? 1100 });

  // 1. Resolve casa_id ALMG
  const { data: casa, error: casaErr } = await supabase
    .from("casas")
    .select("id")
    .eq("sigla", SIGLA_CASA)
    .maybeSingle();

  if (casaErr || !casa) {
    return {
      status: "erro",
      periodo,
      deputadosProcessados: 0,
      totalGastos: 0,
      inseridos: 0,
      falhas: [{ deputadoId: 0, erro: `casa ${SIGLA_CASA} não encontrada: ${casaErr?.message ?? "vazio"}` }],
    };
  }
  const casaId = casa.id as number;

  // 2. Carrega mapa (id ALMG INT → UUID parlamentar)
  //    Filtra por casa_id ALMG.
  //    Se `opts.deputadoIds` informado, pega só esses; senão, ativos.
  let parlamentaresQ = supabase
    .from("parlamentares_estaduais")
    .select("id, id_externo")
    .eq("casa_id", casaId)
    .order("id_externo", { ascending: true });

  if (opts.deputadoIds && opts.deputadoIds.length > 0) {
    parlamentaresQ = parlamentaresQ.in(
      "id_externo",
      opts.deputadoIds.map((n) => String(n)),
    );
  } else {
    parlamentaresQ = parlamentaresQ.eq("ativo", true);
  }

  const { data: parlData, error: parlErr } = await parlamentaresQ;
  if (parlErr) {
    return {
      status: "erro",
      periodo,
      deputadosProcessados: 0,
      totalGastos: 0,
      inseridos: 0,
      falhas: [{ deputadoId: 0, erro: `select parlamentares: ${parlErr.message}` }],
    };
  }

  if (!parlData || parlData.length === 0) {
    return {
      status: "erro",
      periodo,
      deputadosProcessados: 0,
      totalGastos: 0,
      inseridos: 0,
      falhas: [{ deputadoId: 0, erro: "nenhum parlamentar ALMG encontrado pra o critério" }],
    };
  }

  // Monta lista de (idAlmg INT, parlamentar_id UUID) preservando ordem
  const pares: { idAlmg: number; parlamentarId: string }[] = [];
  for (const p of parlData) {
    const idAlmg = Number(p.id_externo);
    if (Number.isFinite(idAlmg) && p.id) {
      pares.push({ idAlmg, parlamentarId: String(p.id) });
    }
  }

  // 3. Loop com throttle — scraper continua usando ID INT da ALMG pra URL
  let totalGastos = 0;
  let inseridos = 0;
  const falhas: { deputadoId: number; erro: string }[] = [];
  const acumulador: { g: GastoVerba; parlamentarId: string }[] = [];
  const FLUSH_AT = 500;

  for (let i = 0; i < pares.length; i++) {
    const { idAlmg, parlamentarId } = pares[i];
    try {
      const { html, url } = await throttle.run(() => fetchDetalhe(idAlmg, opts.mes, opts.ano));
      const gastos = parseDetalhe(html, {
        deputadoIdAlmg: idAlmg,
        mes: opts.mes,
        ano: opts.ano,
        urlOrigem: url,
      });
      for (const g of gastos) acumulador.push({ g, parlamentarId });
      totalGastos += gastos.length;
      opts.onProgress?.({ idx: i + 1, total: pares.length, deputadoId: idAlmg, gastos: gastos.length });

      if (acumulador.length >= FLUSH_AT) {
        const n = await flushBatch(supabase, casaId, acumulador.splice(0));
        inseridos += n;
      }
    } catch (err) {
      falhas.push({ deputadoId: idAlmg, erro: err instanceof Error ? err.message : String(err) });
    }
  }

  // Flush final
  if (acumulador.length > 0) {
    try {
      inseridos += await flushBatch(supabase, casaId, acumulador);
    } catch (err) {
      falhas.push({ deputadoId: 0, erro: `flush final: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  return {
    status: falhas.length === 0 ? "ok" : falhas.length === pares.length ? "erro" : "parcial",
    periodo,
    deputadosProcessados: pares.length - falhas.length,
    totalGastos,
    inseridos,
    falhas,
  };
}

async function flushBatch(
  supabase: SbClient,
  casaId: number,
  entradas: { g: GastoVerba; parlamentarId: string }[],
): Promise<number> {
  if (entradas.length === 0) return 0;
  const rows = entradas.map(({ g, parlamentarId }) => ({
    parlamentar_id: parlamentarId,
    casa_id: casaId,
    ano: g.ano,
    mes: g.mes,
    cod_categoria: "",                              // ALMG: parser não popula código numérico
    categoria: g.categoria,
    categoria_total: g.categoriaTotal,
    fornecedor: g.emitente || null,                 // renomeado: emitente → fornecedor
    // num_documento, cnpj_cpf e valor_bruto são NOT NULL na tabela canônica
    // (defaults '' e 0). Compatibilidade PostgREST onConflict.
    cnpj_cpf: g.cnpjCpf || "",
    num_documento: g.numeroDocumento || "",
    data_emissao: g.dataEmissao,
    valor_bruto: Number.isFinite(g.valorDespesa) ? g.valorDespesa : 0,
    valor_reembolso: Number.isFinite(g.valorReembolso) ? g.valorReembolso : null,
    url_origem: g.urlOrigem,
  }));
  const { error } = await supabase
    .from("gastos_parlamentares")
    .upsert(rows, {
      onConflict: "parlamentar_id,ano,mes,num_documento,cnpj_cpf,categoria,valor_bruto",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
  return rows.length;
}
