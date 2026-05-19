/**
 * job_tse_receitas_agg
 * Agrega tse_receitas_brutas → tse_candidatos_receitas_agg
 * Uma linha por candidato por ano eleitoral, com ranking de financiamento.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const JOB_NOME = "job_tse_receitas_agg";
const ETAPA_NOME = "tse_receitas_agg";
const PAGE_SIZE = 1000; // Supabase PostgREST limita a 1000 rows por request
const ANOS_DEFAULT = [2022, 2018];

// Normaliza "FUNDO ESPECIAL" (FEFC), "FUNDO PARTIDARIO", "Recursos próprios", etc.
function classificarFonte(ds_fonte: string | null, ds_origem: string | null): "fefc" | "fundo_partidario" | "recursos_proprios" | "outros" {
  const f = (ds_fonte ?? "").toLowerCase();
  const o = (ds_origem ?? "").toLowerCase();
  if (f.includes("especial") || f.includes("fefc")) return "fefc";
  if (f.includes("partidari")) return "fundo_partidario";
  if (o.includes("próprio") || o.includes("proprio") || o.includes("recursos do candidato")) return "recursos_proprios";
  return "outros";
}

interface ReceitaRow {
  sq_candidato: string;
  nm_candidato: string;
  nr_cpf_candidato: string | null;
  cd_cargo: number;
  ds_cargo: string;
  sg_uf: string;
  sg_partido: string | null;
  nm_partido: string | null;
  ds_fonte_receita: string | null;
  ds_origem_receita: string | null;
  nr_cpf_cnpj_doador: string | null;
  nm_doador_rfb: string | null;
  nm_doador: string | null;
  vr_receita: number;
}

interface CandidatoAgg {
  sq_candidato: string;
  nm_candidato: string;
  nr_cpf_candidato: string | null;
  cd_cargo: number;
  ds_cargo: string;
  sg_uf: string;
  sg_partido: string | null;
  nm_partido: string | null;
  total_receitas: number;
  total_registros: number;
  fefc: number;
  fundo_partidario: number;
  recursos_proprios: number;
  outros_recursos: number;
  por_origem: Record<string, number>;
  doadores: Record<string, { nome: string; total: number }>;
}

export interface JobTseReceitasAggConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  anos?: number[];
}

export interface ResultadoAnoAgg {
  ano: number;
  candidatos: number;
  deputados: number;
  senadores: number;
  duracao_ms: number;
  erro?: string;
}

export interface ResultadoJobTseAgg {
  status: "sucesso" | "erro";
  resultados_por_ano: ResultadoAnoAgg[];
  erro?: string;
}

export async function jobTseReceitasAgg(
  config: JobTseReceitasAggConfig
): Promise<ResultadoJobTseAgg> {
  const sb = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false },
  });
  const anos = config.anos ?? ANOS_DEFAULT;
  const resultados_por_ano: ResultadoAnoAgg[] = [];

  try {
    for (const ano of anos) {
      const t0 = Date.now();
      console.log(`\n  [${ano}] Carregando receitas...`);

      const mapa = new Map<string, CandidatoAgg>();
      let pagina = 0;
      let total_linhas = 0;

      while (true) {
        const { data, error } = await sb
          .from("tse_receitas_brutas")
          .select("sq_candidato,nm_candidato,nr_cpf_candidato,cd_cargo,ds_cargo,sg_uf,sg_partido,nm_partido,ds_fonte_receita,ds_origem_receita,nr_cpf_cnpj_doador,nm_doador_rfb,nm_doador,vr_receita")
          .eq("ano_eleicao", ano)
          .range(pagina * PAGE_SIZE, (pagina + 1) * PAGE_SIZE - 1);

        if (error) throw new Error(`Select receitas: ${error.message}`);
        if (!data || data.length === 0) break;

        for (const r of data as ReceitaRow[]) {
          const key = r.sq_candidato;
          if (!mapa.has(key)) {
            mapa.set(key, {
              sq_candidato: r.sq_candidato,
              nm_candidato: r.nm_candidato,
              nr_cpf_candidato: r.nr_cpf_candidato,
              cd_cargo: r.cd_cargo,
              ds_cargo: r.ds_cargo,
              sg_uf: r.sg_uf,
              sg_partido: r.sg_partido,
              nm_partido: r.nm_partido,
              total_receitas: 0,
              total_registros: 0,
              fefc: 0,
              fundo_partidario: 0,
              recursos_proprios: 0,
              outros_recursos: 0,
              por_origem: {},
              doadores: {},
            });
          }

          const c = mapa.get(key)!;
          const valor = Number(r.vr_receita) || 0;
          c.total_receitas += valor;
          c.total_registros += 1;

          const classe = classificarFonte(r.ds_fonte_receita, r.ds_origem_receita);
          c[classe === "outros" ? "outros_recursos" : classe] += valor;

          // Breakdown por origem
          const origem = r.ds_origem_receita ?? "Não informado";
          c.por_origem[origem] = (c.por_origem[origem] ?? 0) + valor;

          // Doadores
          const cpfCnpj = r.nr_cpf_cnpj_doador;
          if (cpfCnpj && cpfCnpj !== "#NULO" && cpfCnpj !== "-1") {
            const nomeDoador = r.nm_doador_rfb || r.nm_doador || "Desconhecido";
            if (!c.doadores[cpfCnpj]) {
              c.doadores[cpfCnpj] = { nome: nomeDoador, total: 0 };
            }
            c.doadores[cpfCnpj].total += valor;
          }
        }

        total_linhas += data.length;
        pagina++;
        if (pagina % 10 === 0) console.log(`  [${ano}] ${total_linhas} linhas processadas...`);
        if (data.length < PAGE_SIZE) break;
      }

      console.log(`  [${ano}] ${mapa.size} candidatos únicos, ${total_linhas} receitas`);

      // Calcular rankings e preparar rows para upsert
      const candidatos = Array.from(mapa.values()).sort((a, b) => b.total_receitas - a.total_receitas);
      const deputados = candidatos.filter(c => c.cd_cargo === 6).sort((a, b) => b.total_receitas - a.total_receitas);
      const senadores = candidatos.filter(c => c.cd_cargo === 5).sort((a, b) => b.total_receitas - a.total_receitas);

      const posicaoGeral = new Map<string, number>();
      candidatos.forEach((c, i) => posicaoGeral.set(c.sq_candidato, i + 1));

      const posicaoCargo = new Map<string, number>();
      deputados.forEach((c, i) => posicaoCargo.set(c.sq_candidato, i + 1));
      senadores.forEach((c, i) => posicaoCargo.set(c.sq_candidato, i + 1));

      // Upsert em lotes
      const LOTE = 200;
      let upsertados = 0;
      for (let i = 0; i < candidatos.length; i += LOTE) {
        const lote = candidatos.slice(i, i + LOTE).map(c => {
          // Top 10 doadores
          const top_doadores = Object.entries(c.doadores)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 10)
            .map(([cpfCnpj, d]) => ({ cpf_cnpj: cpfCnpj, nome: d.nome, total: Math.round(d.total * 100) / 100 }));

          return {
            sq_candidato: c.sq_candidato,
            ano_eleicao: ano,
            nm_candidato: c.nm_candidato,
            nr_cpf_candidato: c.nr_cpf_candidato,
            cd_cargo: c.cd_cargo,
            ds_cargo: c.ds_cargo,
            sg_uf: c.sg_uf,
            sg_partido: c.sg_partido,
            nm_partido: c.nm_partido,
            total_receitas: Math.round(c.total_receitas * 100) / 100,
            total_registros: c.total_registros,
            fefc: Math.round(c.fefc * 100) / 100,
            fundo_partidario: Math.round(c.fundo_partidario * 100) / 100,
            recursos_proprios: Math.round(c.recursos_proprios * 100) / 100,
            outros_recursos: Math.round(c.outros_recursos * 100) / 100,
            posicao: posicaoGeral.get(c.sq_candidato),
            posicao_cargo: posicaoCargo.get(c.sq_candidato),
            por_origem: c.por_origem,
            top_doadores,
            atualizado_em: new Date().toISOString(),
          };
        });

        const { error } = await sb
          .from("tse_candidatos_receitas_agg")
          .upsert(lote, { onConflict: "sq_candidato,ano_eleicao" });
        if (error) throw new Error(`Upsert agg: ${error.message}`);
        upsertados += lote.length;
      }

      const duracao_ms = Date.now() - t0;
      console.log(`  [${ano}] ✓ ${upsertados} candidatos aggregados (${deputados.length} dep., ${senadores.length} sen.) — ${duracao_ms}ms`);
      resultados_por_ano.push({ ano, candidatos: upsertados, deputados: deputados.length, senadores: senadores.length, duracao_ms });
    }

    return { status: "sucesso", resultados_por_ano };

  } catch (err) {
    const erro = err instanceof Error ? err.message : String(err);
    return { status: "erro", resultados_por_ano, erro };
  }
}
