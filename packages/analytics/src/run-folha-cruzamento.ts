/**
 * run-folha-cruzamento.ts
 * Gera LEADS de investigação a partir de folha_gabinete (Câmara). Zero ingestão
 * nova — cruza dados já no banco. NÃO são acusações: são candidatos a apuração,
 * com match por nome (sujeito a homônimo). Verificar antes de publicar.
 *
 * Passada 1 — funcionário-doador:
 *   secretário que consta como top-doador da campanha do PRÓPRIO chefe.
 *   Candidato casado por CPF (cam_parlamentar_risco.cpf → tse nr_cpf_candidato);
 *   doador casado por nome normalizado (só doador PF).  → folha_doador_leads
 *
 * Passada 2 — nepotismo cruzado:
 *   secretário com sobrenome RARO (≤3 parlamentares, fora da stoplist) igual ao
 *   de um parlamentar de OUTRO gabinete.  → folha_nepotismo_leads
 *
 * Uso: npm run folha-cruzamento:ts -w @transparencia/analytics
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

const CONECTORES = new Set(["DE", "DA", "DO", "DAS", "DOS", "E"]);
const SOBRENOMES_COMUNS = new Set([
  "SILVA", "SANTOS", "SOUZA", "SOUSA", "OLIVEIRA", "PEREIRA", "LIMA", "CARVALHO",
  "FERREIRA", "RODRIGUES", "ALMEIDA", "COSTA", "GOMES", "MARTINS", "ARAUJO",
  "MELO", "BARBOSA", "RIBEIRO", "ALVES", "MONTEIRO", "MENDES", "NASCIMENTO",
  "MOREIRA", "NUNES", "MARQUES", "MACHADO", "FREITAS", "CARDOSO", "ROCHA",
  "DIAS", "TEIXEIRA", "FERNANDES", "VIEIRA", "CAVALCANTE", "CAVALCANTI",
  "CASTRO", "CAMPOS", "CARNEIRO", "CORREIA", "CRUZ", "PINTO", "MORAES", "RAMOS",
  "GONCALVES", "BATISTA", "REIS", "PIRES", "FONSECA", "ANDRADE", "BORGES",
  "LOPES", "MIRANDA", "FRANCA", "AMARAL", "MAIA", "AZEVEDO", "BRITO",
  "MEDEIROS", "DUARTE", "COELHO", "SAMPAIO", "GUIMARAES", "JUNIOR", "NETO",
  "FILHO", "SOBRINHO",
]);

function normNome(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sobrenomeDe(nomeNorm: string): string | null {
  const toks = nomeNorm.split(" ").filter((t) => t.length > 1 && !CONECTORES.has(t));
  if (toks.length < 2) return null; // precisa de pelo menos nome + sobrenome
  return toks[toks.length - 1];
}

function soDigitos(s: string | null | undefined): string {
  return (s ?? "").replace(/\D/g, "");
}

async function paginar<T>(
  tabela: string,
  colunas: string,
  filtros: (q: any) => any,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    let q = sb.from(tabela).select(colunas).range(from, from + PAGE - 1);
    q = filtros(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

const inicio = Date.now();
console.log("▶ Cruzamento folha de gabinete × TSE / nepotismo (Câmara)\n");

// ─── Carga base ────────────────────────────────────────────────────────────

// CPF do deputado → id_externo
const risco = await paginar<{ deputado_id: number; cpf: string }>(
  "cam_parlamentar_risco",
  "deputado_id, cpf",
  (q) => q.not("cpf", "is", null),
);
const cpfParaIdExterno = new Map<string, string>();
for (const r of risco) cpfParaIdExterno.set(soDigitos(r.cpf), String(r.deputado_id));
console.log(`  Deputados com CPF: ${cpfParaIdExterno.size}`);

// Folha atual (Câmara): gabinete → secretários
type FolhaRow = {
  parlamentar_id_externo: string | null;
  parlamentar_nome: string | null;
  secretario_nome: string | null;
  snapshot_date: string;
};
const folha = await paginar<FolhaRow>(
  "folha_gabinete_atual",
  "parlamentar_id_externo, parlamentar_nome, secretario_nome, snapshot_date",
  (q) => q.eq("casa", "camara"),
);
const snapshot = folha[0]?.snapshot_date ?? new Date().toISOString().slice(0, 10);

// Map gabinete (id_externo) → { nome, secretarios: Map<normNome, origNome> }
const gabinetes = new Map<string, { nome: string | null; secs: Map<string, string> }>();
// Lista de todos parlamentares por sobrenome (para nepotismo)
const sobrenomeParlamentares = new Map<string, Set<string>>(); // sobrenome → ids
const idParaNomeParl = new Map<string, string>();
// Lista de secretários (para nepotismo)
const secretarios: Array<{ nome: string; gabId: string | null; gabNome: string | null }> = [];

for (const r of folha) {
  const gabId = r.parlamentar_id_externo;
  const sec = r.secretario_nome ?? "";
  if (gabId) {
    if (!gabinetes.has(gabId)) gabinetes.set(gabId, { nome: r.parlamentar_nome, secs: new Map() });
    gabinetes.get(gabId)!.secs.set(normNome(sec), sec);
    if (r.parlamentar_nome) {
      idParaNomeParl.set(gabId, r.parlamentar_nome);
      const sob = sobrenomeDe(normNome(r.parlamentar_nome));
      if (sob && !SOBRENOMES_COMUNS.has(sob) && sob.length >= 4) {
        if (!sobrenomeParlamentares.has(sob)) sobrenomeParlamentares.set(sob, new Set());
        sobrenomeParlamentares.get(sob)!.add(gabId);
      }
    }
  }
  secretarios.push({ nome: sec, gabId, gabNome: r.parlamentar_nome });
}
console.log(`  Gabinetes (Câmara): ${gabinetes.size} · secretários: ${secretarios.length}`);

// ─── Passada 1: funcionário-doador ──────────────────────────────────────────

type TseRow = {
  nr_cpf_candidato: string;
  ano_eleicao: number;
  top_doadores: Array<{ nome: string; total: number; cpf_cnpj: string }>;
};
const tse = await paginar<TseRow>(
  "tse_candidatos_receitas_agg",
  "nr_cpf_candidato, ano_eleicao, top_doadores",
  (q) => q.eq("cd_cargo", 6).in("ano_eleicao", [2018, 2022]),
);
console.log(`  Candidatos TSE (dep. federal, 2018/2022): ${tse.length}`);

const doadorLeads = new Map<string, any>(); // chave única → lead (mantém maior valor)
for (const cand of tse) {
  const gabId = cpfParaIdExterno.get(soDigitos(cand.nr_cpf_candidato));
  if (!gabId) continue;
  const gab = gabinetes.get(gabId);
  if (!gab) continue;

  for (const d of Array.isArray(cand.top_doadores) ? cand.top_doadores : []) {
    const dig = soDigitos(d.cpf_cnpj);
    if (dig.length === 14) continue; // CNPJ (empresa) — não é staff
    const nn = normNome(d.nome);
    const orig = gab.secs.get(nn);
    if (!orig) continue; // nome do doador não bate com nenhum secretário deste gabinete

    const chave = `${gabId}|${orig}|${cand.ano_eleicao}`;
    const ant = doadorLeads.get(chave);
    if (!ant || (d.total ?? 0) > ant.valor_doado) {
      doadorLeads.set(chave, {
        casa: "camara",
        parlamentar_id_externo: gabId,
        parlamentar_nome: gab.nome,
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
console.log(`  → funcionário-doador: ${doadorLeads.size} leads`);

// ─── Passada 2: nepotismo cruzado ────────────────────────────────────────────

const nepotismoLeads = new Map<string, any>();
for (const s of secretarios) {
  const sob = sobrenomeDe(normNome(s.nome));
  if (!sob || SOBRENOMES_COMUNS.has(sob) || sob.length < 4) continue;
  const parls = sobrenomeParlamentares.get(sob);
  if (!parls || parls.size > 3) continue; // sobrenome raro: ≤3 parlamentares

  for (const parlId of parls) {
    if (parlId === s.gabId) continue; // mesmo gabinete não é "cruzado"
    const chave = `${s.nome}|${s.gabId ?? ""}|${parlId}`;
    if (nepotismoLeads.has(chave)) continue;
    nepotismoLeads.set(chave, {
      casa: "camara",
      secretario_nome: s.nome,
      gabinete_parlamentar_nome: s.gabNome,
      gabinete_parlamentar_id: s.gabId,
      sobrenome: sob,
      parlamentar_homonimo_nome: idParaNomeParl.get(parlId) ?? null,
      parlamentar_homonimo_id: parlId,
      snapshot_date: snapshot,
    });
  }
}
console.log(`  → nepotismo cruzado: ${nepotismoLeads.size} leads`);

// ─── Persistência ────────────────────────────────────────────────────────────

async function upsertTodos(tabela: string, rows: any[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const lote = rows.slice(i, i + 500);
    const { error } = await sb.from(tabela).upsert(lote, { onConflict, ignoreDuplicates: false });
    if (error) throw new Error(`Upsert ${tabela}: ${error.message}`);
  }
}

await upsertTodos(
  "folha_doador_leads",
  [...doadorLeads.values()],
  "casa,parlamentar_id_externo,secretario_nome,ano_eleicao",
);
await upsertTodos(
  "folha_nepotismo_leads",
  [...nepotismoLeads.values()],
  "casa,secretario_nome,gabinete_parlamentar_id,parlamentar_homonimo_id",
);

// ─── Amostra dos melhores leads ──────────────────────────────────────────────

const topDoador = [...doadorLeads.values()].sort((a, b) => (b.valor_doado ?? 0) - (a.valor_doado ?? 0)).slice(0, 10);
if (topDoador.length) {
  console.log("\n  Top funcionário-doador (maior doação ao próprio chefe):");
  for (const l of topDoador) {
    const v = (l.valor_doado ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    console.log(`    ${v.padStart(16)}  ${l.secretario_nome}  →  ${l.parlamentar_nome} (${l.ano_eleicao})`);
  }
}

console.log(`\n✅ Concluído em ${Date.now() - inicio}ms · doador=${doadorLeads.size} nepotismo=${nepotismoLeads.size}`);
