/**
 * Job: ingere verba indenizatória de um período (mes/ano) pra todos os deputados ativos.
 *
 * Fluxo:
 *   1. Lê deputados ativos do Supabase (não chama a API se a lista já existe).
 *   2. Pra cada deputado, faz POST no detalhe.html com periodo=MMYYYY (throttle 1s).
 *   3. Parseia HTML → upsert em almg_verba_indenizatoria.
 *
 * Idempotência: UNIQUE INDEX em (deputado, ano, mes, num_doc, cnpj, categoria, valor).
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
  deputadoIds?: number[]; // se omitido, pega todos os ativos do banco
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

export async function jobIngestaoVerba(opts: JobVerbaOpts): Promise<JobVerbaResult> {
  const supabase = createClient(opts.supabaseUrl, opts.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });

  const periodo = `${String(opts.mes).padStart(2, "0")}${opts.ano}`;
  const throttle = new Throttle({ minIntervalMs: opts.throttleMs ?? 1100 });

  // 1. Define lista de deputados
  let deputadoIds: number[];
  if (opts.deputadoIds && opts.deputadoIds.length > 0) {
    deputadoIds = opts.deputadoIds;
  } else {
    const { data, error } = await supabase
      .from("almg_deputados")
      .select("id_almg")
      .eq("ativo", true)
      .order("id_almg", { ascending: true });
    if (error) {
      return {
        status: "erro",
        periodo,
        deputadosProcessados: 0,
        totalGastos: 0,
        inseridos: 0,
        falhas: [{ deputadoId: 0, erro: `select deputados: ${error.message}` }],
      };
    }
    deputadoIds = (data ?? []).map((d) => d.id_almg);
  }

  if (deputadoIds.length === 0) {
    return {
      status: "erro",
      periodo,
      deputadosProcessados: 0,
      totalGastos: 0,
      inseridos: 0,
      falhas: [{ deputadoId: 0, erro: "nenhum deputado ativo encontrado" }],
    };
  }

  // 2. Loop com throttle
  let totalGastos = 0;
  let inseridos = 0;
  const falhas: { deputadoId: number; erro: string }[] = [];
  const acumulador: GastoVerba[] = [];
  const FLUSH_AT = 500; // batch de upsert

  for (let i = 0; i < deputadoIds.length; i++) {
    const dep = deputadoIds[i];
    try {
      const { html, url } = await throttle.run(() => fetchDetalhe(dep, opts.mes, opts.ano));
      const gastos = parseDetalhe(html, {
        deputadoIdAlmg: dep,
        mes: opts.mes,
        ano: opts.ano,
        urlOrigem: url,
      });
      acumulador.push(...gastos);
      totalGastos += gastos.length;
      opts.onProgress?.({ idx: i + 1, total: deputadoIds.length, deputadoId: dep, gastos: gastos.length });

      if (acumulador.length >= FLUSH_AT) {
        const n = await flushBatch(supabase, acumulador.splice(0));
        inseridos += n;
      }
    } catch (err) {
      falhas.push({ deputadoId: dep, erro: err instanceof Error ? err.message : String(err) });
    }
  }

  // Flush final
  if (acumulador.length > 0) {
    try {
      inseridos += await flushBatch(supabase, acumulador);
    } catch (err) {
      falhas.push({ deputadoId: 0, erro: `flush final: ${err instanceof Error ? err.message : String(err)}` });
    }
  }

  return {
    status: falhas.length === 0 ? "ok" : falhas.length === deputadoIds.length ? "erro" : "parcial",
    periodo,
    deputadosProcessados: deputadoIds.length - falhas.length,
    totalGastos,
    inseridos,
    falhas,
  };
}

async function flushBatch(
  supabase: SbClient,
  gastos: GastoVerba[],
): Promise<number> {
  if (gastos.length === 0) return 0;
  const rows = gastos.map((g) => ({
    deputado_id_almg: g.deputadoIdAlmg,
    ano: g.ano,
    mes: g.mes,
    categoria: g.categoria,
    categoria_total: g.categoriaTotal,
    emitente: g.emitente || null,
    // num_documento, cnpj_cpf e valor_despesa são NOT NULL na tabela (default '' / 0)
    // para permitir UNIQUE CONSTRAINT simples (PostgREST onConflict não aceita índices funcionais).
    cnpj_cpf: g.cnpjCpf || "",
    num_documento: g.numeroDocumento || "",
    data_emissao: g.dataEmissao,
    valor_despesa: Number.isFinite(g.valorDespesa) ? g.valorDespesa : 0,
    valor_reembolso: Number.isFinite(g.valorReembolso) ? g.valorReembolso : null,
    url_origem: g.urlOrigem,
  }));
  const { error } = await supabase
    .from("almg_verba_indenizatoria")
    .upsert(rows, {
      onConflict: "deputado_id_almg,ano,mes,num_documento,cnpj_cpf,categoria,valor_despesa",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
  return rows.length;
}
