/**
 * job_ingestao_viagens
 * Coleta viagens de servidores federais do Portal da Transparência.
 * A API exige codigoOrgao + período máximo de 1 mês por requisição.
 * Itera sobre órgãos relevantes × meses do intervalo solicitado.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inserirExecucao, atualizarExecucao, inserirEtapa, atualizarEtapa } from "./db.js";

const PORTAL_BASE_URL = "https://api.portaldatransparencia.gov.br/api-de-dados";
const TAMANHO_PAGINA = 100;
const DELAY_MS = 300;

// Órgãos federais relevantes para o BR Insider
const ORGAOS_ALVO = [
  "01000", // Câmara dos Deputados
  "02000", // Senado Federal
  "20000", // Presidência da República
  "22000", // AGU
  "25000", // Ministério da Fazenda
  "26000", // Ministério da Educação
  "30000", // Ministério da Saúde
  "36000", // Ministério da Justiça
  "39000", // Ministério do Trabalho
  "44000", // Ministério da Infraestrutura / Transportes
  "52000", // Ministério do Desenvolvimento Social
  "55000", // CGU
  "47000", // Ministério do Meio Ambiente
  "49000", // Ministério de Minas e Energia
  "51000", // Ministério das Comunicações
  "53000", // Ministério da Integração e Desenvolvimento Regional
  "57000", // Ministério do Esporte
  "58000", // Ministério da Cultura
];

export interface JobIngestaoViagensConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  portalApiKey: string;
  portalBaseUrl?: string;
  anos?: number[];
}

export interface ResultadoAnoViagens {
  ano: number;
  total: number;
  inseridos: number;
}

export interface ResultadoJobViagens {
  execucao_id: string;
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoViagens[];
  erro?: string;
}

function fmtData(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function ultimoDiaMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function parseDataISO(s: string | null | undefined): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

async function buscarMesOrgao(
  apiKey: string,
  orgao: string,
  ano: number,
  mes: number
): Promise<Record<string, unknown>[]> {
  const todos: Record<string, unknown>[] = [];
  const ultimo = ultimoDiaMes(ano, mes);
  const inicio = fmtData(new Date(ano, mes - 1, 1));
  const fim = fmtData(new Date(ano, mes - 1, ultimo));

  let pagina = 1;
  while (true) {
    const url =
      `${PORTAL_BASE_URL}/viagens` +
      `?pagina=${pagina}&tamanhoPagina=${TAMANHO_PAGINA}` +
      `&codigoOrgao=${orgao}` +
      `&dataIdaDe=${inicio}&dataIdaAte=${fim}` +
      `&dataRetornoDe=${inicio}&dataRetornoAte=${fim}`;

    const res = await fetch(url, {
      headers: { "chave-api-dados": apiKey, Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) break;

    const data = (await res.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) break;

    todos.push(...(data as Record<string, unknown>[]));
    if (data.length < TAMANHO_PAGINA) break;
    pagina++;
    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  return todos;
}

function mapearViagem(item: Record<string, unknown>): Record<string, unknown> | null {
  const id_portal = item.id;
  if (!id_portal) return null;

  const viagem = (item.viagem ?? {}) as Record<string, unknown>;
  const beneficiario = (item.beneficiario ?? {}) as Record<string, unknown>;
  const cargo = (item.cargo ?? {}) as Record<string, unknown>;
  const funcao = (item.funcao ?? {}) as Record<string, unknown>;
  const orgao = (item.orgao ?? {}) as Record<string, unknown>;

  return {
    id_portal: Number(id_portal),
    pcdp: viagem.pcdp ?? null,
    num_pcdp: viagem.numPcdp ?? null,
    motivo: viagem.motivo ?? null,
    situacao: item.situacao ?? null,
    tipo_viagem: item.tipoViagem ?? null,
    urgencia: String(viagem.urgenciaViagem ?? "Não").toLowerCase() === "sim",
    nome_beneficiario: beneficiario.nome ?? null,
    cpf_formatado: beneficiario.cpfFormatado ?? null,
    cargo: cargo.descricao ?? null,
    funcao: funcao.descricao ?? null,
    orgao_codigo: orgao.codigoSIAFI ?? null,
    orgao_nome: orgao.nome ?? null,
    orgao_sigla: String(orgao.sigla ?? "").trim() || null,
    orgao_poder: orgao.descricaoPoder ?? null,
    data_inicio: parseDataISO(item.dataInicioAfastamento as string),
    data_fim: parseDataISO(item.dataFimAfastamento as string),
    valor_diarias: item.valorTotalDiarias ?? 0,
    valor_passagens: item.valorTotalPassagem ?? 0,
    valor_total: item.valorTotalViagem ?? 0,
    atualizado_em: new Date().toISOString(),
  };
}

async function upsertLote(sb: SupabaseClient, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { error } = await sb
    .from("viagens")
    .upsert(rows, { onConflict: "id_portal", ignoreDuplicates: false });
  if (error) {
    console.error(`  Upsert erro: ${error.message}`);
    return 0;
  }
  return rows.length;
}

export async function jobIngestaoViagens(
  config: JobIngestaoViagensConfig
): Promise<ResultadoJobViagens> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
  const anos = config.anos ?? [2023, 2024, 2025, 2026];
  const apiKey = config.portalApiKey;

  const execucao_id = await inserirExecucao(sb, {
    job_nome: "job_ingestao_viagens",
    status: "em_andamento",
    detalhes: { anos },
  });
  const etapa_id = await inserirEtapa(sb, {
    execucao_id,
    etapa_nome: "ingestao_viagens",
    status: "em_andamento",
    detalhes: { anos },
  });

  const resultados_por_ano: ResultadoAnoViagens[] = [];

  try {
    for (const ano of anos) {
      let totalAno = 0;
      let inseridosAno = 0;
      const mesAtual = ano === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;

      for (let mes = 1; mes <= mesAtual; mes++) {
        for (const orgao of ORGAOS_ALVO) {
          const itens = await buscarMesOrgao(apiKey, orgao, ano, mes);
          if (itens.length === 0) continue;

          const rows = itens.map(mapearViagem).filter((r): r is Record<string, unknown> => r !== null);
          totalAno += rows.length;
          inseridosAno += await upsertLote(sb, rows);
          await new Promise((r) => setTimeout(r, DELAY_MS));
        }
        process.stdout.write(`\r  ${ano}/${String(mes).padStart(2, "0")}: ${totalAno} atos acumulados`);
      }
      console.log();

      resultados_por_ano.push({ ano, total: totalAno, inseridos: inseridosAno });
      console.log(`  ${ano}: total=${totalAno} inseridos=${inseridosAno}`);
    }

    const fin = new Date().toISOString();
    await atualizarEtapa(sb, etapa_id, { finalizado_em: fin, status: "sucesso", detalhes: { resultados_por_ano } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em: fin, status: "sucesso", detalhes: { resultados_por_ano } });

    return { execucao_id, status: "sucesso", resultados_por_ano };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    console.error(`[ERRO] ${erro}`);
    const fin = new Date().toISOString();
    await atualizarEtapa(sb, etapa_id, { finalizado_em: fin, status: "erro", detalhes: { erro } });
    await atualizarExecucao(sb, execucao_id, { finalizado_em: fin, status: "erro", detalhes: { erro } });
    return { execucao_id, status: "erro", resultados_por_ano, erro };
  }
}
