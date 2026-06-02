/**
 * Convênios de entrada — recursos que ENTRAM no Estado de MG.
 * Quem repassa (União, prefeituras) → órgão estadual → valor. Rota: /mg/convenios-entrada
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgConveniosEntrada } from "~/services/mg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convênios de entrada de recursos — Governo de MG | The BR Insider",
  description:
    "De onde vêm os recursos que entram no Estado de Minas Gerais via convênio: União, fundos nacionais e prefeituras, por valor concedido.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/convenios-entrada" },
  openGraph: { title: "Convênios de entrada de recursos — Governo de MG", description: "De onde vem o dinheiro que entra no Estado de MG via convênio.", url: "https://www.thebrinsider.com/mg/convenios-entrada", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

type Row = { concedente: string | null; ano: number | null; vr_concedente: string | null };
const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgConveniosEntradaPage() {
  const { data: _convEnt } = await getMgConveniosEntrada();
  const rows = _convEnt ?? [];
  const total = rows.reduce((s, r) => s + num(r.vr_concedente), 0);
  const porC = new Map<string, { n: number; v: number }>(); for (const r of rows) { const k = r.concedente ?? "(não informado)"; const a = porC.get(k) ?? { n: 0, v: 0 }; a.n++; a.v += num(r.vr_concedente); porC.set(k, a); }
  const conced = [...porC.entries()].sort((a, b) => b[1].v - a[1].v);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Convênios de entrada</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>De onde vêm os recursos que entram em MG</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Convênios de <strong>entrada</strong> de recursos: quem concede (União, fundos nacionais,
            prefeituras) para órgãos do Estado de Minas Gerais, por valor.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total que entra" value={fmtCompact(total)} />
          <Kpi label="Convênios" value={fmtNum(rows.length)} />
          <Kpi label="Concedentes" value={fmtNum(conced.length)} />
        </div>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Maiores concedentes</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Concedente</th><th style={{ textAlign: "center" }}>Convênios</th><th style={{ textAlign: "right" }}>Valor concedido</th></tr></thead>
            <tbody>{conced.slice(0, 80).map(([nome, x], i) => (<tr key={i}><td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td><td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{nome}</td><td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(x.n)}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(x.v)}</td></tr>))}</tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Convênios de entrada de recursos (CGE-MG), CC-BY-4.0. Valor do concedente
          somado por convênio (1 linha por convênio). Concedentes são, em geral, entes públicos. Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
