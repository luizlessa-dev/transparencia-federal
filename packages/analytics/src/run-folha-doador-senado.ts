/**
 * run-folha-doador-senado.ts
 * Funcionário-doador no SENADO: comissionado de gabinete que consta como
 * top-doador da campanha do próprio senador. Candidato casado por CPF
 * (parlamentares.cpf → tse cd_cargo=5); doador casado por nome normalizado.
 * Grava em folha_doador_leads com casa='senado' e parlamentar_id_externo=id_senado.
 *
 * Uso: npm run folha-doador-senado:ts -w @transparencia/analytics
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}
const sb = createClient(url, key);
const PAGE = 1000;

const normNome = (s: string | null | undefined): string =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z ]/g, " ").replace(/\s+/g, " ").trim();
const soDigitos = (s: string | null | undefined): string => (s ?? "").replace(/\D/g, "");

async function paginar<T>(tabela: string, colunas: string, filtros: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await filtros(sb.from(tabela).select(colunas).range(from, from + PAGE - 1));
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

const inicio = Date.now();
console.log("▶ Funcionário-doador no Senado (folha × TSE)\n");

// 1. Senadores com CPF + id_senado
const senadores = await paginar<{ cpf: string; id_senado: number; nome_parlamentar: string }>(
  "parlamentares",
  "cpf, id_senado, nome_parlamentar",
  (q) => q.eq("casa_legislativa", "senado").not("cpf", "is", null).not("id_senado", "is", null),
);
console.log(`  Senadores com CPF: ${senadores.length}`);

// 2. TSE cd_cargo=5 (senador) → top_doadores da eleição mais recente por CPF
type TseRow = { nr_cpf_candidato: string; ano_eleicao: number; top_doadores: Array<{ nome: string; total: number; cpf_cnpj: string }> };
const tse = await paginar<TseRow>(
  "tse_candidatos_receitas_agg",
  "nr_cpf_candidato, ano_eleicao, top_doadores",
  (q) => q.eq("cd_cargo", 5).in("ano_eleicao", [2018, 2022]),
);
const tsePorCpf = new Map<string, TseRow>();
for (const r of tse) {
  const c = soDigitos(r.nr_cpf_candidato);
  const ant = tsePorCpf.get(c);
  if (!ant || r.ano_eleicao > ant.ano_eleicao) tsePorCpf.set(c, r);
}
console.log(`  Candidatos TSE (senador): ${tsePorCpf.size}`);

// 3. Folha do Senado agrupada por senador (nome normalizado)
type FolhaRow = { parlamentar_nome: string | null; secretario_nome: string | null; snapshot_date: string };
const folha = await paginar<FolhaRow>(
  "folha_gabinete_atual",
  "parlamentar_nome, secretario_nome, snapshot_date",
  (q) => q.eq("casa", "senado"),
);
const snapshot = folha[0]?.snapshot_date ?? new Date().toISOString().slice(0, 10);
const staffPorSenador = new Map<string, Map<string, string>>(); // nomeNorm → (secNorm → secOrig)
for (const r of folha) {
  const k = normNome(r.parlamentar_nome);
  if (!k || !r.secretario_nome) continue;
  if (!staffPorSenador.has(k)) staffPorSenador.set(k, new Map());
  staffPorSenador.get(k)!.set(normNome(r.secretario_nome), r.secretario_nome);
}

// 4. Cruzamento
const leads = new Map<string, any>();
for (const s of senadores) {
  const cand = tsePorCpf.get(soDigitos(s.cpf));
  if (!cand) continue;
  const staff = staffPorSenador.get(normNome(s.nome_parlamentar));
  if (!staff) continue;
  for (const d of Array.isArray(cand.top_doadores) ? cand.top_doadores : []) {
    if (soDigitos(d.cpf_cnpj).length !== 11) continue; // só PF
    const orig = staff.get(normNome(d.nome));
    if (!orig) continue;
    const chave = `${s.id_senado}|${orig}|${cand.ano_eleicao}`;
    const ant = leads.get(chave);
    if (!ant || (d.total ?? 0) > ant.valor_doado) {
      leads.set(chave, {
        casa: "senado",
        parlamentar_id_externo: String(s.id_senado),
        parlamentar_nome: s.nome_parlamentar,
        secretario_nome: orig,
        doador_nome: d.nome,
        doador_cpf_cnpj: d.cpf_cnpj ?? null,
        valor_doado: d.total ?? null,
        ano_eleicao: cand.ano_eleicao,
        snapshot_date: snapshot,
      });
    }
  }
}
console.log(`  → funcionário-doador (Senado): ${leads.size} leads`);

// 5. Persiste
const rows = [...leads.values()];
for (let i = 0; i < rows.length; i += 500) {
  const { error } = await sb
    .from("folha_doador_leads")
    .upsert(rows.slice(i, i + 500), { onConflict: "casa,parlamentar_id_externo,secretario_nome,ano_eleicao" });
  if (error) throw new Error(`Upsert folha_doador_leads: ${error.message}`);
}

const top = rows.sort((a, b) => (b.valor_doado ?? 0) - (a.valor_doado ?? 0)).slice(0, 10);
if (top.length) {
  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  console.log("\n  Top funcionário-doador (Senado):");
  for (const l of top) console.log(`    ${fmt(l.valor_doado ?? 0).padStart(14)}  ${l.secretario_nome}  →  Sen. ${l.parlamentar_nome} (${l.ano_eleicao})`);
}
console.log(`\n✅ Concluído em ${Date.now() - inicio}ms · ${leads.size} leads`);
