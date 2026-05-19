/**
 * job_ingestao_ceaps_senado
 * Ingere despesas CEAPS do Senado Federal.
 * Fonte: https://www.senado.leg.br/transparencia/LAI/verba/despesa_ceaps_{ANO}.csv
 *
 * Peculiaridades do CSV:
 * - Linha 1: metadado "ULTIMA ATUALIZACAO"
 * - Linha 2: cabeçalho
 * - Linhas 3+: dados
 * - Separador: ';', encoding: latin-1, campos entre aspas duplas
 * - COD_DOCUMENTO é único por registro
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseClient, inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const JOB_NOME = "job_ingestao_ceaps_senado";
const ETAPA_NOME = "ingestao_ceaps_senado";
const TAMANHO_LOTE = 300;
const ANOS_DEFAULT = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const BASE_URL = "https://www.senado.leg.br/transparencia/LAI/verba/despesa_ceaps";

function sanitize(v: string): string | null {
  const s = v.trim();
  return s && s !== "#NULO" ? s : null;
}

function parseBRL(v: string): number {
  const s = v.trim().replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(v: string): string | null {
  const m = v.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function normalizar(nome: string): string {
  return nome.trim().toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function parseCSVLine(line: string): string[] {
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
  // ANO;MES;SENADOR;TIPO_DESPESA;CNPJ_CPF;FORNECEDOR;DOCUMENTO;DATA;DETALHAMENTO;VALOR_REEMBOLSADO;COD_DOCUMENTO
  if (fields.length < 11) return null;
  const [, mes, senador, tipo_despesa, cnpj_cpf, fornecedor, documento, data, detalhamento, valor_raw, cod_documento] = fields;

  const cod = sanitize(cod_documento);
  if (!cod) return null;

  const senadorNome = sanitize(senador);
  if (!senadorNome) return null;

  return {
    cod_documento: cod,
    ano,
    senador: senadorNome,
    senador_normalizado: normalizar(senadorNome),
    mes: parseInt(mes.trim(), 10) || null,
    tipo_despesa: sanitize(tipo_despesa),
    cnpj_cpf: sanitize(cnpj_cpf),
    fornecedor: sanitize(fornecedor),
    documento: sanitize(documento),
    data: parseDate(data ?? ""),
    detalhamento: sanitize(detalhamento),
    valor_reembolsado: parseBRL(valor_raw ?? "0"),
    dados: Object.fromEntries([
      "ANO","MES","SENADOR","TIPO_DESPESA","CNPJ_CPF","FORNECEDOR","DOCUMENTO","DATA","DETALHAMENTO","VALOR_REEMBOLSADO","COD_DOCUMENTO"
    ].map((k, i) => [k, fields[i]])),
    atualizado_em: new Date().toISOString(),
  };
}

async function fetchCsv(ano: number): Promise<string> {
  const url = `${BASE_URL}_${ano}.csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar ${url}`);
  const buf = await res.arrayBuffer();
  // Decodificar latin-1 via Buffer (Node.js nativo)
  return Buffer.from(buf).toString("latin1");
}

async function upsertLote(sb: SupabaseClient, rows: Record<string, unknown>[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await sb
    .from("ceaps_senado_brutas")
    .upsert(rows, { onConflict: "cod_documento,ano" });
  if (error) throw new Error(`Upsert ceaps_senado_brutas: ${error.message}`);
}

export interface JobCeapsSenadorConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anos?: number[];
}

export interface ResultadoAnoCeapsSenado {
  ano: number;
  total: number;
  inseridos: number;
  senadores: number;
  duracao_ms: number;
  erro?: string;
}

export interface ResultadoJobCeapsSenado {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoCeapsSenado[];
  erro?: string;
}

export async function jobIngestaCeapsSenado(
  config: JobCeapsSenadorConfig
): Promise<ResultadoJobCeapsSenado> {
  const sb = createSupabaseClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const anos = config.anos ?? ANOS_DEFAULT;

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

  const resultados_por_ano: ResultadoAnoCeapsSenado[] = [];

  try {
    for (const ano of anos) {
      const t0 = Date.now();
      console.log(`  [${ano}] Baixando CSV...`);

      try {
        const csv = await fetchCsv(ano);
        const lines = csv.split("\n");

        // Linha 0: metadado, Linha 1: cabeçalho, Linha 2+: dados
        const mapa = new Map<string, Record<string, unknown>>();
        const senadores = new Set<string>();

        for (let i = 2; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const fields = parseCSVLine(line);
          const row = mapRow(fields, ano);
          if (!row) continue;
          const key = `${row.cod_documento}|${row.ano}`;
          mapa.set(key, row);
          senadores.add(row.senador as string);
        }

        const rows = Array.from(mapa.values());
        let inseridos = 0;

        for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
          await upsertLote(sb, rows.slice(i, i + TAMANHO_LOTE));
          inseridos += Math.min(TAMANHO_LOTE, rows.length - i);
        }

        const duracao_ms = Date.now() - t0;
        console.log(`  [${ano}] ✓ ${inseridos} despesas, ${senadores.size} senadores — ${duracao_ms}ms`);
        resultados_por_ano.push({ ano, total: rows.length, inseridos, senadores: senadores.size, duracao_ms });

      } catch (err) {
        const erro = err instanceof Error ? err.message : String(err);
        console.error(`  [${ano}] ERRO: ${erro}`);
        const duracao_ms = Date.now() - t0;
        resultados_por_ano.push({ ano, total: 0, inseridos: 0, senadores: 0, duracao_ms, erro });
      }
    }

    await atualizarEtapa(sb, etapa_id, { finalizado_em: new Date().toISOString(), status: "sucesso", detalhes: { resultados_por_ano } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em: new Date().toISOString(), status: "sucesso", detalhes: { resultados_por_ano } });
    return { execucao_id, status: "sucesso", resultados_por_ano };

  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    await atualizarEtapa(sb, etapa_id, { finalizado_em: new Date().toISOString(), status: "erro", detalhes: { erro } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em: new Date().toISOString(), status: "erro", detalhes: { erro } });
    return { execucao_id, status: "erro", resultados_por_ano, erro };
  }
}
