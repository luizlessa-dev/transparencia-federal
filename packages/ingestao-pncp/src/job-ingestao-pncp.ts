import { createClient } from "@supabase/supabase-js";
import { iterarLicitacoes, MODALIDADES, type PncpLicitacao } from "./pncp-client.js";

const LOTE = 500;

function mapear(item: PncpLicitacao): Record<string, unknown> {
  return {
    numero_controle_pncp: item.numeroControlePNCP,
    orgao_cnpj: item.orgaoEntidadeCnpj ?? null,
    orgao_nome: item.orgaoEntidadeRazaoSocial ?? null,
    poder_id: item.orgaoEntidadePoderId ?? null,
    esfera_id: item.orgaoEntidadeEsferaId ?? null,
    ano_compra: item.anoCompraPncp ?? null,
    sequencial_compra: item.sequencialCompraPncp ?? null,
    numero_compra: item.numeroCompra ?? null,
    processo: item.processo ?? null,
    modalidade_id: item.modalidadeIdPncp ?? null,
    modalidade_nome: item.modalidadeNome ?? null,
    modo_disputa_id: item.modoDisputaIdPncp ?? null,
    modo_disputa_nome: null,
    objeto_compra: item.objetoCompra ?? null,
    valor_estimado: item.valorTotalEstimado ?? null,
    valor_homologado: item.valorTotalHomologado ?? null,
    data_publicacao_pncp: item.dataPublicacaoPncp ?? null,
    data_abertura_proposta: item.dataAberturaPropostaPncp ?? null,
    data_encerramento_proposta: item.dataEncerramentoPropostaPncp ?? null,
    data_inclusao: item.dataInclusaoPncp ?? null,
    data_atualizacao: item.dataAtualizacaoPncp ?? null,
    situacao_id: item.situacaoCompraIdPncp ?? null,
    situacao_nome: item.situacaoCompraNomePncp ?? null,
    uf: item.unidadeOrgaoUfSigla ?? null,
    municipio_nome: item.unidadeOrgaoMunicipioNome ?? null,
    municipio_ibge: item.unidadeOrgaoCodigoIbge ?? null,
    unidade_codigo: item.unidadeOrgaoCodigoUnidade ?? null,
    unidade_nome: item.unidadeOrgaoNomeUnidade ?? null,
    emenda_parlamentar: null,
    srp: item.srp ?? null,
    existe_resultado: item.existeResultado ?? null,
    link_sistema_origem: null,
    dados: {},
    ingerido_em: new Date().toISOString(),
  };
}

export interface ResultadoPncp {
  modalidade: number;
  total: number;
  inseridos: number;
  erros: number;
}

export async function jobIngestaoPncp(opts: {
  supabaseUrl: string;
  supabaseKey: string;
  dataInicial: string;
  dataFinal: string;
  modalidades?: number[];
}): Promise<{ resultados: ResultadoPncp[] }> {
  const sb = createClient(opts.supabaseUrl, opts.supabaseKey);
  const modalidades = opts.modalidades ?? MODALIDADES;
  const resultados: ResultadoPncp[] = [];

  for (const modalidade of modalidades) {
    let total = 0, inseridos = 0, erros = 0;
    let lote: Record<string, unknown>[] = [];

    try {
      for await (const item of iterarLicitacoes(opts.dataInicial, opts.dataFinal, modalidade)) {
        total++;
        lote.push(mapear(item));

        if (lote.length >= LOTE) {
          const { error } = await sb
            .from("pncp_licitacoes")
            .upsert(lote, { onConflict: "numero_controle_pncp" });
          if (error) { console.error(`  [modal ${modalidade}] upsert erro:`, error.message); erros++; }
          else inseridos += lote.length;
          lote = [];
        }
      }

      if (lote.length > 0) {
        const { error } = await sb
          .from("pncp_licitacoes")
          .upsert(lote, { onConflict: "numero_controle_pncp" });
        if (error) { console.error(`  [modal ${modalidade}] upsert erro final:`, error.message); erros++; }
        else inseridos += lote.length;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // 404 = modalidade sem dados nesse período — esperado
      if (!msg.includes("404")) {
        console.error(`  [modal ${modalidade}] erro:`, msg.slice(0, 200));
      }
    }

    if (total > 0) {
      resultados.push({ modalidade, total, inseridos, erros });
    }
  }

  return { resultados };
}
