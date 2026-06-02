/**
 * enrich-brasilapi.ts
 * Enriquece as fundações JÁ DESCOBERTAS (via run-repasses-local) com dados
 * cadastrais da Receita Federal através da BrasilAPI: endereço, QSA, capital
 * social, situação. Calcula flags de mesmo_endereco_partido / mesmo_telefone.
 *
 * Pré-requisito: rodar `fundacoes:repasses` antes (popula CNPJs reais da fonte TSE).
 * Os CNPJs NUNCA são hardcoded — sempre lidos da tabela.
 *
 * npm run enrich:ts -w @transparencia/ingestao-tse-fundacoes
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";
import { execSync } from "child_process";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const INTERVALO_MS = 8000; // BrasilAPI /cnpj tem rate limit agressivo

// ─────────────────────────────────────────────────────────
// BrasilAPI via curl (fetch do Node leva 403 em alguns ambientes)
// ─────────────────────────────────────────────────────────
function fetchBrasilAPI(cnpj: string, tentativa = 1): Record<string, unknown> | null {
  const clean = cnpj.replace(/\D/g, "");
  try {
    const out = execSync(
      `curl -sf -A "Mozilla/5.0 (compatible; thebrinsider-ingestao/1.0)" ` +
      `"https://brasilapi.com.br/api/cnpj/v1/${clean}"`,
      { timeout: 20000 }
    ).toString();
    return JSON.parse(out) as Record<string, unknown>;
  } catch {
    if (tentativa <= 4) {
      const wait = tentativa * 8; // 8s, 16s, 24s, 32s
      console.log(`    retry ${tentativa} (${wait}s)...`);
      try { execSync(`sleep ${wait}`); } catch { /* noop */ }
      return fetchBrasilAPI(cnpj, tentativa + 1);
    }
    return null;
  }
}

function extractQSA(dados: Record<string, unknown> | null): { nome: string | null; desde: string | null } {
  const qsa = dados?.qsa;
  if (!Array.isArray(qsa) || qsa.length === 0) return { nome: null, desde: null };
  const pres = (qsa as Array<Record<string, unknown>>).find(
    s => typeof s.qualificacao_socio === "string" && s.qualificacao_socio.toLowerCase().includes("presidente")
  ) ?? (qsa[0] as Record<string, unknown>);
  return {
    nome:  (pres.nome_socio as string | null) ?? null,
    desde: (pres.data_entrada_sociedade as string | null) ?? null,
  };
}

const norm = (v: unknown) => ((v ?? "") as string).trim().toUpperCase();

async function main() {
  // CNPJs reais já descobertos da fonte TSE
  const { data: fundacoes, error } = await sb
    .from("fundacoes_partidarias")
    .select("cnpj, partido_cnpj, nome_popular, partido_sigla");
  if (error || !fundacoes?.length) {
    console.error("⚠️  Nenhuma fundação na tabela. Rode `fundacoes:repasses` antes.");
    process.exit(1);
  }

  console.log(`\n🔎 Enriquecendo ${fundacoes.length} fundações via BrasilAPI`);
  console.log(`   (intervalo ${INTERVALO_MS / 1000}s entre chamadas — rate limit)\n`);

  // Cache de dados de partidos (para comparar endereço/telefone)
  const cacheParticular = new Map<string, Record<string, unknown> | null>();
  function dadosPartido(cnpjPartido: string | null): Record<string, unknown> | null {
    if (!cnpjPartido) return null;
    const k = cnpjPartido.replace(/\D/g, "");
    if (cacheParticular.has(k)) return cacheParticular.get(k)!;
    const d = fetchBrasilAPI(k);
    cacheParticular.set(k, d);
    return d;
  }

  let ok = 0, semDados = 0, flagsEndereco = 0;

  for (const f of fundacoes) {
    const cnpj = f.cnpj as string;
    process.stdout.write(`  ${(f.partido_sigla as string ?? "").padEnd(13)} ${(f.nome_popular as string ?? "").slice(0, 36).padEnd(36)} `);

    const dados = fetchBrasilAPI(cnpj);
    if (!dados) { console.log("⚠️  sem dados"); semDados++; await wait(INTERVALO_MS); continue; }

    const { nome: presidenteNome, desde: presidenteDesde } = extractQSA(dados);

    const dp = dadosPartido(f.partido_cnpj as string | null);
    const mesmoEndereco = norm(dados.logradouro).length > 0 &&
      norm(dados.logradouro) === norm(dp?.logradouro) &&
      norm(dados.numero) === norm(dp?.numero);
    const telF = norm(dados.ddd_telefone_1).replace(/\D/g, "");
    const telP = norm(dp?.ddd_telefone_1).replace(/\D/g, "");
    const mesmoTelefone = telF.length > 6 && telF === telP;
    if (mesmoEndereco) flagsEndereco++;

    const { error: upErr } = await sb.from("fundacoes_partidarias").update({
      logradouro:             (dados.logradouro as string | null) ?? null,
      numero:                 (dados.numero as string | null) ?? null,
      complemento:            (dados.complemento as string | null) ?? null,
      bairro:                 (dados.bairro as string | null) ?? null,
      municipio:              (dados.municipio as string | null) ?? null,
      uf:                     (dados.uf as string | null) ?? null,
      cep:                    (dados.cep as string | null) ?? null,
      telefone:               (dados.ddd_telefone_1 as string | null) ?? null,
      data_abertura:          (dados.data_inicio_atividade as string | null) ?? null,
      capital_social:         (dados.capital_social as number | null) ?? 0,
      natureza_juridica:      (dados.natureza_juridica as string | null) ?? null,
      situacao_cadastral:     (dados.situacao_cadastral as number | null) ?? null,
      presidente_nome:        presidenteNome,
      presidente_desde:       presidenteDesde,
      mesmo_endereco_partido: mesmoEndereco,
      mesmo_telefone_partido: mesmoTelefone,
      dados_brasilapi:        dados,
      atualizado_em:          new Date().toISOString(),
    }).eq("cnpj", cnpj);

    if (upErr) { console.log(`❌ ${upErr.message}`); }
    else {
      const flags = [
        mesmoEndereco ? "📍endereço==partido" : "",
        mesmoTelefone ? "📞tel==partido" : "",
        presidenteNome ? `👤${(presidenteNome).split(" ")[0]}` : "",
      ].filter(Boolean).join(" ");
      console.log(`✅ ${flags || "ok"}`);
      ok++;
    }
    await wait(INTERVALO_MS);
  }

  console.log(`\nConcluído: ${ok} enriquecidas · ${semDados} sem dados · ${flagsEndereco} 🚨 mesmo endereço do partido.`);
}

function wait(ms: number) { return new Promise(r => setTimeout(r, ms)); }

main().catch(console.error);
