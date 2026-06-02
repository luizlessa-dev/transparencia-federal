/**
 * Reparação Vale / Brumadinho — Executivo de MG.
 * Iniciativas e valores do acordo judicial. "Para onde vai o dinheiro."
 * Rota: /mg/reparacao
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgReparacao } from "~/services/mg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Para onde vai o dinheiro do acordo Vale / Brumadinho | The BR Insider",
  description:
    "Iniciativas e valores do acordo judicial de reparação de Brumadinho executadas pelo Estado de Minas Gerais. Rodoanel, bacias, rodovias, hospitais.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/reparacao" },
  openGraph: { title: "Para onde vai o dinheiro do acordo Vale / Brumadinho | The BR Insider", description: "Iniciativas e valores do acordo judicial de reparação de Brumadinho executadas pelo Estado de Minas Gerais. Rodoanel, bacias, rodovias, hospitais.", url: "https://www.thebrinsider.com/mg/reparacao", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Para onde vai o dinheiro do acordo Vale / Brumadinho | The BR Insider", description: "Iniciativas e valores do acordo judicial de reparação de Brumadinho executadas pelo Estado de Minas Gerais. Rodoanel, bacias, rodovias, hospitais." },
};

type Ini = { iniciativa: string | null; anexo: string | null; valor: number | null };

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}
function fmtCompact(v: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
}
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgReparacaoPage() {
  const { data, error } = await getMgReparacao();

  if (error || !data) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  }
  const ini = data as Ini[];
  const total = ini.reduce((s, r) => s + (Number(r.valor) || 0), 0);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Reparação Vale / Brumadinho</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Acordo Vale / Brumadinho: para onde vai o dinheiro</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "660px" }}>
            Iniciativas e valores executados pelo Estado de Minas Gerais no âmbito do acordo
            judicial de reparação. Total e maiores destinos abaixo.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total do acordo (iniciativas)" value={fmtCompact(total)} />
          <Kpi label="Iniciativas" value={fmtNum(ini.length)} />
          <Kpi label="Maior iniciativa" value={fmtCompact(Number(ini[0]?.valor) || 0)} />
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Iniciativa</th><th style={{ textAlign: "center" }}>Anexo</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
            <tbody>
              {ini.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{r.iniciativa ?? "—"}</td>
                  <td style={{ textAlign: "center", fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{r.anexo}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(r.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> SEPLAG-MG, iniciativas do acordo judicial de reparação Vale/Brumadinho.
          Valores são o montante previsto por iniciativa (anexos do acordo). Dados públicos (CC-BY-4.0).
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
