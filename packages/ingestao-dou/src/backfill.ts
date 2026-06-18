/**
 * Backfill histórico do DOU — 01/01/2023 até ontem.
 * Pula fins de semana. Retoma de onde parou (verifica datas já ingeridas no banco).
 *
 * Uso:
 *   tsx src/backfill.ts              → 2023-01-01 até ontem
 *   tsx src/backfill.ts 2024-01-01   → data de início customizada
 *
 * Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, INLABS_EMAIL, INLABS_PASSWORD
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config();
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { login, buscarPorData, type SecaoDOU } from "./dou-client.js";
import { normalizarPublicacao } from "./extratores.js";
import { createSupabaseClient, upsertPublicacoesDOU } from "./db.js";

const SECOES: SecaoDOU[] = ["DO2", "DO3", "DO2E", "DO3E"];
const DELAY_MS = 3_000; // pausa entre dias para não sobrecarregar o Inlabs

function diasUteis(inicio: Date, fim: Date): Date[] {
  const dias: Date[] = [];
  const cur = new Date(inicio);
  cur.setUTCHours(12, 0, 0, 0);
  fim.setUTCHours(12, 0, 0, 0);

  while (cur <= fim) {
    const dow = cur.getUTCDay();
    if (dow !== 0 && dow !== 6) dias.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dias;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function datasJaIngeridas(supabase: ReturnType<typeof createSupabaseClient>): Promise<Set<string>> {
  // dou_publicacoes tem muitas linhas por dia (500-3000). Para pegar datas únicas, paginamos
  // agrupando no lado cliente: buscamos página a página até a última data mudar ou a página estar vazia.
  const datas = new Set<string>();
  const PAGE = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("dou_publicacoes")
      .select("data_publicacao")
      .gte("data_publicacao", "2023-01-01")
      .order("data_publicacao", { ascending: true })
      .range(offset, offset + PAGE - 1);

    if (error) throw new Error(`Buscar datas ingeridas: ${error.message}`);
    const rows = (data ?? []) as { data_publicacao: string }[];
    for (const r of rows) datas.add(r.data_publicacao);
    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  return datas;
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.INLABS_EMAIL;
  const password = process.env.INLABS_PASSWORD;

  if (!url || !key) { console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes"); process.exit(1); }
  if (!email || !password) { console.error("INLABS_EMAIL / INLABS_PASSWORD ausentes"); process.exit(1); }

  const supabase = createSupabaseClient(url, key);

  const argInicio = process.argv[2];
  const inicio = argInicio ? new Date(argInicio + "T12:00:00Z") : new Date("2023-01-01T12:00:00Z");
  const ontem = new Date();
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  ontem.setUTCHours(12, 0, 0, 0);

  const dias = diasUteis(inicio, ontem);
  console.log(`[backfill] ${dias.length} dias úteis de ${fmt(inicio)} até ${fmt(ontem)}`);

  // Verifica quais datas já têm dados — permite retomar
  console.log("[backfill] Verificando datas já ingeridas...");
  const jaIngeridas = await datasJaIngeridas(supabase);
  const pendentes = dias.filter((d) => !jaIngeridas.has(fmt(d)));
  console.log(`[backfill] ${jaIngeridas.size} datas já ingeridas, ${pendentes.length} pendentes`);

  if (pendentes.length === 0) {
    console.log("[backfill] Nada a fazer — backfill completo!");
    return;
  }

  await login(email, password);

  let ok = 0;
  let erros = 0;

  for (let i = 0; i < pendentes.length; i++) {
    const dia = pendentes[i];
    const progresso = `[${i + 1}/${pendentes.length}]`;

    try {
      const atos = await buscarPorData(SECOES, dia);

      if (atos.length === 0) {
        // Dia sem publicação (feriado ou edição extra vazia) — marca como visitado
        // inserindo registro sentinela não é necessário; apenas loga e segue
        console.log(`${progresso} ${fmt(dia)} — sem publicações (feriado?)`);
        ok++;
      } else {
        const publicacoes = atos.map(normalizarPublicacao);
        const { inseridos } = await upsertPublicacoesDOU(supabase, publicacoes);
        console.log(`${progresso} ${fmt(dia)} — ${inseridos} atos inseridos`);
        ok++;
      }
    } catch (err) {
      console.error(`${progresso} ${fmt(dia)} — ERRO: ${err}`);
      erros++;
      // Continua — não aborta o backfill por um dia com erro
    }

    // Pausa entre requisições
    if (i < pendentes.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n[backfill] Concluído: ${ok} dias OK, ${erros} erros`);
}

main().catch((err) => {
  console.error("[backfill] Erro fatal:", err);
  process.exit(1);
});
