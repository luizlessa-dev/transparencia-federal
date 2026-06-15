/**
 * Despesas de gabinete — Assembleia Legislativa de Santa Catarina (ALESC).
 * Rota: /alesc
 * Dados: 41 deputados, 224.399 despesas, ~R$ 203 mi
 */
import type { Metadata } from "next";
import { getAlescDeputados, getAlescDespesas } from "~/services/assembleias";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ALESC — Despesas de Gabinete | The BR Insider",
  description:
    "224 mil despesas de verba indenizatória dos 41 deputados da Assembleia Legislativa de Santa Catarina. R$ 203 milhões em reembolsos catalogados.",
  alternates: { canonical: "https://www.thebrinsider.com/alesc" },
  openGraph: {
    title: "ALESC — Despesas de Gabinete | The BR Insider",
    description:
      "224 mil notas de verba indenizatória dos deputados catarinenses — favorecidos, valores e categorias.",
    url: "https://www.thebrinsider.com/alesc",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

interface Props {
  searchParams: Promise<{ q?: string; ano?: string; page?: string }>;
}

const PER_PAGE = 30;

function fmtBRL(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtMes(mes: number) {
  return String(mes).padStart(2, "0");
}

function buildUrl(base: Record<string, string | undefined>, override: Record<string, string | undefined>) {
  const merged = { ...base, ...override };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/alesc${qs ? `?${qs}` : ""}`;
}

export default async function AlescPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const ano = sp.ano ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const viewer = await getViewer();

  const currentParams: Record<string, string | undefined> = {
    q: q || undefined,
    ano: ano || undefined,
  };

  const [{ data: deputados }, { data, count, error }] = await Promise.all([
    getAlescDeputados(),
    getAlescDespesas(page, PER_PAGE, { q, ano }),
  ]);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const rows = data ?? [];

  // Paywall: free = primeiras 30 linhas (1 página), assinantes veem tudo
  const showWall = !viewer?.pago && page > 1;

  const anos = Array.from({ length: new Date().getFullYear() - 2019 }, (_, i) => 2020 + i).reverse();

  return (
    <>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem 2rem", maxWidth: "960px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--accent))" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--accent))", fontFamily: "var(--font-sans)" }}>
              Assembleia Legislativa · Santa Catarina
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", margin: "0 0 1rem", lineHeight: 1.1 }}>
            ALESC — <span style={{ color: "hsl(var(--accent))" }}>Despesas de Gabinete</span>
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "hsl(var(--text-body))", maxWidth: "640px", margin: 0 }}>
            <strong style={{ color: "hsl(var(--text-headline))" }}>224.399 despesas</strong>{" "}
            de verba indenizatória dos <strong style={{ color: "hsl(var(--text-headline))" }}>41 deputados</strong> da
            Assembleia Legislativa de Santa Catarina — favorecidos, categorias e valores.
            Total reembolsado:{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>R$ 203 milhões</strong>.
          </p>
        </div>
      </section>

      {/* KPIs */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container bloomberg-kpi-grid" style={{ padding: "1.5rem", maxWidth: "960px" }}>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi__label">Despesas</span>
            <span className="bloomberg-kpi__value">224.399</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi__label">Total reembolsado</span>
            <span className="bloomberg-kpi__value">R$ 203 mi</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi__label">Deputados</span>
            <span className="bloomberg-kpi__value">{deputados?.length ?? 41}</span>
          </div>
        </div>
      </section>

      {/* Filtros */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "1rem 1.5rem", maxWidth: "960px" }}>
          <form method="get" action="/alesc" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar deputado, favorecido…"
              style={{
                flex: "1 1 240px",
                padding: "0.5rem 0.75rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--text-headline))",
              }}
            />
            <select
              name="ano"
              defaultValue={ano}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "4px",
                fontSize: "0.875rem",
                backgroundColor: "hsl(var(--background))",
                color: "hsl(var(--text-headline))",
              }}
            >
              <option value="">Todos os anos</option>
              {anos.map((a) => (
                <option key={a} value={String(a)}>{a}</option>
              ))}
            </select>
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
              Filtrar
            </button>
            {(q || ano) && (
              <a href="/alesc" style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", textDecoration: "underline" }}>
                Limpar
              </a>
            )}
          </form>
        </div>
      </section>

      {/* Tabela */}
      <section>
        <div className="container" style={{ padding: "1.5rem", maxWidth: "960px" }}>
          {error && (
            <p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro ao carregar dados.</p>
          )}
          {!error && rows.length === 0 && (
            <p style={{ color: "hsl(var(--text-caption))" }}>Nenhuma despesa encontrada com esses filtros.</p>
          )}
          {rows.length > 0 && (
            <>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem" }}>
                {total.toLocaleString("pt-BR")} despesas encontradas
                {q && <> para "<strong>{q}</strong>"</>}
                {ano && <> em {ano}</>}
                {" "}— página {page} de {totalPages}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ width: "100%", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Deputado</th>
                      <th style={{ textAlign: "left" }}>Período</th>
                      <th style={{ textAlign: "left" }}>Verba</th>
                      <th style={{ textAlign: "left" }}>Favorecido</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td style={{ fontWeight: 600, color: "hsl(var(--text-headline))" }}>{row.nome_deputado}</td>
                        <td style={{ color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtMes(row.mes)}/{row.ano}
                        </td>
                        <td style={{ color: "hsl(var(--text-body))", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.verba ?? "—"}
                        </td>
                        <td style={{ color: "hsl(var(--text-body))", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {row.favorecido ?? "—"}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "hsl(var(--text-headline))", whiteSpace: "nowrap" }}>
                          {fmtBRL(row.valor)}
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
