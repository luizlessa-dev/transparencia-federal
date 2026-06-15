import { createClient } from "@supabase/supabase-js";
import { iterarLicitacoes, MODALIDADES, type PncpLicitacao } from "./pncp-client.js";

const LOTE = 100;

function mapear(item: PncpLicitacao): Record<string, unknown> {
  return {
    numero_controle_pncp: item.numeroControlePNCP,
    orgao_cnpj: item.orgaoEntidade?.cnpj ?? null,
    orgao_nome: item.orgaoEntidade?.razaoSocial ?? null,
    poder_id: item.orgaoEntidade?.poderId ?? null,
    esfera_id: item.orgaoEntidade?.esferaId ?? null,
    ano_compra: item.anoCompra ?? null,
    sequencial_compra: item.sequencialCompra ?? null,
    numero_compra: item.numeroCompra ?? null,
    processo: item.processo ?? null,
    modalidade_id: item.modalidadeId ?? null,
    modalidade_nome: item.modalidadeNome ?? null,
    modo_disputa_id: item.modoDisputaId ?? null,
    modo_disputa_nome: item.modoDisputaNome ?? null,
    objeto_compra: item.objetoCompra ?? null,
    valor_estimado: item.valorTotalEstimado ?? null,
    valor_homologado: item.valorTotalHomologado ?? null,
    data_publicacao_pncp: item.dataPublicacaoPncp ?? null,
    data_abertura_proposta: item.dataAberturaProposta ?? null,
    data_encerramento_proposta: item.dataEncerramentoProposta ?? null,
    data_inclusao: item.dataInclusao ?? null,
    data_atualizacao: item.dataAtualizacao ?? null,
    situacao_id: item.situacaoCompraId ?? null,
    situacao_nome: item.situacaoCompraNome ?? null,
    uf: item.unidadeOrgao?.ufSigla ?? null,
    municipio_nome: item.unidadeOrgao?.municipioNome ?? null,
    municipio_ibge: item.unidadeOrgao?.codigoIbge ?? null,
    unidade_codigo: item.unidadeOrgao?.codigoUnidade ?? null,
    unidade_nome: item.unidadeOrgao?.nomeUnidade ?? null,
    emenda_parlamentar: item.emendaParlamentar ?? null,
    srp: item.srp ?? null,
    existe_resultado: item.existeResultado ?? null,
    link_sistema_origem: item.linkSistemaOrigem ?? null,
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
      // Modalidade sem dados: 400 "no records" ou HTML de rate-limit — ignora
      const msg = err instanceof Error ? err.message : String(err);
      const silencioso = msg.includes("400") || msg.includes("<html") || msg.includes("Unexpected token");
      if (!silencioso) console.error(`  [modal ${modalidade}] erro:`, msg);
    }

    if (total > 0) {
      resultados.push({ modalidade, total, inseridos, erros });
    }
  }

  return { resultados };
}
