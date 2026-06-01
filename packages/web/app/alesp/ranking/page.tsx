/**
 * Ranking de despesas de gabinete — deputados ALESP.
 * Rota: alesp.thebrinsider.com/ranking → /alesp/ranking
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ranking de Gastos — ALESP | The BR Insider",
  description:
    "Deputados estaduais de São Paulo ordenados por despesas de gabinete reembolsadas. 11 anos de histórico — 2015 a hoje.",
  alternates: { canonical: "https://alesp.thebrinsider.com/ranking" },
  openGraph: {
    title: "Ranking ALESP — Despesas de Gabinete",
    description: "94 deputados, 600k+ despesas, 11 anos de histórico.",
    url: "https://alesp.thebrinsider.com/ranking",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

// ── Tipos ──────────────────────────────────────────────────────────────────

type ViewRow = {
  matricula: string;
  nome: string;
  partido: string | null;
  ativo: boolean;
  legislatura: number | null;
  ano: number;
  mes: number;
  qtd_despesas: number;
  qtd_fornecedores: number;
  total: number;
};

type DeputadoAgg = {
  matricula: string;
  nome: string;
  partido: string | null;
  ativo: boolean;
  total: number;
  qtd_despesas: number;
  qtd_meses: number;
};

type Periodo = "tudo" | "atual" | "ultimo-ano" | "ultimos-3m";

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

const PERIODO_LABELS: Record<Periodo, string> = {
  tudo: "Tudo (2015–hoje)",
  atual: "Legislatura atual",
  "ultimo-ano": "Último ano civil",
  "ultimos-3m": "Últimos 3 meses",
};

// Filtra linhas conforme período + se inclui históricos
function filtrar(rows: ViewRow[], periodo: Periodo, soAtivos: boolean): ViewRow[] {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;

  let out = rows;
  if (soAtivos) out = out.filter((r) => r.ativo === true);

  if (periodo === "atual") {
    out = out.filter((r) => r.ativo === true);
  } else if (periodo === "ultimo-ano") {
    out = out.filter((r) => r.ano === anoAtual || (r.ano === anoAtual - 1 && r.mes > mesAtual));
  } else if (periodo === "ultimos-3m") {
    out = out.filter((r) => {
      const meses = (r.ano - anoAtual) * 12 + (r.mes - mesAtual);
      return meses <= 0 && meses >= -2;
    });
  }
  return out;
}

function agregar(rows: ViewRow[]): DeputadoAgg[] {
  const map = new Map<string, DeputadoAgg>();
  for (const r of rows) {
    const existing = map.get(r.matricula);
    if (!existing) {
      map.set(r.matricula, {
        matricula: r.matricula,
        nome: r.nome,
        partido: r.partido,
        ativo: r.ativo,
        total: Number(r.total) || 0,
        qtd_despesas: Number(r.qtd_despesas) || 0,
        qtd_meses: 1,
      });
    } else {
      existing.total += Number(r.total) || 0;
      existing.qtd_despesas += Number(r.qtd_despesas) || 0;
      existing.qtd_meses += 1;
    }
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AlespRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; historicos?: string }>;
}) {
  const params = await searchParams;
  const periodo = (["tudo", "atual", "ultimo-ano", "ultimos-3m"].includes(params.periodo ?? "")
    ? params.periodo
    : "atual") as Periodo;
  // Default: só ativos. ?historicos=1 inclui legislaturas anteriores.
  const incluirHistoricos = params.historicos === "1";
  const soAtivos = !incluirHistoricos;

  // Busca paginada da view — 94 deputados × ~130 meses (jan/2015–mai/2026)
  // pode passar de 1000 linhas, então paginar.
  const sb = getSupabase();
  const todasRows: ViewRow[] = [];
  const pageSize = 1000;
  let offset = 0;
  let erroSql: string | null = null;

  for (;;) {
    const { data, error } = await sb
      .from("alesp_despesas_resumo_mensal")
      .select("matricula,nome,partido,ativo,legislatura,ano,mes,qtd_despesas,qtd_fornecedores,total")
      .order("ano", { ascending: true })
      .order("mes", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      erroSql = error.message;
      break;
    }
    if (!data || data.length === 0) break;
    todasRows.push(...(data as ViewRow[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  if (erroSql) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar dados: {erroSql}
        </p>
      </div>
    );
  }

  const filtradas = filtrar(todasRows, periodo, soAtivos);
  const ranking = agregar(filtradas);

  const totalDespesas = filtradas.reduce((s, r) => s + (Number(r.qtd_despesas) || 0), 0);
  const totalGasto = ranking.reduce((s, d) => s + d.total, 0);
  const deputadosComGasto = ranking.filter((d) => d.total > 0).length;

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
            <Link href="/" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              ALESP
            </Link>
            <span>/</span>
            <span>Ranking</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
              Ranking — Despesas de Gabinete
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
              ALESP · 94 deputados
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
            Despesas reembolsadas pela ALESP por mês × CNPJ. Fonte: portal de
            dados abertos da assembleia (XML, atualização diária).
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "960px" }}>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {(["atual", "ultimos-3m", "ultimo-ano", "tudo"] as Periodo[]).map((f) => {
            const href = f === "atual"
              ? incluirHistoricos ? "/ranking?historicos=1" : "/ranking"
              : `/ranking?periodo=${f}${incluirHistoricos ? "&historicos=1" : ""}`;
            return (
              <Link
                key={f}
                href={href}
                style={{
                  padding: "0.375rem 0.875rem",
                  fontSize: "0.8125rem",
                  fontWeight: periodo === f ? 700 : 400,
                  border: `1px solid ${periodo === f ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                  borderRadius: "4px",
                  color: periodo === f ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                  backgroundColor: periodo === f ? "hsl(var(--primary) / 0.08)" : "transparent",
                  textDecoration: "none",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {PERIODO_LABELS[f]}
              </Link>
            );
          })}
        </div>

        <div
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginBottom: "1.5rem",
          }}
        >
          {incluirHistoricos ? (
            <>
              Incluindo deputados de legislaturas anteriores ·{" "}
              <Link
                href={periodo === "atual" ? "/ranking" : `/ranking?periodo=${periodo}`}
                style={{ color: "hsl(var(--primary))" }}
              >
                ocultar históricos
              </Link>
            </>
          ) : (
            <>
              Só deputados em exercício ·{" "}
              <Link
                href={periodo === "atual"
                  ? "/ranking?historicos=1"
                  : `/ranking?periodo=${periodo}&historicos=1`}
                style={{ color: "hsl(var(--primary))" }}
              >
                incluir históricos (legislaturas anteriores)
              </Link>
            </>
          )}
        </div>

        {/* ── KPIs do período ────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total gasto" value={fmtBRL(totalGasto)} />
          <Kpi label="Despesas" value={fmtNum(totalDespesas)} />
          <Kpi
            label="Deputados c/ gastos"
            value={`${deputadosComGasto}${incluirHistoricos ? "" : "/94"}`}
          />
          <Kpi
            label="Média por deputado"
            value={fmtBRL(deputadosComGasto > 0 ? totalGasto / deputadosComGasto : 0)}
          />
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                <th>Deputado</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "right" }}>Despesas</th>
                <th style={{ textAlign: "right" }}>Meses</th>
                <th style={{ textAlign: "right" }}>Média/mês</th>
              </tr>
            </thead>
            <tbody>
              {ranking.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      textAlign: "center",
                      padding: "2rem",
                      color: "hsl(var(--text-caption))",
                    }}
                  >
                    Nenhum dado no período selecionado.
                  </td>
                </tr>
              ) : (
                ranking.map((dep, idx) => {
                  const mediaMes = dep.qtd_meses > 0 ? dep.total / dep.qtd_meses : 0;
                  const pctDoTop =
                    ranking[0]?.total > 0 ? (dep.total / ranking[0].total) * 100 : 0;

                  return (
                    <tr key={dep.matricula}>
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
                              href={`/parlamentares/${encodeURIComponent(dep.matricula)}`}
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: 600,
                                color: "hsl(var(--text-headline))",
                                textDecoration: "none",
                              }}
                            >
                              {dep.nome}
                            </Link>
                            <div style={{ marginTop: "0.125rem", display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                              {dep.partido && (
                                <span className="badge-neutral" style={{ fontSize: "0.625rem" }}>
                                  {dep.partido}
                                </span>
                              )}
                              {!dep.ativo && (
                                <span className="badge-warn" style={{ fontSize: "0.625rem" }}>
                                  histórico
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: dep.total === 0 ? "hsl(var(--text-caption))" : "hsl(var(--text-headline))",
                        }}
                      >
                        {dep.total === 0 ? "—" : fmtBRL(dep.total)}
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: "hsl(var(--text-body))",
                          fontSize: "0.8125rem",
                        }}
                      >
                        {fmtNum(dep.qtd_despesas)}
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
                })
              )}
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
          Período exibido: <strong>{PERIODO_LABELS[periodo]}</strong>
          {incluirHistoricos && " · incluindo deputados de legislaturas anteriores"}. Fonte: ALESP
          — Portal de Dados Abertos (despesas_gabinetes.xml). Atualizado diariamente. Valores em R$
          nominais. Granularidade temporal: mês (a ALESP não publica data exata nem número de
          documento fiscal).
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
