/**
 * LRF — despesa com pessoal do Executivo de MG x limite legal.
 * Card de contexto macro-fiscal: o quão perto o Estado está do teto da Lei de
 * Responsabilidade Fiscal (49% da RCL p/ o Executivo).
 * Rota: /mg/lrf
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Despesa com pessoal x limite da LRF — Governo de MG | The BR Insider",
  description:
    "Quanto o Poder Executivo de Minas Gerais gasta com pessoal frente ao limite da Lei de Responsabilidade Fiscal (49% da RCL). Limite prudencial, de alerta e máximo, e a despesa de pessoal mês a mês.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/lrf" },
};

type Lim = {
  periodo: string; ano_ref: number | null;
  rcl_ajustada: string | null; dtp: string | null;
  limite_maximo: string | null; limite_prudencial: string | null; limite_alerta: string | null;
  pct_dtp: string | null; pct_maximo: string | null; pct_prudencial: string | null;
};
type Pes = { mes_ano: string; ano: number | null; mes: number | null; despesa_liquida: string | null };

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
const fmtPct = (v: number) => (isFinite(v) ? `${v.toFixed(2).replace(".", ",")}%` : "—");

const MESES_IDX: Record<string, number> = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
/** mês final da janela "jan_2025_a_dez_2025" → 12. */
function mesFim(periodo: string): number {
  const partes = periodo.toLowerCase().split(/_a_/);
  const alvo = partes[partes.length - 1] ?? "";
  const m = alvo.match(/[a-z]{3}/);
  return m ? MESES_IDX[m[0]] ?? 0 : 0;
}

export default async function MgLrfPage() {
  const sb = getSupabase();
  const [limRes, pesRes] = await Promise.all([
    sb.from("mg_lrf_limites").select("periodo,ano_ref,rcl_ajustada,dtp,limite_maximo,limite_prudencial,limite_alerta,pct_dtp,pct_maximo,pct_prudencial"),
    sb.from("mg_lrf_pessoal").select("mes_ano,ano,mes,despesa_liquida").order("ano", { ascending: false }).order("mes", { ascending: false }).limit(12),
  ]);

  if (limRes.error || pesRes.error) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {(limRes.error ?? pesRes.error)?.message}</p></div>);
  }
  const limites = ((limRes.data ?? []) as Lim[]).slice().sort((a, b) =>
    (b.ano_ref ?? 0) - (a.ano_ref ?? 0) || mesFim(b.periodo) - mesFim(a.periodo));
  const atual = limites[0];
  const pessoal = (pesRes.data ?? []) as Pes[];

  const pctDtp = num(atual?.pct_dtp);
  const pctMax = num(atual?.pct_maximo);
  const pctPrud = num(atual?.pct_prudencial);
  const pctAlerta = atual ? num(atual.limite_alerta) / num(atual.rcl_ajustada) * 100 : 0;

  const status =
    pctDtp >= pctMax ? { txt: "Acima do limite máximo", tom: "danger" } :
    pctDtp >= pctPrud ? { txt: "Acima do limite prudencial", tom: "danger" } :
    pctDtp >= pctAlerta ? { txt: "Em zona de alerta", tom: "warn" } :
    { txt: "Dentro dos limites", tom: "ok" };
  const tomCor = (t: string) => t === "danger" ? "hsl(var(--badge-danger-fg))" : t === "warn" ? "hsl(var(--accent))" : "hsl(var(--primary))";

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Despesa com pessoal (LRF)</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Quão perto MG está do teto de gastos com pessoal</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "680px", lineHeight: 1.6 }}>
            A Lei de Responsabilidade Fiscal limita a despesa com pessoal do Poder Executivo a
            <strong> 49% da Receita Corrente Líquida</strong>. Acima de 46,55% (prudencial) o governo
            fica proibido de conceder reajustes e criar cargos; acima de 44,1% entra em alerta.
            {atual ? ` Janela mais recente: ${atual.periodo.replace(/_/g, " ")}.` : ""}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        {atual && (
          <>
            <div className="bloomberg-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", borderLeft: `3px solid ${tomCor(status.tom)}` }}>
              <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.08em" }}>Despesa com pessoal / RCL ajustada</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "1rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                <span style={{ fontSize: "3rem", fontWeight: 700, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: tomCor(status.tom) }}>{fmtPct(pctDtp)}</span>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: tomCor(status.tom) }}>{status.txt}</span>
              </div>
              <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem", fontSize: "0.8125rem" }}>
                <Limiar nome="Alerta (44,1%)" pct={pctAlerta} cur={pctDtp} />
                <Limiar nome="Prudencial (46,55%)" pct={pctPrud} cur={pctDtp} />
                <Limiar nome="Máximo (49%)" pct={pctMax} cur={pctDtp} />
              </div>
            </div>

            <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
              <Kpi label="Despesa Total com Pessoal (DTP)" value={fmtCompact(num(atual.dtp))} />
              <Kpi label="RCL ajustada (12m)" value={fmtCompact(num(atual.rcl_ajustada))} />
              <Kpi label="Folga até o teto" value={fmtCompact(num(atual.limite_maximo) - num(atual.dtp))} />
            </div>
          </>
        )}

        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Despesa líquida com pessoal — últimos meses</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Mês</th><th style={{ textAlign: "right" }}>Despesa líquida de pessoal</th></tr></thead>
            <tbody>
              {pessoal.map((r) => (
                <tr key={r.mes_ano}>
                  <td style={{ fontSize: "0.8125rem" }}>{r.mes_ano}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtCompact(num(r.despesa_liquida))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {limites.length > 1 && (
          <>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Histórico de comprometimento (DTP / RCL)</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead><tr><th>Janela (12 meses)</th><th style={{ textAlign: "right" }}>% da RCL</th><th style={{ textAlign: "right" }}>DTP</th></tr></thead>
                <tbody>
                  {limites.slice(0, 12).map((r) => (
                    <tr key={r.periodo}>
                      <td style={{ fontSize: "0.8125rem" }}>{r.periodo.replace(/_/g, " ")}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: num(r.pct_dtp) >= num(r.pct_prudencial) ? "hsl(var(--badge-danger-fg))" : "inherit" }}>{fmtPct(num(r.pct_dtp))}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtCompact(num(r.dtp))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> CGE-MG / Tesouro Estadual, Relatório de Gestão Fiscal (LRF). DTP =
          Despesa Total com Pessoal apurada em janela móvel de 12 meses; limites legais sobre a RCL
          ajustada. Dados públicos (CC-BY-4.0). Projeto independente, sem vínculo com o Governo de MG.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
function Limiar({ nome, pct, cur }: { nome: string; pct: number; cur: number }) {
  const passou = cur >= pct;
  return (
    <div>
      <div style={{ color: "hsl(var(--text-caption))", fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{nome}</div>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: passou ? "hsl(var(--badge-danger-fg))" : "hsl(var(--text-body))" }}>
        {fmtPct(pct)} {passou ? "✕ ultrapassado" : "✓"}
      </div>
    </div>
  );
}
