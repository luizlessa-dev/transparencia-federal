/**
 * Doações e comodatos ao Estado de MG (Selo Amigo). Quem doa o quê.
 * Rota: /mg/doacoes
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Doações e comodatos ao Estado de MG — quem doa o quê | The BR Insider",
  description:
    "Doações e comodatos privados ao Estado de Minas Gerais (Selo Amigo): doador, objeto, órgão recebedor e faixa de valor.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/doacoes" },
  openGraph: { title: "Doações e comodatos ao Estado de MG", description: "Quem doa o quê ao Governo de Minas Gerais (Selo Amigo).", url: "https://www.thebrinsider.com/mg/doacoes", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

type Row = { doador: string | null; objeto: string | null; orgao_recebedor: string | null; natureza_doador: string | null; categoria_valor: string | null; ano: number | null };
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgDoacoesPage() {
  const sb = getSupabase();
  const { data, error } = await sb.from("mg_doacoes").select("doador,objeto,orgao_recebedor,natureza_doador,categoria_valor,ano").order("ano", { ascending: false });
  if (error || !data) return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  const rows = data as Row[];
  const doadores = new Set(rows.map((r) => r.doador).filter(Boolean)).size;
  const orgaos = new Set(rows.map((r) => r.orgao_recebedor).filter(Boolean)).size;

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Doações e comodatos</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Quem doa ao Estado de Minas Gerais</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Doações e comodatos privados ao Estado (programa Selo Amigo): doador, objeto e órgão
            recebedor. O valor vem em <strong>faixa</strong> (a fonte não traz valor exato nem CNPJ).
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Doações / comodatos" value={fmtNum(rows.length)} />
          <Kpi label="Doadores" value={fmtNum(doadores)} />
          <Kpi label="Órgãos recebedores" value={fmtNum(orgaos)} />
        </div>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "3rem", textAlign: "center" }}>Ano</th><th>Doador / Objeto</th><th>Órgão</th><th style={{ textAlign: "right" }}>Faixa</th></tr></thead>
            <tbody>{rows.map((r, i) => (<tr key={i}><td style={{ textAlign: "center", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{r.ano}</td><td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}><div style={{ fontWeight: 600 }}>{r.doador ?? "—"} <span style={{ fontWeight: 400, fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>· {r.natureza_doador}</span></div><div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{(r.objeto ?? "").slice(0, 70)}</div></td><td style={{ fontSize: "0.72rem", color: "hsl(var(--text-body))" }}>{r.orgao_recebedor ?? "—"}</td><td style={{ textAlign: "right", fontSize: "0.6875rem", color: "hsl(var(--text-body))" }}>{r.categoria_valor ?? "—"}</td></tr>))}</tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Doações e comodatos - Selo Amigo de Minas Gerais (Casa Civil/SEGOV),
          CC-BY-4.0. Valor em faixa; sem CNPJ do doador na fonte. Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
