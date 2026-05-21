/**
 * job_ingestao_sancionados
 * Ingere CEIS (empresas impedidas) e CNEP (empresas punidas) do Portal da Transparência
 * e popula portal_sancionados, depois cruza com ceaps_brutas → cam_parlamentar_risco.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const PORTAL_BASE_URL_DEFAULT = "https://api.portaldatransparencia.gov.br/api-de-dados";
const TAMANHO_PAGINA = 100;
const TAMANHO_LOTE = 200;

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface JobIngestaoSancionadosConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  portalApiKey: string;
  portalBaseUrl?: string;
}

export interface ResultadoJobSancionados {
  status: "sucesso" | "erro";
  total_ceis: number;
  total_cnep: number;
  total_ativos: number;
  fornecedores_cruzados: number;
  duracao_ms: number;
  erro?: string;
}

// ---------------------------------------------------------------------------
// Helpers de extração de campos
// ---------------------------------------------------------------------------

function extrairCpfCnpj(item: Record<string, unknown>): string | null {
  const sancionado = item.sancionado as Record<string, unknown> | undefined;
  // Campo real na API do Portal: sancionado.codigoFormatado (ex: "970.937.508-34" ou "12.345.678/0001-90")
  const raw =
    sancionado?.codigoFormatado ??
    sancionado?.cpfCnpj ??
    item.codigoFormatado ??
    item.cpfCnpj ??
    item.cpf ??
    item.cnpj;
  if (!raw) return null;
  return String(raw).replace(/[.\-\/\s]/g, "").trim() || null;
}

function extrairNome(item: Record<string, unknown>): string | null {
  const sancionado = item.sancionado as Record<string, unknown> | undefined;
  const nome = sancionado?.nome ?? item.nome ?? item.razaoSocial ?? "";
  return String(nome).trim() || null;
}

function parseDataBR(s: string | null | undefined): string | null {
  if (!s || s === "Sem informação") return null;
  const m = String(s).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

function extrairTipoSancao(item: Record<string, unknown>): string | null {
  try {
    const ts = item.tipoSancao as Record<string, unknown> | undefined;
    return String(ts?.descricaoResumida ?? ts?.descricao ?? "").trim() || null;
  } catch {
    return null;
  }
}

function extrairOrgao(item: Record<string, unknown>): { orgao_nome: string | null; orgao_uf: string | null } {
  try {
    const org = item.orgaoSancionador as Record<string, unknown> | undefined;
    return {
      orgao_nome: String(org?.nome ?? "").trim() || null,
      orgao_uf: String(org?.siglaUf ?? "").trim() || null,
    };
  } catch {
    return { orgao_nome: null, orgao_uf: null };
  }
}

function estaAtivo(dataFim: string | null): boolean {
  if (!dataFim) return true; // sem fim = indeterminado = ativo
  const hoje = new Date().toISOString().slice(0, 10);
  return dataFim >= hoje;
}

// ---------------------------------------------------------------------------
// Paginação do Portal da Transparência
// ---------------------------------------------------------------------------

async function paginarEndpoint(
  baseUrl: string,
  path: string,
  apiKey: string,
  itens = TAMANHO_PAGINA
): Promise<Record<string, unknown>[]> {
  const todos: Record<string, unknown>[] = [];
  let pagina = 1;

  while (true) {
    const url = `${baseUrl}${path}?pagina=${pagina}&tamanhoPagina=${itens}`;
    const res = await fetch(url, {
      headers: { "chave-api-dados": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      console.error(`  Erro ${res.status} em ${path} pág ${pagina}`);
      break;
    }

    const data = (await res.json()) as unknown[];
    if (!Array.isArray(data) || data.length === 0) break;

    todos.push(...(data as Record<string, unknown>[]));
    console.log(`  ${path}: ${todos.length} registros...`);

    if (data.length < itens) break;
    pagina++;
    await new Promise((r) => setTimeout(r, 200)); // throttle
  }

  return todos;
}

// ---------------------------------------------------------------------------
// Mapeamento de item → linha do banco
// ---------------------------------------------------------------------------

function mapearItem(
  item: Record<string, unknown>,
  tipoRegistro: "CEIS" | "CNEP"
): Record<string, unknown> | null {
  const cpf_cnpj = extrairCpfCnpj(item);
  if (!cpf_cnpj) return null;

  const data_inicio = parseDataBR(item.dataInicioSancao as string | undefined);
  const data_fim = parseDataBR(item.dataFimSancao as string | undefined);
  const { orgao_nome, orgao_uf } = extrairOrgao(item);

  return {
    cpf_cnpj,
    nome: extrairNome(item),
    tipo_registro: tipoRegistro,
    tipo_sancao: extrairTipoSancao(item),
    data_inicio,
    data_fim,
    orgao_nome,
    orgao_uf,
    ativo: estaAtivo(data_fim),
    atualizado_em: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Upsert em lotes
// ---------------------------------------------------------------------------

async function upsertLotes(
  sb: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<{ inseridos: number; erros: number }> {
  let inseridos = 0;
  let erros = 0;

  for (let i = 0; i < rows.length; i += TAMANHO_LOTE) {
    const lote = rows.slice(i, i + TAMANHO_LOTE);
    const { error } = await sb
      .from("portal_sancionados")
      .upsert(lote, { onConflict: "cpf_cnpj,tipo_registro,tipo_sancao,data_inicio" });

    if (error) {
      erros += lote.length;
      console.error(`  Upsert erro (lote ${i / TAMANHO_LOTE + 1}): ${error.message}`);
    } else {
      inseridos += lote.length;
    }
  }

  return { inseridos, erros };
}

// ---------------------------------------------------------------------------
// Cruzamento CEAP × sancionados
// ---------------------------------------------------------------------------

type CeapRow = { deputado_id: number | string; cnpj_cpf_fornecedor: string };

async function computarCruzamentoCeap(sb: SupabaseClient): Promise<number> {
  // Verifica se cam_parlamentar_risco existe
  const { error: checkErr } = await sb
    .from("cam_parlamentar_risco")
    .select("deputado_id")
    .limit(0);

  if (checkErr) {
    console.log("  cam_parlamentar_risco não existe ainda — pulando cruzamento");
    return 0;
  }

  // Busca fornecedores do CEAP
  const { data: ceapForn } = await sb
    .from("ceaps_brutas")
    .select("deputado_id, cnpj_cpf_fornecedor")
    .not("cnpj_cpf_fornecedor", "is", null);

  if (!ceapForn || ceapForn.length === 0) {
    console.log("  ceaps_brutas vazio — pulando cruzamento");
    return 0;
  }

  // Lista de CNPJs/CPFs únicos normalizados
  const cnpjs = [
    ...new Set(
      (ceapForn as CeapRow[]).map((r) =>
        String(r.cnpj_cpf_fornecedor).replace(/[.\-\/]/g, "")
      )
    ),
  ];

  // Quais estão sancionados e ativos
  const { data: sanc } = await sb
    .from("portal_sancionados")
    .select("cpf_cnpj")
    .in("cpf_cnpj", cnpjs)
    .eq("ativo", true);

  const sancSet = new Set(
    (sanc ?? []).map((r: { cpf_cnpj: string }) => r.cpf_cnpj)
  );

  // Conta por deputado (fornecedores sancionados distintos)
  const porDep: Record<string, Set<string>> = {};
  for (const row of ceapForn as CeapRow[]) {
    const cnpj = String(row.cnpj_cpf_fornecedor).replace(/[.\-\/]/g, "");
    if (sancSet.has(cnpj)) {
      const depId = String(row.deputado_id);
      if (!porDep[depId]) porDep[depId] = new Set();
      porDep[depId].add(cnpj);
    }
  }

  // Atualiza cam_parlamentar_risco
  let atualizados = 0;
  for (const [depId, cnpjSet] of Object.entries(porDep)) {
    const { error } = await sb
      .from("cam_parlamentar_risco")
      .update({
        fornecedores_sancionados: cnpjSet.size,
        atualizado_em: new Date().toISOString(),
      })
      .eq("deputado_id", parseInt(depId, 10));

    if (!error) atualizados++;
  }

  console.log(
    `  Cruzamento CEAP: ${atualizados} deputados com fornecedor sancionado`
  );
  return atualizados;
}

// ---------------------------------------------------------------------------
// Job principal
// ---------------------------------------------------------------------------

export async function jobIngestaoSancionados(
  config: JobIngestaoSancionadosConfig
): Promise<ResultadoJobSancionados> {
  const t0 = Date.now();
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const baseUrl = config.portalBaseUrl ?? PORTAL_BASE_URL_DEFAULT;

  let total_ceis = 0;
  let total_cnep = 0;
  let total_ativos = 0;
  let fornecedores_cruzados = 0;

  try {
    // 1. CEIS
    console.log("\n[CEIS] Iniciando paginação...");
    const itensCeis = await paginarEndpoint(baseUrl, "/ceis", config.portalApiKey);
    total_ceis = itensCeis.length;
    console.log(`[CEIS] ${total_ceis} registros obtidos. Mapeando...`);

    const rowsCeis = itensCeis
      .map((item) => mapearItem(item, "CEIS"))
      .filter((r): r is Record<string, unknown> => r !== null);

    console.log(`[CEIS] ${rowsCeis.length} válidos. Fazendo upsert...`);
    await upsertLotes(sb, rowsCeis);

    // 2. CNEP
    console.log("\n[CNEP] Iniciando paginação...");
    const itensCnep = await paginarEndpoint(baseUrl, "/cnep", config.portalApiKey);
    total_cnep = itensCnep.length;
    console.log(`[CNEP] ${total_cnep} registros obtidos. Mapeando...`);

    const rowsCnep = itensCnep
      .map((item) => mapearItem(item, "CNEP"))
      .filter((r): r is Record<string, unknown> => r !== null);

    console.log(`[CNEP] ${rowsCnep.length} válidos. Fazendo upsert...`);
    await upsertLotes(sb, rowsCnep);

    // 3. Conta ativos
    const { count } = await sb
      .from("portal_sancionados")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true);
    total_ativos = count ?? 0;

    // 4. Cruzamento CEAP
    console.log("\n[Cruzamento] Computando cruzamento CEAP...");
    fornecedores_cruzados = await computarCruzamentoCeap(sb);

    const duracao_ms = Date.now() - t0;
    console.log(`\n[OK] Concluído em ${duracao_ms}ms`);

    return {
      status: "sucesso",
      total_ceis,
      total_cnep,
      total_ativos,
      fornecedores_cruzados,
      duracao_ms,
    };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    console.error(`[ERRO] ${erro}`);
    return {
      status: "erro",
      total_ceis,
      total_cnep,
      total_ativos,
      fornecedores_cruzados,
      duracao_ms: Date.now() - t0,
      erro,
    };
  }
}
