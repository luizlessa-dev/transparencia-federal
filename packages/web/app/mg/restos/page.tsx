/**
 * Restos a pagar por órgão — Executivo de Minas Gerais (agregado de contexto).
 * Despesa de exercícios anteriores represada (inscrita) e quanto foi quitado,
 * por órgão e ano. Favorecido é anonimizado na fonte → só somatório.
 * Rota: /mg/restos
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgRestos } from "~/services/mg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restos a pagar por órgão — Governo de MG | The BR Insider",
  description:
    "Quanto cada órgão do Executivo de Minas Gerais carrega em restos a pagar (despesa de anos anteriores não quitada) e quanto pagou, por ano. Saldo represado com fornecedores.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/restos" },
  openGraph: { title: "Restos a pagar por órgão — Governo de MG | The BR Insider", description: "Quanto cada órgão do Executivo de Minas Gerais carrega em restos a pagar (despesa de anos anteriores não quitada) e quanto pagou, por ano. Saldo represado com fornecedores.", url: "https://www.thebrinsider.com/mg/restos", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Restos a pagar por órgão — Governo de MG | The BR Insider", description: "Quanto cada órgão do Executivo de Minas Gerais carrega em restos a pagar (despesa de anos anteriores não quitada) e quanto pagou, por ano. Saldo represado com fornecedores." },
};

const ANOS = [2026, 2025, 2024, 2023, 2022];

type Row = { orgao: string | null; sigla: string | null; vr_inscrito: string | null; vr_pago: string | null };

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number) => (isFinite(v) ? `${Math.round(v)}%` : "—");

export default async function MgRestosPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const sp = await searchParams;
  const ano = ANOS.includes(Number(sp.ano)) ? Number(sp.ano) : 2025;

  const { data, error } = await getMgRestos(ano);

  if (error || !data) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  }
  const rows = data as Row[];
  const totalInscrito = rows.reduce((s, r) => s + num(r.vr_inscrito), 0);
  const totalPago = rows.reduce((s, r) => s + num(r.vr_pago), 0);
  const saldo = totalInscrito - totalPago;

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Restos a pagar</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Restos a pagar por órgão — {ano}</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            <strong>Restos a pagar</strong> é a despesa empenhada em anos anteriores que ainda não foi
            quitada — a conta represada com fornecedores. Abaixo, quanto cada órgão tinha inscrito e
            quanto efetivamente pagou no ano. {ano === 2026 ? "2026 é parcial (ano corrente)." : ""}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {ANOS.map((a) => (
            <Link key={a} href={`/mg/restos?ano=${a}`} style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: ano === a ? 700 : 400,
              border: `1px solid ${ano === a ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
              color: ano === a ? "hsl(var(--primary))" : "hsl(var(--text-body))", backgroundColor: ano === a ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none" }}>
              {a}{a === 2026 ? " (parcial)" : ""}
            </Link>
          ))}
        </div>

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label={`Inscrito em restos a pagar (${ano})`} value={fmtCompact(totalInscrito)} />
          <Kpi label="Pago no ano" value={fmtCompact(totalPago)} />
          <Kpi label="Saldo a pagar" value={fmtCompact(saldo)} />
          <Kpi label="% quitado" value={fmtPct((totalPago / totalInscrito) * 100)} />
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Órgão</th><th style={{ textAlign: "right" }}>Inscrito</th><th style={{ textAlign: "right" }}>Pago</th><th style={{ textAlign: "right" }}>Saldo</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const ins = num(r.vr_inscrito), pg = num(r.vr_pago), sal = ins - pg;
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      <strong>{r.sigla || "—"}</strong> <span style={{ color: "hsl(var(--text-caption))" }}>{r.orgao ?? "(sem órgão)"}</span>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-body))", fontSize: "0.8125rem" }}>{fmtBRL(ins)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-body))", fontSize: "0.8125rem" }}>{fmtBRL(pg)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: sal > 0 ? "hsl(var(--badge-danger-fg))" : "inherit" }}>{fmtBRL(sal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Portal de Dados Abertos de MG (CGE), tabela-fato de restos a pagar por
          unidade orçamentária, licença CC-BY-4.0. "Inscrito" soma os restos processados e não
          processados; "saldo" é o que resta após o pago no exercício. Favorecido anonimizado na fonte.
          Projeto independente, sem vínculo com o Governo de MG.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
