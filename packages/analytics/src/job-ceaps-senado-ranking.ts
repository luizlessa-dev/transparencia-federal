/**
 * job_ceaps_senado_ranking
 * Agrega ceaps_senado_brutas → ceaps_senado_ranking por senador × ano.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const ANOS_DEFAULT = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
const PAGE_SIZE = 1000;

interface BrutaRow {
  senador: string;
  senador_normalizado: string;
  tipo_despesa: string | null;
  cnpj_cpf: string | null;
  fornecedor: string | null;
  valor_reembolsado: number;
}

interface SenadorAgg {
  senador: string;
  senador_normalizado: string;
  total_reembolsado: number;
  total_documentos: number;
  por_tipo: Record<string, number>;
  fornecedores: Record<string, { nome: string; total: number }>;
}

export interface JobCeapsSenadorRankingConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anos?: number[];
}

export interface ResultadoAnoCeapsRanking {
  ano: number;
  senadores: number;
  duracao_ms: number;
  erro?: string;
}

export interface ResultadoJobCeapsRanking {
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoCeapsRanking[];
  erro?: string;
}

export async function jobCeapsSenadorRanking(
  config: JobCeapsSenadorRankingConfig
): Promise<ResultadoJobCeapsRanking> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const anos = config.anos ?? ANOS_DEFAULT;
  const resultados_por_ano: ResultadoAnoCeapsRanking[] = [];

  try {
    for (const ano of anos) {
      const t0 = Date.now();
      console.log(`\n  [${ano}] Carregando brutas...`);

      const mapa = new Map<string, SenadorAgg>();
      let pagina = 0;
      let total_linhas = 0;

      while (true) {
        const { data, error } = await sb
          .from("ceaps_senado_brutas")
          .select("senador,senador_normalizado,tipo_despesa,cnpj_cpf,fornecedor,valor_reembolsado")
          .eq("ano", ano)
          .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);

        if (error) throw new Error(`Select brutas: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const r of data as BrutaRow[]) {
          const key = r.senador_normalizado;
          if (!mapa.has(key)) {
            mapa.set(key, {
              senador: r.senador,
              senador_normalizado: r.senador_normalizado,
              total_reembolsado: 0,
              total_documentos: 0,
              por_tipo: {},
              fornecedores: {},
            });
          }

          const s = mapa.get(key)!;
          const valor = Number(r.valor_reembolsado) || 0;
          s.total_reembolsado += valor;
          s.total_documentos += 1;

          const tipo = r.tipo_despesa ?? "Outros";
          s.por_tipo[tipo] = (s.por_tipo[tipo] ?? 0) + valor;

          if (r.cnpj_cpf && r.fornecedor) {
            if (!s.fornecedores[r.cnpj_cpf]) {
              s.fornecedores[r.cnpj_cpf] = { nome: r.fornecedor, total: 0 };
            }
            s.fornecedores[r.cnpj_cpf].total += valor;
          }
        }

        total_linhas += data.length;
        pagina++;
        if (pagina % 5 === 0) console.log(`  [${ano}] ${total_linhas} linhas...`);
        if (data.length < PAGE_SIZE) break;
      }

      console.log(`  [${ano}] ${mapa.size} senadores, ${total_linhas} despesas`);

      // Ranking
      const senadores = Array.from(mapa.values()).sort(
        (a, b) => b.total_reembolsado - a.total_reembolsado
      );

      // Upsert em lotes
      const LOTE = 100;
      for (let i = 0; i < senadores.length; i += LOTE) {
        const lote = senadores.slice(i, i + LOTE).map((s, idx) => {
          const top_fornecedores = Object.entries(s.fornecedores)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 10)
            .map(([cnpj, f]) => ({ cnpj_cpf: cnpj, nome: f.nome, total: Math.round(f.total * 100) / 100 }));

          return {
            senador: s.senador,
            senador_normalizado: s.senador_normalizado,
            ano,
            total_reembolsado: Math.round(s.total_reembolsado * 100) / 100,
            total_documentos: s.total_documentos,
            por_tipo: s.por_tipo,
            top_fornecedores,
            posicao: i + idx + 1,
            atualizado_em: new Date().toISOString(),
          };
        });

        const { error } = await sb
          .from("ceaps_senado_ranking")
          .upsert(lote, { onConflict: "senador_normalizado,ano" });
        if (error) throw new Error(`Upsert ranking: ${error.message}`);
      }

      const duracao_ms = Date.now() - t0;
      console.log(`  [${ano}] ✓ ${senadores.length} senadores — ${duracao_ms}ms`);
      resultados_por_ano.push({ ano, senadores: senadores.length, duracao_ms });
    }

    return { status: "sucesso", resultados_por_ano };
  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    return { status: "erro", resultados_por_ano, erro };
  }
}
