/**
 * Diárias por órgão — Executivo de Minas Gerais (agregado de contexto).
 * Quanto cada secretaria/órgão gasta com diárias, por ano. Favorecido é
 * anonimizado na fonte → só somatório por unidade orçamentária.
 * Rota: /mg/diarias
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gasto com diárias por órgão — Governo de MG | The BR Insider",
  description:
    "Quanto cada órgão do Executivo de Minas Gerais gasta com diárias de viagem, por ano. Ranking por unidade orçamentária a partir do Portal de Dados Abertos.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/diarias" },
};

const ANOS = [2026, 2025, 2024, 2023, 2022];

type Row = { orgao: string | null; sigla: string | null; vr_empenhado: string | null; vr_pago: string | null; qtd_registros: number | null };

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgDiariasPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const sp = await searchParams;
  const ano = ANOS.includes(Number(sp.ano)) ? Number(sp.ano) : 2025;

  const sb = getSupabase();
  const { data, error } = await sb
    .from("mg_diarias_orgao")
    .select("orgao,sigla,vr_empenhado,vr_pago,qtd_registros")
    .eq("ano", ano)
    .order("vr_pago", { ascending: false });

  if (error || !data) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  }
  const rows = data as Row[];
  const totalPago = rows.reduce((s, r) => s + num(r.vr_pago), 0);
  const totalReg = rows.reduce((s, r) => s + (r.qtd_registros ?? 0), 0);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Diárias por órgão</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Gasto com diárias por órgão — {ano}</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "680px", lineHeight: 1.6 }}>
            Quanto cada órgão do Executivo mineiro pagou em <strong>diárias de viagem</strong> no ano.
            Polícia Militar, Educação e Saúde lideram — força operacional grande significa muita
            viagem. {ano === 2026 ? "2026 é parcial (ano corrente)." : ""}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {ANOS.map((a) => (
            <Link key={a} href={`/mg/diarias?ano=${a}`} style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: ano === a ? 700 : 400,
              border: `1px solid ${ano === a ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
              color: ano === a ? "hsl(var(--primary))" : "hsl(var(--text-body))", backgroundColor: ano === a ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none" }}>
              {a}{a === 2026 ? " (parcial)" : ""}
            </Link>
          ))}
        </div>

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label={`Total pago em diárias (${ano})`} value={fmtCompact(totalPago)} />
          <Kpi label="Órgãos com diárias" value={fmtNum(rows.length)} />
          <Kpi label="Pagamentos no ano" value={fmtNum(totalReg)} />
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Órgão</th><th style={{ textAlign: "right" }}>Empenhado</th><th style={{ textAlign: "right" }}>Pago</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                    <strong>{r.sigla || "—"}</strong> <span style={{ color: "hsl(var(--text-caption))" }}>{r.orgao ?? "(sem órgão)"}</span>
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-body))", fontSize: "0.8125rem" }}>{fmtBRL(num(r.vr_empenhado))}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(r.vr_pago))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Portal de Dados Abertos de MG (CGE), tabela-fato de diárias por unidade
          orçamentária, licença CC-BY-4.0. Valores agregados por órgão e ano; o favorecido individual é
          anonimizado na fonte. "Pago" é o valor liquidado e quitado no exercício. Projeto independente.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
