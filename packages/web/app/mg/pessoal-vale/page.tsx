/**
 * Pessoal pago com o Acordo Vale/Brumadinho — Estado de MG.
 * Servidores custeados com recursos do acordo, por órgão. Rota: /mg/pessoal-vale
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pessoal pago com o acordo Vale/Brumadinho — Governo de MG | The BR Insider",
  description:
    "Servidores e contratados custeados com recursos do Acordo Judicial de Brumadinho, por órgão e cargo, no Estado de Minas Gerais.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/pessoal-vale" },
  openGraph: { title: "Pessoal pago com o acordo Vale/Brumadinho — Governo de MG", description: "Quem está na folha custeada pelo acordo de Brumadinho, por órgão e cargo.", url: "https://www.thebrinsider.com/mg/pessoal-vale", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

type Row = { ano_mes: number | null; orgao_sigla: string | null; orgao: string | null; nome: string | null; valor: string | null; cargo_descricao: string | null };
const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
async function fetchAll(cols: string): Promise<Row[]> {
  const sb = getSupabase(); let out: Row[] = [], from = 0;
  while (true) { const { data } = await sb.from("mg_despesa_pessoal_vale").select(cols).range(from, from + 999); const d = (data ?? []) as unknown as Row[]; out = out.concat(d); if (d.length < 1000) break; from += 1000; }
  return out;
}

export default async function MgPessoalValePage() {
  const rows = await fetchAll("ano_mes,orgao_sigla,orgao,nome,valor,cargo_descricao");
  const totalFolha = rows.reduce((s, r) => s + num(r.valor), 0);
  const pessoas = new Set(rows.map((r) => r.nome).filter(Boolean)).size;
  const porOrg = new Map<string, { nome: string; v: number; p: Set<string> }>();
  for (const r of rows) { const k = r.orgao_sigla ?? "?"; const a = porOrg.get(k) ?? { nome: r.orgao ?? k, v: 0, p: new Set<string>() }; a.v += num(r.valor); if (r.nome) a.p.add(r.nome); porOrg.set(k, a); }
  const orgs = [...porOrg.entries()].sort((a, b) => b[1].v - a[1].v);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Pessoal · Acordo Vale</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Pessoal pago com o acordo de Brumadinho</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Servidores e contratados custeados com recursos do <strong>Acordo Judicial Vale/Brumadinho</strong>,
            por órgão. Concentrado em pastas ambientais e de saúde ligadas à reparação.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Folha (soma dos meses)" value={fmtCompact(totalFolha)} />
          <Kpi label="Pessoas" value={fmtNum(pessoas)} />
          <Kpi label="Órgãos" value={fmtNum(orgs.length)} />
        </div>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Por órgão</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Órgão</th><th style={{ textAlign: "center" }}>Pessoas</th><th style={{ textAlign: "right" }}>Folha (soma)</th></tr></thead>
            <tbody>{orgs.map(([sig, x], i) => (<tr key={i}><td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}><strong>{sig}</strong> <span style={{ color: "hsl(var(--text-caption))" }}>{x.nome}</span></td><td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(x.p.size)}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(x.v)}</td></tr>))}</tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Despesa de Pessoal - Acordo Judicial da Vale (SEPLAG-MG), CC-BY-4.0.
          "Folha (soma)" é o somatório dos pagamentos mensais no período (não é salário mensal). Remuneração
          de agente público é informação pública (LAI). Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
