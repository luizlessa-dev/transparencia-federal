/**
 * seed-fundacoes.ts
 * Seed das 26 fundações e institutos partidários via BrasilAPI (CNPJ/QSA).
 * Roda uma vez (ou re-roda para atualizar QSA e endereços).
 *
 * npm run seed:ts -w @transparencia/ingestao-tse-fundacoes
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

// ─────────────────────────────────────────────────────────
// Lista mestra — 26 fundações e institutos (Wikipédia TSE)
// CNPJs confirmados via BrasilAPI/Receita Federal
// ─────────────────────────────────────────────────────────
const FUNDACOES_MASTER: Array<{
  partido_sigla: string;
  partido_cnpj: string;
  nome_popular: string;
  cnpj: string;
}> = [
  { partido_sigla: "PT",         partido_cnpj: "01801543000150", nome_popular: "Fundação Perseu Abramo",                             cnpj: "02670628000132" },
  { partido_sigla: "PL",         partido_cnpj: "08517423000195", nome_popular: "Instituto Álvaro Valle",                             cnpj: "02593544000130" },
  { partido_sigla: "UNIÃO",      partido_cnpj: "44551496000167", nome_popular: "Fundação Índigo",                                    cnpj: "13920138000150" },
  { partido_sigla: "MDB",        partido_cnpj: "00916895000164", nome_popular: "Fundação Ulysses Guimarães",                         cnpj: "00616447000100" },
  { partido_sigla: "PSD",        partido_cnpj: "13227020000130", nome_popular: "Espaço Democrático",                                 cnpj: "14699698000102" },
  { partido_sigla: "PP",         partido_cnpj: "02389220000164", nome_popular: "Fundação Milton Campos",                             cnpj: "00486698000100" },
  { partido_sigla: "REPUBLICANOS",partido_cnpj:"01399544000154", nome_popular: "Fundação Republicana Brasileira",                    cnpj: "04908878000180" },
  { partido_sigla: "PDT",        partido_cnpj: "42758863000100", nome_popular: "Fundação Leonel Brizola-Alberto Pasqualini",         cnpj: "34998481000107" },
  { partido_sigla: "PSDB",       partido_cnpj: "00382578000130", nome_popular: "Instituto Teotônio Vilela",                          cnpj: "03151371000108" },
  { partido_sigla: "PSB",        partido_cnpj: "42669522000100", nome_popular: "Fundação João Mangabeira",                           cnpj: "03144367000100" },
  { partido_sigla: "PODE",       partido_cnpj: "05546078000127", nome_popular: "Fundação Podemos",                                   cnpj: "28700731000138" },
  { partido_sigla: "PSOL",       partido_cnpj: "07014318000131", nome_popular: "Fundação Lauro Campos e Marielle Franco",            cnpj: "10855397000181" },
  { partido_sigla: "PC do B",    partido_cnpj: "43138198000136", nome_popular: "Fundação Maurício Grabois",                          cnpj: "04187296000150" },
  { partido_sigla: "CIDADANIA",  partido_cnpj: "00391606000137", nome_popular: "Fundação Astrojildo Pereira",                        cnpj: "04126065000101" },
  { partido_sigla: "REDE",       partido_cnpj: "17576142000110", nome_popular: "Fundação Rede Brasil Sustentável",                   cnpj: "19543866000151" },
  { partido_sigla: "PV",         partido_cnpj: "43638881000100", nome_popular: "Fundação Verde Herbert Daniel",                      cnpj: "03149406000100" },
  { partido_sigla: "SOLIDARIEDADE",partido_cnpj:"09273443000140",nome_popular: "Fundação 1º de Maio",                                cnpj: "09563929000161" },
  { partido_sigla: "NOVO",       partido_cnpj: "17980039000100", nome_popular: "Instituto Libertas",                                 cnpj: "22298345000100" },
  { partido_sigla: "AVANTE",     partido_cnpj: "08144169000180", nome_popular: "Fundação Avante",                                    cnpj: "30525766000100" },
  { partido_sigla: "PRD",        partido_cnpj: "19887640000117", nome_popular: "Fundação Florescer",                                 cnpj: "30934454000140" },
  { partido_sigla: "PCB",        partido_cnpj: "43795791000108", nome_popular: "Fundação Dinarco Reis",                              cnpj: "03151371000108" },
  { partido_sigla: "PCO",        partido_cnpj: "65512925000144", nome_popular: "Fundação João Jorge Costa Pimenta",                  cnpj: "04155946000109" },
  { partido_sigla: "PSTU",       partido_cnpj: "00376518000101", nome_popular: "Instituto José Luiz e Rosa Sundermann",              cnpj: "03600620000108" },
  { partido_sigla: "MOBILIZA",   partido_cnpj: "37993168000145", nome_popular: "Fundação Juscelino Kubitschek",                      cnpj: "03568980000130" },
  { partido_sigla: "AGIR",       partido_cnpj: "02033298000141", nome_popular: "Instituto de Estudos Políticos São Paulo",           cnpj: "36193819000101" },
  { partido_sigla: "PRTB",       partido_cnpj: "00403275000165", nome_popular: "Instituto Jânio Quadros",                            cnpj: "03150822000101" },
];

// ─────────────────────────────────────────────────────────
// BrasilAPI lookup com retry
// ─────────────────────────────────────────────────────────
function fetchBrasilAPI(cnpj: string, tentativa = 1): Record<string, unknown> | null {
  const clean = cnpj.replace(/\D/g, "");
  try {
    const out = execSync(
      `curl -sf -A "Mozilla/5.0 (compatible; thebrinsider-ingestao/1.0)" ` +
      `"https://brasilapi.com.br/api/cnpj/v1/${clean}"`,
      { timeout: 15000 }
    ).toString();
    return JSON.parse(out) as Record<string, unknown>;
  } catch (e: unknown) {
    if (tentativa <= 3) {
      const wait = tentativa * 3000;
      console.log(`\n  Retry ${tentativa} CNPJ ${cnpj} — aguardando ${wait}ms...`);
      execSync(`sleep ${wait / 1000}`);
      return fetchBrasilAPI(cnpj, tentativa + 1);
    }
    const msg = e instanceof Error ? e.message.slice(0, 80) : String(e);
    console.warn(`  BrasilAPI ${cnpj}: erro — ${msg}`);
    return null;
  }
}

function extractQSA(dados: Record<string, unknown> | null): { nome: string | null; desde: string | null } {
  if (!dados?.qsa || !Array.isArray(dados.qsa) || dados.qsa.length === 0) {
    return { nome: null, desde: null };
  }
  const presidente = (dados.qsa as Array<Record<string, unknown>>).find(
    s => typeof s.qualificacao_socio === "string" && s.qualificacao_socio.toLowerCase().includes("presidente")
  ) ?? dados.qsa[0] as Record<string, unknown>;
  return {
    nome:  (presidente.nome_socio as string | null) ?? null,
    desde: (presidente.data_entrada_sociedade as string | null) ?? null,
  };
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────
async function main() {
  console.log(`Seeding ${FUNDACOES_MASTER.length} fundações partidárias...\n`);

  // Buscar CNPJs dos partidos para comparar endereço
  const cnpjsPartidos = [...new Set(FUNDACOES_MASTER.map(f => f.partido_cnpj))];
  const dadosPartidos: Map<string, Record<string, unknown>> = new Map();

  console.log("Carregando dados dos partidos via BrasilAPI...");
  for (const cnpj of cnpjsPartidos) {
    const d = fetchBrasilAPI(cnpj);
    if (d) dadosPartidos.set(cnpj.replace(/\D/g, ""), d);
    await new Promise(r => setTimeout(r, 500));
  }

  let ok = 0, erros = 0;

  for (const f of FUNDACOES_MASTER) {
    process.stdout.write(`  ${f.partido_sigla} / ${f.nome_popular} (${f.cnpj})... `);

    const dados = fetchBrasilAPI(f.cnpj);
    await new Promise(r => setTimeout(r, 500));

    if (!dados) {
      console.log("⚠️  sem dados BrasilAPI");
      erros++;
      // Upsert mínimo sem enriquecimento
      await sb.from("fundacoes_partidarias").upsert({
        cnpj:           f.cnpj.replace(/\D/g, ""),
        razao_social:   f.nome_popular,
        nome_popular:   f.nome_popular,
        partido_sigla:  f.partido_sigla,
        partido_cnpj:   f.partido_cnpj.replace(/\D/g, ""),
      }, { onConflict: "cnpj" });
      continue;
    }

    const { nome: presidenteNome, desde: presidenteDesde } = extractQSA(dados);

    // Comparar endereço com o partido
    const dadoPartido = dadosPartidos.get(f.partido_cnpj.replace(/\D/g, ""));
    const logFundacao = ((dados.logradouro ?? "") as string).trim().toUpperCase();
    const numFundacao = ((dados.numero     ?? "") as string).trim().toUpperCase();
    const logPartido  = ((dadoPartido?.logradouro ?? "") as string).trim().toUpperCase();
    const numPartido  = ((dadoPartido?.numero     ?? "") as string).trim().toUpperCase();
    const telFundacao = ((dados.ddd_telefone_1 ?? "") as string).replace(/\D/g, "");
    const telPartido  = ((dadoPartido?.ddd_telefone_1 ?? "") as string).replace(/\D/g, "");

    const mesmoEndereco = logFundacao.length > 0 && logFundacao === logPartido && numFundacao === numPartido;
    const mesmoTelefone = telFundacao.length > 6 && telFundacao === telPartido;

    if (mesmoEndereco) console.log("  🚨 MESMO ENDEREÇO DO PARTIDO");

    const row = {
      cnpj:                  (dados.cnpj as string).replace(/\D/g, ""),
      razao_social:          (dados.razao_social as string) ?? f.nome_popular,
      nome_popular:          f.nome_popular,
      partido_sigla:         f.partido_sigla,
      partido_cnpj:          f.partido_cnpj.replace(/\D/g, ""),
      logradouro:            (dados.logradouro as string | null) ?? null,
      numero:                (dados.numero     as string | null) ?? null,
      complemento:           (dados.complemento as string | null) ?? null,
      bairro:                (dados.bairro     as string | null) ?? null,
      municipio:             (dados.municipio  as string | null) ?? null,
      uf:                    (dados.uf         as string | null) ?? null,
      cep:                   (dados.cep        as string | null) ?? null,
      telefone:              (dados.ddd_telefone_1 as string | null) ?? null,
      data_abertura:         (dados.data_inicio_atividade as string | null) ?? null,
      capital_social:        (dados.capital_social as number | null) ?? 0,
      natureza_juridica:     (dados.natureza_juridica as string | null) ?? null,
      situacao_cadastral:    (dados.situacao_cadastral as number | null) ?? null,
      presidente_nome:       presidenteNome,
      presidente_desde:      presidenteDesde,
      mesmo_endereco_partido: mesmoEndereco,
      mesmo_telefone_partido: mesmoTelefone,
      dados_brasilapi:        dados,
      atualizado_em:          new Date().toISOString(),
    };

    const { error } = await sb.from("fundacoes_partidarias").upsert(row, { onConflict: "cnpj" });

    if (error) {
      console.log(`❌ erro: ${error.message}`);
      erros++;
    } else {
      const flags = [
        mesmoEndereco ? "📍mesmo endereço" : "",
        mesmoTelefone ? "📞mesmo tel" : "",
        presidenteNome ? `👤${presidenteNome.split(" ")[0]}` : "",
      ].filter(Boolean).join(" ");
      console.log(`✅ ${flags || "ok"}`);
      ok++;
    }
  }

  console.log(`\nConcluído: ${ok} ok · ${erros} com erro.`);
}

main().catch(console.error);
