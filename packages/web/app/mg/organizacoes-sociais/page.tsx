/**
 * Organizações Sociais — Termos de Parceria e Contratos de Gestão de MG.
 * Quais OSs gerem serviços públicos e quanto receberam. Rota: /mg/organizacoes-sociais
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Organizações sociais e contratos de gestão — Governo de MG | The BR Insider",
  description:
    "Termos de parceria e contratos de gestão do Estado de Minas Gerais com organizações sociais: entidade, CNPJ, objeto e repasses.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/organizacoes-sociais" },
  openGraph: { title: "Organizações sociais e contratos de gestão — Governo de MG", description: "Quais OSs gerem serviços públicos em MG e quanto receberam.", url: "https://www.thebrinsider.com/mg/organizacoes-sociais", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

type Row = { id_instrumento: string | null; tipo_instrumento: string | null; entidade: string | null; cnpj_norm: string | null; objeto: string | null; situacao: string | null; vr_repasse_atualizado: string | null };
const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgOsPage() {
  const sb = getSupabase();
  const { data, error } = await sb.from("mg_os_parcerias").select("id_instrumento,tipo_instrumento,entidade,cnpj_norm,objeto,situacao,vr_repasse_atualizado").order("vr_repasse_atualizado", { ascending: false });
  if (error || !data) return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  const rows = data as Row[];
  const total = rows.reduce((s, r) => s + num(r.vr_repasse_atualizado), 0);
  const porEnt = new Map<string, number>(); for (const r of rows) { const k = r.entidade ?? r.cnpj_norm ?? "?"; porEnt.set(k, (porEnt.get(k) ?? 0) + num(r.vr_repasse_atualizado)); }
  const entidades = [...porEnt.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Organizações sociais</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Organizações sociais e contratos de gestão</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Entidades privadas sem fins lucrativos que gerem serviços públicos via <strong>contrato de
            gestão</strong> ou <strong>termo de parceria</strong>, e quanto receberam de repasses.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total repassado" value={fmtCompact(total)} />
          <Kpi label="Instrumentos" value={fmtNum(rows.length)} />
          <Kpi label="Entidades" value={fmtNum(entidades.length)} />
        </div>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Por entidade</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Entidade</th><th style={{ textAlign: "right" }}>Repassado</th></tr></thead>
            <tbody>{entidades.map(([nome, v], i) => (<tr key={i}><td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td><td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{nome}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(v)}</td></tr>))}</tbody>
          </table>
        </div>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Instrumentos</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Entidade / Objeto</th><th style={{ textAlign: "center" }}>Tipo</th><th style={{ textAlign: "right" }}>Repassado</th></tr></thead>
            <tbody>{rows.map((r, i) => (<tr key={i}><td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}><div style={{ fontWeight: 600 }}>{r.entidade ?? "—"} <span style={{ fontWeight: 400, fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>· {r.situacao}</span></div><div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{(r.objeto ?? "").slice(0, 80)}</div></td><td style={{ textAlign: "center", fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{(r.tipo_instrumento ?? "").replace("Contrato de Gestão", "Gestão").replace("Termo de Parceria", "Parceria")}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(r.vr_repasse_atualizado))}</td></tr>))}</tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Termos de Parceria e Contratos de Gestão (SEPLAG-MG), CC-BY-4.0. Repasse
          atualizado somado por instrumento. Organizações sociais são entidades sem fins lucrativos. Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
