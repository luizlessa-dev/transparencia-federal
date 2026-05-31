/**
 * run-folha-custo.ts
 * Agrega folha_gabinete (com valor_remuneracao) em custo de pessoal por
 * parlamentar → folha_custo_gabinete. Senado = salário exato; Câmara =
 * estimado por nível. Zero ingestão nova.
 *
 * Uso: npm run folha-custo:ts -w @transparencia/analytics
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
const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Row = {
  casa: string;
  parlamentar_nome: string | null;
  parlamentar_id_externo: string | null;
  valor_remuneracao: number | null;
  gabinete_raw: string | null;
  snapshot_date: string;
};

async function carregar(casa: string): Promise<Row[]> {
  const out: Row[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await sb
      .from("folha_gabinete_atual")
      .select("casa, parlamentar_nome, parlamentar_id_externo, valor_remuneracao, gabinete_raw, snapshot_date")
      .eq("casa", casa)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`folha_gabinete_atual: ${error.message}`);
    const rows = (data ?? []) as Row[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

interface Agg {
  casa: string;
  parlamentar_nome: string;
  parlamentar_id_externo: string | null;
  salario_tipo: string;
  n_funcionarios: number;
  n_com_salario: number;
  soma_salarios: number;
  maior_salario: number;
  lotacoes: Set<string>;
  snapshot_date: string;
}

function agregar(rows: Row[], salarioTipo: string): Map<string, Agg> {
  const m = new Map<string, Agg>();
  for (const r of rows) {
    const nome = r.parlamentar_nome;
    if (!nome) continue;
    const chave = nome;
    if (!m.has(chave)) {
      m.set(chave, {
        casa: r.casa,
        parlamentar_nome: nome,
        parlamentar_id_externo: r.parlamentar_id_externo,
        salario_tipo: salarioTipo,
        n_funcionarios: 0,
        n_com_salario: 0,
        soma_salarios: 0,
        maior_salario: 0,
        lotacoes: new Set(),
        snapshot_date: r.snapshot_date,
      });
    }
    const a = m.get(chave)!;
    a.n_funcionarios++;
    if (r.gabinete_raw) a.lotacoes.add(r.gabinete_raw);
    const v = r.valor_remuneracao == null ? null : Number(r.valor_remuneracao);
    if (v != null) {
      a.n_com_salario++;
      a.soma_salarios += v;
      if (v > a.maior_salario) a.maior_salario = v;
    }
  }
  return m;
}

async function persistir(aggs: Agg[]) {
  const linhas = aggs.map((a) => ({
    casa: a.casa,
    parlamentar_nome: a.parlamentar_nome,
    parlamentar_id_externo: a.parlamentar_id_externo,
    salario_tipo: a.salario_tipo,
    n_funcionarios: a.n_funcionarios,
    n_com_salario: a.n_com_salario,
    soma_salarios: Math.round(a.soma_salarios * 100) / 100,
    media_salario: a.n_com_salario > 0 ? Math.round((a.soma_salarios / a.n_com_salario) * 100) / 100 : null,
    maior_salario: a.maior_salario || null,
    n_lotacoes: a.lotacoes.size,
    snapshot_date: a.snapshot_date,
  }));
  for (let i = 0; i < linhas.length; i += 500) {
    const { error } = await sb
      .from("folha_custo_gabinete")
      .upsert(linhas.slice(i, i + 500), { onConflict: "casa,parlamentar_nome,snapshot_date" });
    if (error) throw new Error(`Upsert folha_custo_gabinete: ${error.message}`);
  }
}

const inicio = Date.now();
console.log("▶ Custo de pessoal por gabinete (folha_gabinete → folha_custo_gabinete)\n");

const senado = [...agregar(await carregar("senado"), "exato").values()];
const camara = [...agregar(await carregar("camara"), "estimado").values()];
await persistir([...senado, ...camara]);
console.log(`  Persistido: senado=${senado.length} camara=${camara.length} gabinetes`);

const topSenado = senado.sort((a, b) => b.soma_salarios - a.soma_salarios).slice(0, 12);
console.log("\n  Gabinetes mais caros do SENADO (folha exata/mês, gabinete + escritórios):");
for (const a of topSenado) {
  console.log(
    `    ${fmt(a.soma_salarios).padStart(14)}  ${a.parlamentar_nome.padEnd(28)} ${a.n_com_salario} func · ${a.lotacoes.size} lotações`,
  );
}

console.log("\n  Maiores salários individuais do SENADO:");
const todos = await carregar("senado");
const topInd = todos
  .filter((r) => r.valor_remuneracao != null)
  .sort((a, b) => Number(b.valor_remuneracao) - Number(a.valor_remuneracao))
  .slice(0, 8);
for (const r of topInd) {
  console.log(`    ${fmt(Number(r.valor_remuneracao)).padStart(13)}  Sen. ${r.parlamentar_nome}`);
}

console.log(`\n✅ Concluído em ${Date.now() - inicio}ms`);
