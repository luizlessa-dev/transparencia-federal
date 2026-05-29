/**
 * Cruzamento de fornecedores — ALMG × Câmara Federal × ALESP
 * Rota: almg.thebrinsider.com/cruzamento → /almg/cruzamento
 *
 * Usa a materialized view `almg_fornecedores_intersetados`:
 *   CNPJs que aparecem na ALMG e em ≥1 outra casa.
 *   2.362 CNPJs: 2.352 ALMG+Câmara, 83 ALMG+ALESP, 73 nas 3 casas.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cruzamento ALMG × Câmara × ALESP | The BR Insider",
  description:
    "Fornecedores que receberam de duas ou três casas legislativas: ALMG, Câmara Federal e ALESP. 2.362 CNPJs em comum — os mesmos fornecedores em Brasília e nos estados.",
  alternates: { canonical: "https://almg.thebrinsider.com/cruzamento" },
  openGraph: {
    title: "Cruzamento ALMG × Câmara × ALESP — Fornecedores em comum",
    description: "2.362 CNPJs que aparecem na ALMG e em pelo menos uma outra casa legislativa.",
    url: "https://almg.thebrinsider.com/cruzamento",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

// ── Tipos ──────────────────────────────────────────────────────────────────

type Fornecedor = {
  cnpj: string;
  nome: string;
  total_almg: number | null;
  notas_almg: number | null;
  deps_almg: number | null;
  total_alesp: number | null;
  notas_alesp: number | null;
  deps_alesp: number | null;
  total_camara: number | null;
  notas_camara: number | null;
  deps_camara: number | null;
  em_almg: boolean;
  em_alesp: boolean;
  em_camara: boolean;
  n_casas: number;
  total_geral: number;
};

type Filtro = "todos" | "3-casas" | "almg-camara" | "almg-alesp";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtNum(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(v);
}

function fmtCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return cnpj;
}

const FILTRO_LABELS: Record<Filtro, string> = {
  todos: "Todos (2.362)",
  "3-casas": "Nas 3 casas (73)",
  "almg-camara": "ALMG + Câmara (2.352)",
  "almg-alesp": "ALMG + ALESP (83)",
};

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AlmgCruzamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const params = await searchParams;
  const filtro = (["todos", "3-casas", "almg-camara", "almg-alesp"].includes(params.filtro ?? "")
    ? params.filtro
    : "todos") as Filtro;

  const sb = getSupabase();

  let query = sb
    .from("almg_fornecedores_intersetados")
    .select(
      "cnpj,nome,total_almg,notas_almg,deps_almg,total_alesp,notas_alesp,deps_alesp,total_camara,notas_camara,deps_camara,em_almg,em_alesp,em_camara,n_casas,total_geral",
    )
    .order("total_geral", { ascending: false });

  if (filtro === "3-casas") query = query.eq("n_casas", 3);
  else if (filtro === "almg-camara") query = query.eq("em_camara", true).eq("em_alesp", false);
  else if (filtro === "almg-alesp") query = query.eq("em_alesp", true).eq("em_camara", false);

  const { data, error } = await query.limit(300);
  const rows = (data ?? []) as Fornecedor[];

  const totalGeral = rows.reduce((s, r) => s + (r.total_geral ?? 0), 0);
  const totalAlmg = rows.reduce((s, r) => s + (r.total_almg ?? 0), 0);
  const em3Casas = rows.filter((r) => r.n_casas === 3).length;

  return (
    <>
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
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
              ALMG
            </Link>
            <span>/</span>
            <span>Cruzamento</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
              Fornecedores em comum
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
              ALMG × Câmara × ALESP
            </span>
          </div>

          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
              margin: "0.5rem 0 0",
              maxWidth: "640px",
              lineHeight: 1.6,
            }}
          >
            CNPJs que receberam verbas parlamentares da ALMG e de pelo menos uma outra
            casa legislativa. Cruzamento por CNPJ exato — o mesmo fornecedor em Minas
            Gerais, São Paulo e Brasília.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>

        {/* ── KPIs ─────────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="CNPJs cruzados" value={fmtNum(rows.length)} sub="no filtro atual" />
          <Kpi label="Total cruzado" value={fmtBRL(totalGeral)} sub="soma todas as casas" />
          <Kpi label="Total via ALMG" value={fmtBRL(totalAlmg)} sub="parcela mineira" />
          <Kpi
            label="Nas 3 casas"
            value={fmtNum(em3Casas)}
            sub="ALMG + Câmara + ALESP"
          />
        </div>

        {/* ── Filtros ───────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {(["todos", "3-casas", "almg-camara", "almg-alesp"] as Filtro[]).map((f) => (
            <Link
              key={f}
              href={f === "todos" ? "/cruzamento" : `/cruzamento?filtro=${f}`}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: filtro === f ? 700 : 400,
                border: `1px solid ${filtro === f ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                borderRadius: "4px",
                color: filtro === f ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: filtro === f ? "hsl(var(--primary) / 0.08)" : "transparent",
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
              }}
            >
              {FILTRO_LABELS[f]}
            </Link>
          ))}
        </div>

        {/* ── Nota metodológica ──────────────────────────────────────────────── */}
        <div
          className="bloomberg-card"
          style={{ marginBottom: "1.25rem", padding: "0.875rem 1rem" }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              color: "hsl(var(--text-body))",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "hsl(var(--text-headline))" }}>Metodologia:</strong>{" "}
            cruzamento por CNPJ exato. ALMG 2025–2026 (14 meses de histórico) ·
            CEAP Câmara 2019–2026 · ALESP 2002–2026.
            Valores em R$ nominais — períodos distintos, comparação qualitativa.
            Telecom (Vivo, TIM, Claro), viagens (TAM, Gol, Latam) e publicidade digital
            (Facebook/Meta, Google) são esperados em múltiplas casas.
            Foque em fornecedores regionais com alto volume concentrado em poucos deputados.
          </p>
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────── */}
        {error ? (
          <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
            Erro ao carregar dados: {error.message}
          </p>
        ) : (
          <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                  <th>Fornecedor</th>
                  <th style={{ textAlign: "center" }}>Casas</th>
                  <th style={{ textAlign: "right" }}>ALMG</th>
                  <th style={{ textAlign: "right" }}>ALESP</th>
                  <th style={{ textAlign: "right" }}>Câmara</th>
                  <th style={{ textAlign: "right" }}>Total geral</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ textAlign: "center", padding: "2rem", color: "hsl(var(--text-caption))" }}
                    >
                      Nenhum fornecedor no filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const pct =
                      rows[0]?.total_geral > 0
                        ? (r.total_geral / rows[0].total_geral) * 100
                        : 0;

                    return (
                      <tr key={r.cnpj}>
                        {/* # */}
                        <td
                          style={{
                            color: "hsl(var(--text-caption))",
                            fontVariantNumeric: "tabular-nums",
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}
                        >
                          {idx + 1}
                        </td>

                        {/* Fornecedor */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            <div
                              style={{
                                width: "2.5rem",
                                height: "3px",
                                borderRadius: "2px",
                                backgroundColor: "hsl(var(--border))",
                                flexShrink: 0,
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct.toFixed(1)}%`,
                                  height: "100%",
                                  borderRadius: "2px",
                                  backgroundColor:
                                    r.n_casas === 3
                                      ? "hsl(var(--badge-danger-fg))"
                                      : "hsl(var(--accent))",
                                }}
                              />
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: 600,
                                  color: "hsl(var(--text-headline))",
                                }}
                              >
                                {r.nome}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.6875rem",
                                  color: "hsl(var(--text-caption))",
                                  fontFamily: "var(--font-mono)",
                                  marginTop: "0.125rem",
                                }}
                              >
                                {fmtCNPJ(r.cnpj)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Badges */}
                        <td style={{ textAlign: "center" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.25rem",
                              justifyContent: "center",
                            }}
                          >
                            <span className="badge-success" style={{ fontSize: "0.5625rem", padding: "0.1rem 0.35rem" }}>
                              MG
                            </span>
                            {r.em_alesp && (
                              <span className="badge-neutral" style={{ fontSize: "0.5625rem", padding: "0.1rem 0.35rem" }}>
                                SP
                              </span>
                            )}
                            {r.em_camara && (
                              <span className="badge-warn" style={{ fontSize: "0.5625rem", padding: "0.1rem 0.35rem" }}>
                                FED
                              </span>
                            )}
                          </div>
                        </td>

                        {/* ALMG */}
                        <td style={{ textAlign: "right" }}>
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                                fontSize: "0.875rem",
                                color: "hsl(var(--text-headline))",
                              }}
                            >
                              {fmtBRL(r.total_almg)}
                            </div>
                            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>
                              {fmtNum(r.notas_almg)} notas · {fmtNum(r.deps_almg)} dep.
                            </div>
                          </div>
                        </td>

                        {/* ALESP */}
                        <td style={{ textAlign: "right" }}>
                          {r.em_alesp ? (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontVariantNumeric: "tabular-nums",
                                  fontSize: "0.875rem",
                                  color: "hsl(var(--text-headline))",
                                }}
                              >
                                {fmtBRL(r.total_alesp)}
                              </div>
                              <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>
                                {fmtNum(r.notas_alesp)} notas · {fmtNum(r.deps_alesp)} dep.
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "hsl(var(--text-caption))" }}>—</span>
                          )}
                        </td>

                        {/* Câmara */}
                        <td style={{ textAlign: "right" }}>
                          {r.em_camara ? (
                            <div>
                              <div
                                style={{
                                  fontWeight: 700,
                                  fontVariantNumeric: "tabular-nums",
                                  fontSize: "0.875rem",
                                  color: "hsl(var(--text-headline))",
                                }}
                              >
                                {fmtBRL(r.total_camara)}
                              </div>
                              <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>
                                {fmtNum(r.notas_camara)} notas · {fmtNum(r.deps_camara)} dep.
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "hsl(var(--text-caption))" }}>—</span>
                          )}
                        </td>

                        {/* Total geral */}
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 700,
                            fontVariantNumeric: "tabular-nums",
                            color:
                              r.n_casas === 3
                                ? "hsl(var(--badge-danger-fg))"
                                : "hsl(var(--text-headline))",
                          }}
                        >
                          {fmtBRL(r.total_geral)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Rodapé ─────────────────────────────────────────────────────── */}
        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1rem",
            lineHeight: 1.6,
          }}
        >
          Fonte: ALMG (HTML 2025–2026) · CEAP Câmara Federal (2019–2026) ·
          ALESP (XML, 2002–2026). Cruzamento por CNPJ exato. Valores em R$ nominais.
          Atualizado mensalmente via GitHub Actions. Exibindo até 300 fornecedores por filtro,
          ordenados por total geral decrescente.
        </p>
      </div>
    </>
  );
}

// ── Primitivas ─────────────────────────────────────────────────────────────

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
      {sub && (
        <div
          style={{
            fontSize: "0.6875rem",
            color: "hsl(var(--text-caption))",
            fontFamily: "var(--font-sans)",
            marginTop: "0.25rem",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
