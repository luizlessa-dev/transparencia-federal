/**
 * Credenciados do IPSEMG — rede de saúde do servidor de MG.
 * Clínicas, laboratórios e hospitais conveniados, por CNPJ. Rota: /mg/ipsemg
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgIpsemg } from "~/services/mg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Credenciados do IPSEMG — rede de saúde do servidor de MG | The BR Insider",
  description:
    "Clínicas, laboratórios e hospitais credenciados ao IPSEMG (saúde do servidor de Minas Gerais), por ramo de atividade e município.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/ipsemg" },
  openGraph: { title: "Credenciados do IPSEMG — saúde do servidor de MG", description: "Rede credenciada do IPSEMG: clínicas, laboratórios e hospitais por ramo e município.", url: "https://www.thebrinsider.com/mg/ipsemg", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

type Row = { nome: string | null; cnpj_norm: string | null; ramo_atividade: string | null; municipio: string | null };
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgIpsemgPage() {
  const { data: _ipsemg } = await getMgIpsemg();
  const rows = _ipsemg ?? [];
  const porRamo = new Map<string, number>(); for (const r of rows) { const k = r.ramo_atividade ?? "(s/ ramo)"; porRamo.set(k, (porRamo.get(k) ?? 0) + 1); }
  const ramos = [...porRamo.entries()].sort((a, b) => b[1] - a[1]);
  const porMun = new Map<string, number>(); for (const r of rows) { const k = r.municipio ?? "?"; porMun.set(k, (porMun.get(k) ?? 0) + 1); }
  const muns = [...porMun.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>IPSEMG</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Rede credenciada do IPSEMG</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Clínicas, laboratórios e hospitais <strong>credenciados</strong> ao IPSEMG (assistência à
            saúde do servidor de Minas Gerais), por ramo e município. A fonte não traz valores.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Credenciados" value={fmtNum(rows.length)} />
          <Kpi label="Ramos de atividade" value={fmtNum(ramos.length)} />
          <Kpi label="Municípios" value={fmtNum(muns.length)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Por ramo</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}><thead><tr><th>Ramo</th><th style={{ textAlign: "right" }}>Credenciados</th></tr></thead>
                <tbody>{ramos.slice(0, 12).map(([k, v], i) => (<tr key={i}><td style={{ fontSize: "0.8125rem" }}>{k}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtNum(v)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Por município</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}><thead><tr><th>Município</th><th style={{ textAlign: "right" }}>Credenciados</th></tr></thead>
                <tbody>{muns.slice(0, 12).map(([k, v], i) => (<tr key={i}><td style={{ fontSize: "0.8125rem" }}>{k}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtNum(v)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Contratos Vigentes - IPSEMG, Portal de Dados Abertos de MG, CC-BY-4.0.
          Lista de credenciados vigentes (sem valores na fonte). Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
