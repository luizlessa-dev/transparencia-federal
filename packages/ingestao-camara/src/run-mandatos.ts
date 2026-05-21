/**
 * run-mandatos.ts
 * Busca mandatos anteriores e ocupações dos deputados via API da Câmara.
 * Atualiza total_legislaturas, primeira_legislatura e cargo_anterior
 * em cam_parlamentar_risco.
 */

import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) { console.error("Variáveis obrigatórias ausentes."); process.exit(1); }

const sb = createClient(url, key);
const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const THROTTLE = 120;
const h = { Accept: "application/json" };

async function fetchJSON<T>(urlStr: string): Promise<T | null> {
  try {
    const r = await fetch(urlStr, { headers: h, signal: AbortSignal.timeout(12_000) });
    if (!r.ok) return null;
    const j = await r.json() as { dados?: T };
    return (j.dados ?? null) as T | null;
  } catch {
    return null;
  }
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const inicio = Date.now();
console.log("▶ Ingestão: Mandatos anteriores + ocupações");

// Carrega deputados sem dados de legislatura ainda
const { data: deps, error } = await sb
  .from("cam_parlamentar_risco")
  .select("deputado_id, nome, total_legislaturas")
  .is("total_legislaturas", null);

if (error) throw new Error(error.message);
const lista = (deps ?? []) as { deputado_id: number; nome: string }[];
console.log(`  ${lista.length} deputados sem histórico de mandatos`);

let ok = 0, falhas = 0;

for (let i = 0; i < lista.length; i++) {
  const dep = lista[i];
  await sleep(THROTTLE);

  // Busca mandatos externos (mandatos em outros cargos/câmaras)
  const mandatos = await fetchJSON<Array<{
    cargo: string; siglaUf: string; anoInicio: string; anoFim: string; siglaPartidoEleicao: string;
  }>>(`${CAMARA}/deputados/${dep.deputado_id}/mandatosExternos`);

  // Busca mandatos como deputado federal (via histórico de status)
  const perfil = await fetchJSON<{
    cpf?: string;
    ultimoStatus?: { idLegislatura?: number; situacao?: string };
  }>(`${CAMARA}/deputados/${dep.deputado_id}`);

  // Estima total de legislaturas contando mandatos federais
  // Câmara não expõe lista direta de legislaturas do deputado,
  // mas mandatosExternos lista cargos anteriores que podem incluir deputado
  const mandatosFed = (mandatos ?? []).filter(
    (m) => m.cargo?.toLowerCase().includes("deputad") && m.cargo?.toLowerCase().includes("federal")
  );

  // Primeira legislatura estimada pelo ano mais antigo em mandatos federais
  // Legislatura 57 = 2023-2026, 56=2019-2022, 55=2015-2018, 54=2011-2014...
  function anoParaLeg(ano: number): number {
    if (ano >= 2023) return 57;
    if (ano >= 2019) return 56;
    if (ano >= 2015) return 55;
    if (ano >= 2011) return 54;
    if (ano >= 2007) return 53;
    if (ano >= 2003) return 52;
    if (ano >= 1999) return 51;
    if (ano >= 1995) return 50;
    return 49;
  }

  const anos = mandatosFed
    .map((m) => parseInt(m.anoInicio ?? "0", 10))
    .filter((a) => a > 1990);

  const primeiraLeg = anos.length > 0 ? anoParaLeg(Math.min(...anos)) : 57;
  // 57 - primeiraLeg + 1 = quantas legislaturas federais
  const totalLeg = 57 - primeiraLeg + 1;

  // Ocupação anterior: primeiro cargo não-parlamentar mais relevante
  const ocupacoes = await fetchJSON<Array<{ titulo: string; entidade: string; anoInicio: number; anoFim: number }>>(
    `${CAMARA}/deputados/${dep.deputado_id}/ocupacoes`
  );

  // Pega a ocupação mais recente não-parlamentar
  const ocAntes = (ocupacoes ?? [])
    .filter((o) => {
      const t = o.titulo?.toLowerCase() ?? "";
      return !t.includes("deputad") && !t.includes("senador") && !t.includes("vereador") && !t.includes("prefeito");
    })
    .sort((a, b) => (b.anoFim ?? b.anoInicio ?? 0) - (a.anoFim ?? a.anoInicio ?? 0));

  const cargoAnterior = ocAntes[0]?.titulo ?? null;

  const { error: ue } = await sb
    .from("cam_parlamentar_risco")
    .update({
      total_legislaturas: totalLeg,
      primeira_legislatura: primeiraLeg,
      cargo_anterior: cargoAnterior,
      atualizado_em: new Date().toISOString(),
    })
    .eq("deputado_id", dep.deputado_id);

  if (ue) falhas++;
  else ok++;

  if ((i + 1) % 50 === 0) {
    process.stdout.write(`\r  Processados: ${i + 1}/${lista.length} (ok=${ok})`);
  }
}

process.stdout.write(`\r  Processados: ${lista.length}/${lista.length} (ok=${ok}, falhas=${falhas})\n`);

const duracao = Date.now() - inicio;
console.log(`\n✅ Mandatos enriquecidos em ${duracao}ms`);
console.log(`   OK: ${ok} | Falhas: ${falhas}`);
