/**
 * CLI: load histórico de verba indenizatória ALMG.
 *
 * Itera de (mes_inicio/ano_inicio) até (mes_fim/ano_fim) inclusive, mês a mês.
 *
 * LIMITAÇÃO DESCOBERTA EM 2026-05-22:
 *   O endpoint HTML da ALMG só aceita períodos presentes no dropdown do formulário,
 *   que é uma janela rolante de ~15 meses (atualmente fev/2025–abr/2026). Períodos
 *   anteriores a fev/2025 retornam o mês mais antigo disponível como fallback e
 *   ignoram o parâmetro `periodo` do POST.
 *   → Padrão ajustado para 2025-02 (primeiro mês disponível comprovado).
 *
 * Volume estimado: 77 deputados × 15 meses × 1.1s = ~85s/mês × 15 ≈ 21 min.
 *
 * Uso:
 *   npm run verba:historico:ts -w @transparencia/ingestao-almg                        # padrão 2025-02 → mês anterior
 *   npm run verba:historico:ts -w @transparencia/ingestao-almg -- 2025-06 2025-12     # range explícito
 *
 * Idempotente — pode reexecutar com segurança.
 */
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../../../.env") });

import { jobIngestaoVerba } from "./job-verba.js";

const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!url || !key) {
  console.error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

function parseYM(s: string | undefined, fallback: { mes: number; ano: number }) {
  if (!s) return fallback;
  const m = s.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`formato inválido (esperado YYYY-MM): ${s}`);
  return { ano: Number(m[1]), mes: Number(m[2]) };
}

const now = new Date();
// Fim padrão = mês anterior (o mês atual pode ainda não estar publicado)
const mesAnterior = now.getMonth() === 0
  ? { mes: 12, ano: now.getFullYear() - 1 }
  : { mes: now.getMonth(), ano: now.getFullYear() };
const fim = parseYM(process.argv[3], mesAnterior);
// Início padrão = fev/2025 (primeiro mês comprovadamente disponível no endpoint)
const inicio = parseYM(process.argv[2], { mes: 2, ano: 2025 });

function ymKey(y: number, m: number) {
  return y * 12 + (m - 1);
}
if (ymKey(inicio.ano, inicio.mes) > ymKey(fim.ano, fim.mes)) {
  console.error(`Período inválido: início ${inicio.ano}-${String(inicio.mes).padStart(2, "0")} > fim ${fim.ano}-${String(fim.mes).padStart(2, "0")}`);
  process.exit(1);
}

const periodos: Array<{ mes: number; ano: number }> = [];
for (let k = ymKey(inicio.ano, inicio.mes); k <= ymKey(fim.ano, fim.mes); k++) {
  periodos.push({ ano: Math.floor(k / 12), mes: (k % 12) + 1 });
}

console.log(`▶ Histórico ALMG verba: ${periodos.length} períodos (${inicio.ano}-${String(inicio.mes).padStart(2, "0")} → ${fim.ano}-${String(fim.mes).padStart(2, "0")})`);

const tGlobal = Date.now();
let totalGastosGlobal = 0;
let totalInseridosGlobal = 0;
const periodosFalhos: string[] = [];

for (let i = 0; i < periodos.length; i++) {
  const { mes, ano } = periodos[i];
  const label = `${ano}-${String(mes).padStart(2, "0")}`;
  console.log(`\n──── [${i + 1}/${periodos.length}] período ${label} ────`);
  const t0 = Date.now();
  const r = await jobIngestaoVerba({
    supabaseUrl: url,
    supabaseServiceRoleKey: key,
    mes,
    ano,
    onProgress: ({ idx, total, deputadoId, gastos }) => {
      if (idx % 20 === 0 || idx === total) {
        console.log(`  [${idx}/${total}] dep=${deputadoId}  +${gastos}`);
      }
    },
  });
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ${label}: status=${r.status}  gastos=${r.totalGastos}  inseridos=${r.inseridos}  falhas=${r.falhas.length}  tempo=${elapsed}s`);
  totalGastosGlobal += r.totalGastos;
  totalInseridosGlobal += r.inseridos;
  if (r.status === "erro") periodosFalhos.push(label);
}

const totalElapsed = ((Date.now() - tGlobal) / 60_000).toFixed(1);
console.log(`\n══════ histórico concluído ══════`);
console.log(`  Períodos:    ${periodos.length}`);
console.log(`  Gastos:      ${totalGastosGlobal}`);
console.log(`  Inseridos:   ${totalInseridosGlobal}`);
console.log(`  Falhos:      ${periodosFalhos.length}${periodosFalhos.length ? ` (${periodosFalhos.join(", ")})` : ""}`);
console.log(`  Tempo total: ${totalElapsed} min`);

if (periodosFalhos.length === periodos.length) process.exit(1);
