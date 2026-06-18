import { createClient } from "@supabase/supabase-js";
import { iterarResultados, type PncpResultado } from "./resultados-client.js";

const LOTE = 500;

function mapear(item: PncpResultado): Record<string, unknown> {
  return {
    id_compra_item:              item.idCompraItem ?? null,
    id_compra:                   item.idCompra ?? null,
    numero_controle_pncp_compra: item.numeroControlePNCPCompra ?? null,
    orgao_cnpj:                  item.orgaoEntidadeCnpj ?? null,
    unidade_codigo:              item.unidadeOrgaoCodigoUnidade ?? null,
    uf:                          item.unidadeOrgaoUfSigla ?? null,
    numero_item_pncp:            item.numeroItemPncp ?? null,
    sequencial_resultado:        item.sequencialResultado ?? null,
    ni_fornecedor:               item.niFornecedor ?? null,
    tipo_pessoa:                 item.tipoPessoa ?? null,
    nome_fornecedor:             item.nomeRazaoSocialFornecedor ?? null,
    quantidade_homologada:       item.quantidadeHomologada ?? null,
    valor_unitario_homologado:   item.valorUnitarioHomologado ?? null,
    valor_total_homologado:      item.valorTotalHomologado ?? null,
    percentual_desconto:         item.percentualDesconto ?? null,
    situacao_id:                 item.situacaoCompraItemResultadoId ?? null,
    situacao_nome:               item.situacaoCompraItemResultadoNome ?? null,
    porte_fornecedor_id:         item.porteFornecedorId ?? null,
    porte_fornecedor_nome:       item.porteFornecedorNome ?? null,
    natureza_juridica_id:        item.naturezaJuridicaId ?? null,
    natureza_juridica_nome:      item.naturezaJuridicaNome ?? null,
    data_resultado_pncp:         item.dataResultadoPncp ?? null,
    data_inclusao_pncp:          item.dataInclusaoPncp ?? null,
    data_atualizacao_pncp:       item.dataAtualizacaoPncp ?? null,
    aplicacao_margem_preferencia: item.aplicacaoMargemPreferencia ?? null,
    aplicacao_beneficio_meepp:   item.aplicacaoBeneficioMeepp ?? null,
    ingerido_em:                 new Date().toISOString(),
  };
}

export async function jobResultadosPncp(opts: {
  supabaseUrl: string;
  supabaseKey: string;
  dataInicial: string;
  dataFinal: string;
}): Promise<{ total: number; inseridos: number; erros: number }> {
  const sb = createClient(opts.supabaseUrl, opts.supabaseKey);
  let total = 0, inseridos = 0, erros = 0;
  let lote: Record<string, unknown>[] = [];

  try {
    for await (const item of iterarResultados(opts.dataInicial, opts.dataFinal)) {
      total++;
      lote.push(mapear(item));

      if (lote.length >= LOTE) {
        // Deduplica pelo PK composto dentro do lote
        const dedup = Object.values(
          Object.fromEntries(lote.map((r) => [`${r.id_compra_item}|${r.sequencial_resultado}`, r]))
        );
        const { error } = await sb
          .from("pncp_resultados")
          .upsert(dedup, { onConflict: "id_compra_item,sequencial_resultado" });
        if (error) { console.error(`  upsert erro:`, error.message); erros++; }
        else inseridos += dedup.length;
        lote = [];
      }
    }

    if (lote.length > 0) {
      const dedup = Object.values(
        Object.fromEntries(lote.map((r) => [`${r.id_compra_item}|${r.sequencial_resultado}`, r]))
      );
      const { error } = await sb
        .from("pncp_resultados")
        .upsert(dedup, { onConflict: "id_compra_item,sequencial_resultado" });
      if (error) { console.error(`  upsert erro final:`, error.message); erros++; }
      else inseridos += dedup.length;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("404")) console.error(`  erro:`, msg.slice(0, 200));
  }

  return { total, inseridos, erros };
}
