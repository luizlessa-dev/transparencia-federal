/**
 * Ranking de verba indenizatória — deputados ALMG.
 * Rota: almg.thebrinsider.com/ranking → /almg/ranking
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking de Gastos — ALMG | The BR Insider",
  description:
    "Deputados estaduais de Minas Gerais ordenados por verba indenizatória reembolsada. Dados nota a nota, fev/2025–abr/2026.",
  alternates: { canonical: "https://almg.thebrinsider.com/ranking" },
  openGraph: {
    title: "Ranking ALMG — Verba Indenizatória",
    description: "77 deputados, 31 mil notas fiscais, 15 meses.",
    url: "https://almg.thebrinsider.com/ranking",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

// ── Tipos ──────────────────────────────────────────────────────────────────

type ViewRow = {
  id_almg: number;
  nome: string;
  partido: string;
  ano: number;
  mes: number;
  qtd_notas: number;
  qtd_fornecedores: number;
  total_reembolsado: number;
  total_despesa: number;
};

type DeputadoAgg = {
  id_almg: number;
  nome: string;
  partido: string;
  total_reembolsado: number;
  total_despesa: number;
  qtd_notas: number;
  qtd_meses: number;
};

type Filtro = "tudo" | "2025" | "2026" | "3m";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtNum(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

// Aplica filtro de período às linhas da view
function filtrar(rows: ViewRow[], filtro: Filtro): ViewRow[] {
  if (filtro === "2025") return rows.filter((r) => r.ano === 2025);
  if (filtro === "2026") return rows.filter((r) => r.ano === 2026);
  if (filtro === "3m") {
    // últimos 3 meses disponíveis: fev, mar, abr/2026
    return rows.filter(
      (r) => r.ano === 2026 && r.mes >= 2 && r.mes <= 4,
    );
  }
  return rows; // "tudo"
}

// Agrega linhas (por deputado) depois do filtro de período
function agregar(rows: ViewRow[]): DeputadoAgg[] {
  const map = new Map<number, DeputadoAgg>();
  for (const r of rows) {
    const existing = map.get(r.id_almg);
    if (!existing) {
      map.set(r.id_almg, {
        id_almg: r.id_almg,
        nome: r.nome,
        partido: r.partido,
        total_reembolsado: Number(r.total_reembolsado) || 0,
        total_despesa: Number(r.total_despesa) || 0,
        qtd_notas: Number(r.qtd_notas) || 0,
        qtd_meses: 1,
      });
    } else {
      existing.total_reembolsado += Number(r.total_reembolsado) || 0;
      existing.total_despesa += Number(r.total_despesa) || 0;
      existing.qtd_notas += Number(r.qtd_notas) || 0;
      existing.qtd_meses += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total_reembolsado - a.total_reembolsado);
}

// ── Labels dos filtros ─────────────────────────────────────────────────────

const FILTRO_LABELS: Record<Filtro, string> = {
  tudo: "Tudo (15 meses)",
  "2025": "2025 (fev–dez)",
  "2026": "2026 (jan–abr)",
  "3m": "Últimos 3 meses",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AlmgRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const params = await searchParams;
  const filtro = (["tudo", "2025", "2026", "3m"].includes(params.periodo ?? "")
    ? params.periodo
    : "tudo") as Filtro;

  // Busca view completa (77 dep × 15 meses = 1155 linhas — cabe em memória)
  const sb = getSupabase();
  const { data, error } = await sb
    .from("almg_verba_resumo_mensal")
    .select("id_almg,nome,partido,ano,mes,qtd_notas,qtd_fornecedores,total_reembolsado,total_despesa")
    .order("ano", { ascending: true })
    .order("mes", { ascending: true });

  if (error || !data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar dados: {error?.message ?? "resposta vazia"}
        </p>
      </div>
    );
  }

  const filtradas = filtrar(data as ViewRow[], filtro);
  const ranking = agregar(filtradas);

  const totalNotas = filtradas.reduce((s, r) => s + (Number(r.qtd_notas) || 0), 0);
  const totalReembolsado = ranking.reduce((s, d) => s + d.total_reembolsado, 0);
  const deputadosAtivos = ranking.filter((d) => d.total_reembolsado > 0).length;

  return (
    <>
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "960px" }}>
          {/* Breadcrumb */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Link
              href="/"
              style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
            >
              ALMG
            </Link>
            <span>/</span>
            <span>Ranking</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
              Ranking — Verba Indenizatória
            </h1>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "hsl(var(--accent))",
              }}
            >
              ALMG · 20ª legislatura
            </span>
          </div>

          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
              margin: "0.5rem 0 0",
              maxWidth: "560px",
            }}
          >
            Gastos reembolsados pela Assembleia nota a nota. Fonte: portal de
            transparência da ALMG (HTML scraping — CSV oficial tem colunas vazias).
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "960px" }}>

        {/* ── Filtro de período ──────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          {(["tudo", "2025", "2026", "3m"] as Filtro[]).map((f) => (
            <Link
              key={f}
              href={f === "tudo" ? "/ranking" : `/ranking?periodo=${f}`}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: filtro === f ? 700 : 400,
                border: `1px solid ${filtro === f ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                borderRadius: "4px",
                color: filtro === f ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor:
                  filtro === f ? "hsl(var(--primary) / 0.08)" : "transparent",
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
              }}
            >
              {FILTRO_LABELS[f]}
            </Link>
          ))}
        </div>

        {/* ── KPIs do período ────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total reembolsado" value={fmtBRL(totalReembolsado)} />
          <Kpi label="Notas fiscais" value={fmtNum(totalNotas)} />
          <Kpi label="Deputados c/ gastos" value={`${deputadosAtivos}/77`} />
          <Kpi label="Média por deputado" value={fmtBRL(deputadosAtivos > 0 ? totalReembolsado / deputadosAtivos : 0)} />
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                <th>Deputado</th>
                <th style={{ textAlign: "right" }}>Reembolsado</th>
                <th style={{ textAlign: "right" }}>Notas</th>
                <th style={{ textAlign: "right" }}>Meses</th>
                <th style={{ textAlign: "right" }}>Média/mês</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((dep, idx) => {
                const mediaMes =
                  dep.qtd_meses > 0 ? dep.total_reembolsado / dep.qtd_meses : 0;
                const pctDoTop =
                  ranking[0]?.total_reembolsado > 0
                    ? (dep.total_reembolsado / ranking[0].total_reembolsado) * 100
                    : 0;

                return (
                  <tr key={dep.id_almg}>
                    <td
                      style={{
                        textAlign: "center",
                        color: "hsl(var(--text-caption))",
                        fontVariantNumeric: "tabular-nums",
                        fontSize: "0.75rem",
                      }}
                    >
                      {idx + 1}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                        {/* Barra proporcional */}
                        <div
                          style={{
                            width: "3rem",
                            height: "3px",
                            borderRadius: "2px",
                            backgroundColor: "hsl(var(--border))",
                            flexShrink: 0,
                          }}
                        >
                          <div
                            style={{
                              width: `${pctDoTop.toFixed(1)}%`,
                              height: "100%",
                              borderRadius: "2px",
                              backgroundColor:
                                idx === 0
                                  ? "hsl(var(--badge-danger-fg))"
                                  : idx < 5
                                  ? "hsl(var(--accent))"
                                  : "hsl(var(--primary))",
                            }}
                          />
                        </div>
                        <div>
                          <Link
                            href={`/parlamentares/${dep.id_almg}`}
                            style={{
                              fontSize: "0.875rem",
                              fontWeight: 600,
                              color: "hsl(var(--primary))",
                              textDecoration: "none",
                            }}
                          >
                            {dep.nome}
                          </Link>
                          <span
                            className="badge-neutral"
                            style={{ fontSize: "0.625rem", marginTop: "0.125rem" }}
                          >
                            {dep.partido}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color:
                          dep.total_reembolsado === 0
                            ? "hsl(var(--text-caption))"
                            : "hsl(var(--text-headline))",
                      }}
                    >
                      {dep.total_reembolsado === 0 ? "—" : fmtBRL(dep.total_reembolsado)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "hsl(var(--text-body))",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {fmtNum(dep.qtd_notas)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "hsl(var(--text-caption))",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {dep.qtd_meses}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: "hsl(var(--text-body))",
                        fontSize: "0.8125rem",
                      }}
                    >
                      {dep.qtd_meses > 0 ? fmtBRL(mediaMes) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Nota de rodapé ─────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1rem",
            lineHeight: 1.6,
          }}
        >
          Período exibido: <strong>{FILTRO_LABELS[filtro]}</strong>. Fonte: ALMG — Portal de
          Transparência (verba indenizatória). Atualizado mensalmente. Valores em R$ nominais.
          Deputados com R$ 0 no período não submeteram pedidos de reembolso.
        </p>
      </div>
    </>
  );
}

// ── Primitivas ─────────────────────────────────────────────────────────────

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
    </div>
  );
}
