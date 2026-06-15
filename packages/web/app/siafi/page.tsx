/**
 * Maiores favorecidos SIAFI — pagamentos diretos do Tesouro Nacional.
 * Rota: /siafi
 * Dados: 413k CNPJs únicos, R$ 491 bilhões em pagamentos
 */
import type { Metadata } from "next";
import { getSiafiFornecedores, getSiafiStats } from "~/services/siafi";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Maiores Favorecidos SIAFI — Tesouro Nacional | The BR Insider",
  description:
    "413 mil CNPJs com pagamentos diretos do Tesouro Nacional via SIAFI. R$ 491 bilhões em empenhos e liquidações catalogados por fornecedor.",
  alternates: { canonical: "https://www.thebrinsider.com/siafi" },
  openGraph: {
    title: "Maiores Favorecidos SIAFI | The BR Insider",
    description:
      "413k fornecedores, R$ 491 bilhões em pagamentos federais — do Banco do Brasil ao menor prestador de serviços.",
    url: "https://www.thebrinsider.com/siafi",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

interface Props {
  searchParams: Promise<{ q?: string; page?: string }>;
}

const PER_PAGE = 50;

function fmtBRL(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (!isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(v: number | string | null | undefined) {
  return new Intl.NumberFormat("pt-BR").format(Number(v ?? 0));
}

function fmtCnpj(s: string) {
  if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return s;
}

function fmtData(s: string | null) {
  if (!s) return "—";
  const [ano, mes, dia] = s.split("-");
  return `${dia}/${mes}/${ano}`;
}

function buildUrl(base: Record<string, string | undefined>, override: Record<string, string | undefined>) {
  const merged = { ...base, ...override };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/siafi${qs ? `?${qs}` : ""}`;
}

export default async function SiafiPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const viewer = await getViewer();
  const showWall = !viewer?.pago && page > 1;

  const currentParams: Record<string, string | undefined> = {
    q: q || undefined,
  };

  const [stats, { data, count, error }] = await Promise.all([
    page === 1 ? getSiafiStats() : Promise.resolve({ totalCnpjs: 0, totalPagamentos: 0, somaBrl: 0 }),
    getSiafiFornecedores(page, PER_PAGE, { q }),
  ]);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const rows = data ?? [];

  return (
    <>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem 2rem", maxWidth: "960px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--accent))" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--accent))", fontFamily: "var(--font-sans)" }}>
              Tesouro Nacional · SIAFI
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", margin: "0 0 1rem", lineHeight: 1.1 }}>
            Maiores Favorecidos{" "}
            <span style={{ color: "hsl(var(--accent))" }}>SIAFI</span>
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "hsl(var(--text-body))", maxWidth: "640px", margin: 0 }}>
            Pagamentos diretos do Tesouro Nacional catalogados por CNPJ — do Banco
            do Brasil ao menor prestador de serviços. Base{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>SIAFI</strong>{" "}
            com{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>2,5 milhões de registros</strong>{" "}
            de liquidação e pagamento.
          </p>
        </div>
      </section>

      {/* KPIs */}
      {page === 1 && (
        <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <div className="container bloomberg-kpi-grid" style={{ padding: "1.5rem", maxWidth: "960px" }}>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">CNPJs únicos</span>
              <span className="bloomberg-kpi__value">{fmtNum(stats.totalCnpjs)}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">Pagamentos</span>
              <span className="bloomberg-kpi__value">{fmtNum(stats.totalPagamentos)}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">Volume total</span>
              <span className="bloomberg-kpi__value">{fmtBRL(stats.somaBrl)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Busca */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "1rem 1.5rem", maxWidth: "960px" }}>
          <form method="get" action="/siafi" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por CNPJ ou razão social…"
              style={{
                flex: "1 1 280px",
                padding: "0.5rem 0.75rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--text-headline))",
              }}
            />
            <button
              type="submit"
              style={{
                padding: "0.5rem 1.25rem",
                backgroundColor: "hsl(var(--primary))",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                fontSize: "0.875rem",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Buscar
            </button>
            {q && (
              <a href="/siafi" style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", textDecoration: "underline" }}>
                Limpar
              </a>
            )}
          </form>
        </div>
      </section>

      {/* Tabela */}
      <section>
        <div className="container" style={{ padding: "1.5rem", maxWidth: "960px" }}>
          {error && <p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro ao carregar dados.</p>}
          {!error && rows.length === 0 && (
            <p style={{ color: "hsl(var(--text-caption))" }}>Nenhum favorecido encontrado com esse filtro.</p>
          )}
          {rows.length > 0 && (
            <>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem" }}>
                {total.toLocaleString("pt-BR")} fornecedores
                {q && <> correspondendo a "<strong>{q}</strong>"</>}
                {" "}— página {page} de {totalPages}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ width: "100%", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "right", width: "2.5rem" }}>#</th>
                      <th style={{ textAlign: "left" }}>CNPJ</th>
                      <th style={{ textAlign: "left" }}>Razão Social</th>
                      <th style={{ textAlign: "right" }}>Pagamentos</th>
                      <th style={{ textAlign: "left" }}>1ª aparição</th>
                      <th style={{ textAlign: "right" }}>Total recebido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={`${row.cnpj_favorecido}-${row.nome_favorecido}`}>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>
                          {(page - 1) * PER_PAGE + i + 1}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.75rem", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtCnpj(row.cnpj_favorecido)}
                        </td>
                        <td style={{ fontWeight: 600, color: "hsl(var(--text-headline))", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.nome_favorecido}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtNum(row.n_pagamentos)}
                        </td>
                        <td style={{ color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtData(row.primeira_aparicao)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "hsl(var(--text-headline))", whiteSpace: "nowrap" }}>
                          {fmtBRL(row.valor_total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
                {page > 1 && (
                  <a href={buildUrl(currentParams, { page: String(page - 1) })}
                    style={{ padding: "0.375rem 0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "0.8125rem", color: "hsl(var(--text-body))", textDecoration: "none" }}>
                    ← Anterior
                  </a>
                )}
                <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <a href={buildUrl(currentParams, { page: String(page + 1) })}
                    style={{ padding: "0.375rem 0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "4px", fontSize: "0.8125rem", color: "hsl(var(--text-body))", textDecoration: "none" }}>
                    Próxima →
                  </a>
                )}
              </div>
            </>
          )}

          {showWall && <ParedeDeAcesso />}
        </div>
      </section>
    </>
  );
}
