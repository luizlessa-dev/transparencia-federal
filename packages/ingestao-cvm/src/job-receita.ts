/**
 * Ingestão ENXUTA do QSA da Receita → cnpj_socios + cnpj_empresa.
 *
 * Estratégia (lição do disco): NUNCA grava a base inteira (25M sócios). Monta o
 * "universo" de CNPJs do eixo CVM a partir do banco (gestores/administradores/
 * controladores de fundos + emissores de oferta + empresas sancionadas MG) e,
 * ao varrer cada arquivo Socios/Empresas da Receita, grava SÓ as linhas cujo
 * CNPJ básico (8 díg.) está no universo. Stream linha-a-linha (unzip -p + for-
 * await) com backpressure — heap constante mesmo nos arquivos de centenas de MB.
 */
import { spawn } from "child_process";
import { createInterface } from "readline";
import { type SupabaseClient } from "@supabase/supabase-js";
import { baixar } from "./receita-client.js";
import { parseLinha, parseValorBR, normNome } from "./csv.js";
import { flushUpsert, sb } from "./ingest-util.js";

const basico = (s: string) => (s ?? "").replace(/\D/g, "").slice(0, 8);
const parseDataReceita = (v: string): string | null => {
  const t = (v ?? "").trim();
  return /^\d{8}$/.test(t) && t !== "00000000" ? `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}` : null;
};

/** Monta o conjunto de CNPJs básicos (8 díg.) de interesse, a partir do banco. */
export async function montarUniverso(client: SupabaseClient): Promise<Set<string>> {
  const set = new Set<string>();
  const add = (s: string | null | undefined) => { const b = basico(s ?? ""); if (b.length === 8) set.add(b); };

  // Páginas de cvm_fundo (gestor/admin/controlador) — pagina pra pegar tudo.
  for (let from = 0; ; from += 10000) {
    const { data, error } = await client.from("cvm_fundo")
      .select("cnpj_gestor,cnpj_admin,cnpj_controlador").range(from, from + 9999);
    if (error || !data || data.length === 0) break;
    for (const r of data as Record<string, string | null>[]) { add(r.cnpj_gestor); add(r.cnpj_admin); add(r.cnpj_controlador); }
    if (data.length < 10000) break;
  }
  for (let from = 0; ; from += 10000) {
    const { data, error } = await client.from("cvm_oferta").select("cnpj_emissor").range(from, from + 9999);
    if (error || !data || data.length === 0) break;
    for (const r of data as { cnpj_emissor: string | null }[]) add(r.cnpj_emissor);
    if (data.length < 10000) break;
  }
  const { data: sanc } = await client.from("mg_empresas_sancionadas").select("cnpj_norm");
  for (const r of (sanc ?? []) as { cnpj_norm: string | null }[]) add(r.cnpj_norm);

  return set;
}

/** Processa um ZIP da Receita (1 membro CSV headerless) linha-a-linha. */
async function processarZip(zipPath: string, onRow: (cols: string[]) => Promise<void>): Promise<number> {
  const child = spawn("unzip", ["-p", zipPath]);
  child.stdout.setEncoding("latin1");
  child.stderr.resume();
  const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let n = 0;
  for await (const line of rl) {
    if (!line.trim()) continue;
    await onRow(parseLinha(line, ";"));
    n++;
  }
  await new Promise<void>((res) => child.on("close", () => res()));
  return n;
}

export type ReceitaResult = { lidas: number; gravadas: number; erros: string[] };

/** Ingere os arquivos Socios{idxs} de um mês, filtrando pelo universo. */
export async function ingestSocios(
  mes: string, idxs: number[], universo: Set<string>, client: SupabaseClient,
): Promise<ReceitaResult> {
  const erros: string[] = [];
  let lidas = 0, gravadas = 0;
  for (const i of idxs) {
    let zip: string;
    try { zip = await baixar(`${mes}/Socios${i}.zip`); }
    catch (e) { erros.push(`Socios${i}: ${e instanceof Error ? e.message : e}`); continue; }
    let buffer: Record<string, unknown>[] = [];
    const flush = async () => { if (buffer.length) { gravadas += await flushUpsert(client, "cnpj_socios", "cnpj_basico,nome_socio,cpf_cnpj_socio", buffer, erros); buffer = []; } };
    const n = await processarZip(zip, async (c) => {
      const b = basico(c[0] ?? "");
      if (b.length !== 8 || !universo.has(b)) return;
      const nome = (c[2] ?? "").trim();
      buffer.push({
        cnpj_basico: b,
        identificador: (c[1] ?? "").trim() || null,
        nome_socio: nome || null,
        nome_norm: normNome(nome) || null,
        cpf_cnpj_socio: (c[3] ?? "").trim() || null,
        qualificacao: (c[4] ?? "").trim() || null,
        data_entrada: parseDataReceita(c[5] ?? ""),
        faixa_etaria: (c[10] ?? "").trim() || null,
      });
      if (buffer.length >= 500) await flush();
    });
    await flush();
    lidas += n;
    console.log(`  Socios${i}: ${n} linhas lidas, universo casou — acumulado gravado ${gravadas}`);
  }
  return { lidas, gravadas, erros };
}

/** Ingere os arquivos Empresas{idxs} de um mês (capital social), filtrando. */
export async function ingestEmpresas(
  mes: string, idxs: number[], universo: Set<string>, client: SupabaseClient,
): Promise<ReceitaResult> {
  const erros: string[] = [];
  let lidas = 0, gravadas = 0;
  for (const i of idxs) {
    let zip: string;
    try { zip = await baixar(`${mes}/Empresas${i}.zip`); }
    catch (e) { erros.push(`Empresas${i}: ${e instanceof Error ? e.message : e}`); continue; }
    let buffer: Record<string, unknown>[] = [];
    const flush = async () => { if (buffer.length) { gravadas += await flushUpsert(client, "cnpj_empresa", "cnpj_basico", buffer, erros); buffer = []; } };
    const n = await processarZip(zip, async (c) => {
      const b = basico(c[0] ?? "");
      if (b.length !== 8 || !universo.has(b)) return;
      buffer.push({
        cnpj_basico: b,
        razao_social: (c[1] ?? "").trim() || null,
        natureza_juridica: (c[2] ?? "").trim() || null,
        capital_social: parseValorBR(c[4] ?? ""),
        porte: (c[5] ?? "").trim() || null,
      });
      if (buffer.length >= 500) await flush();
    });
    await flush();
    lidas += n;
    console.log(`  Empresas${i}: ${n} linhas lidas — acumulado gravado ${gravadas}`);
  }
  return { lidas, gravadas, erros };
}

export function novoClient(): SupabaseClient { return sb(); }
