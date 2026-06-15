/**
 * Viagens de servidores federais — Portal da Transparência.
 * Rota: /viagens
 * Dados: 8.290 viagens, R$ 32 mi
 */
import type { Metadata } from "next";
import { getViagens, getViagensResumo } from "~/services/viagens";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Viagens de Servidores Federais | The BR Insider",
  description:
    "8.290 viagens de servidores e autoridades federais com destinos, valores de diárias e passagens. Inclui ministros, presidentes de autarquias e militares.",
  alternates: { canonical: "https://www.thebrinsider.com/viagens" },
  openGraph: {
    title: "Viagens de Servidores Federais | The BR Insider",
    description:
      "R$ 32 milhões em viagens de autoridades e servidores federais — diárias, passagens e motivos de cada missão.",
    url: "https://www.thebrinsider.com/viagens",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

interface Props {
  searchParams: Promise<{ q?: string; orgao?: string; ano?: string; page?: string }>;
}

const PER_PAGE = 30;

function fmtBRL(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (!isFinite(n) || n === 0) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtData(s: string | null) {
  if (!s) return "—";
  const [ano, mes, dia] = s.split("-");
  return `${dia}/${mes}/${ano.slice(2)}`;
}

function buildUrl(base: Record<string, string | undefined>, override: Record<string, string | undefined>) {
  const merged = { ...base, ...override };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/viagens${qs ? `?${qs}` : ""}`;
}

export default async function ViagensPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const orgao = sp.orgao?.trim() ?? "";
  const ano = sp.ano ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));

  const viewer = await getViewer();
  const showWall = !viewer?.pago && page > 1;

  const currentParams: Record<string, string | undefined> = {
    q: q || undefined,
    orgao: orgao || undefined,
    ano: ano || undefined,
  };

  const [resumo, { data, count, error }] = await Promise.all([
    page === 1 ? getViagensResumo() : Promise.resolve({ total: 0, totalDiarias: 0, totalPassagens: 0, count: 0 }),
    getViagens(page, PER_PAGE, { q, orgao, ano }),
  ]);

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);
  const rows = data ?? [];

  const anos = Array.from({ length: new Date().getFullYear() - 2022 }, (_, i) => 2023 + i).reverse();

  return (
    <>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem 2rem", maxWidth: "960px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--accent))" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--accent))", fontFamily: "var(--font-sans)" }}>
              Governo Federal · Portal da Transparência
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", margin: "0 0 1rem", lineHeight: 1.1 }}>
            Viagens de{" "}
            <span style={{ color: "hsl(var(--accent))" }}>Servidores Federais</span>
          </h1>
          <p style={{ fontSize: "1rem", lineHeight: 1.6, color: "hsl(var(--text-body))", maxWidth: "640px", margin: 0 }}>
            Missões, destinos, diárias e passagens de ministros, presidentes de
            autarquias e servidores do governo federal. Dados do Portal da
            Transparência — viagens a serviço do Estado.
          </p>
        </div>
      </section>

      {/* KPIs — só na primeira página */}
      {page === 1 && (
        <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <div className="container bloomberg-kpi-grid" style={{ padding: "1.5rem", maxWidth: "960px" }}>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">Viagens registradas</span>
              <span className="bloomberg-kpi__value">{resumo.count.toLocaleString("pt-BR")}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">Total gasto</span>
              <span className="bloomberg-kpi__value">{fmtBRL(resumo.total)}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">Em diárias</span>
              <span className="bloomberg-kpi__value">{fmtBRL(resumo.totalDiarias)}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi__label">Em passagens</span>
              <span className="bloomberg-kpi__value">{fmtBRL(resumo.totalPassagens)}</span>
            </div>
          </div>
        </section>
      )}

      {/* Filtros */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "1rem 1.5rem", maxWidth: "960px" }}>
          <form method="get" action="/viagens" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar servidor, órgão ou motivo…"
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
            <input
              name="orgao"
              defaultValue={orgao}
              placeholder="Sigla do órgão (ex: MF)"
              style={{
                flex: "0 1 140px",
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
              {anos.map((a) => <option key={a} value={String(a)}>{a}</option>)}
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
            {(q || orgao || ano) && (
              <a href="/viagens" style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", textDecoration: "underline" }}>
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
            <p style={{ color: "hsl(var(--text-caption))" }}>Nenhuma viagem encontrada com esses filtros.</p>
          )}
          {rows.length > 0 && (
            <>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem" }}>
                {total.toLocaleString("pt-BR")} viagens
                {q && <> para "<strong>{q}</strong>"</>}
                {" "}— página {page} de {totalPages}
              </p>
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ width: "100%", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>Servidor / Cargo</th>
                      <th style={{ textAlign: "left" }}>Órgão</th>
                      <th style={{ textAlign: "left" }}>Período</th>
                      <th style={{ textAlign: "left" }}>Tipo</th>
                      <th style={{ textAlign: "right" }}>Diárias</th>
                      <th style={{ textAlign: "right" }}>Passagens</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id_portal}>
                        <td>
                          <div style={{ fontWeight: 600, color: "hsl(var(--text-headline))" }}>
                            {row.nome_beneficiario ?? "—"}
                          </div>
                          {row.cargo && (
                            <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{row.cargo}</div>
                          )}
                        </td>
                        <td>
                          <span style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "0.125rem 0.375rem",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "3px",
                            color: "hsl(var(--text-body))",
                            whiteSpace: "nowrap",
                          }}>
                            {row.orgao_sigla ?? "—"}
                          </span>
                        </td>
                        <td style={{ color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtData(row.data_inicio)} → {fmtData(row.data_fim)}
                        </td>
                        <td style={{ color: "hsl(var(--text-body))", whiteSpace: "nowrap" }}>
                          {row.tipo_viagem ?? "—"}
                          {row.urgente && (
                            <span className="badge-danger" style={{ marginLeft: "0.25rem", fontSize: "0.6875rem" }}>URGENTE</span>
                          )}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtBRL(row.valor_diarias)}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                          {fmtBRL(row.valor_passagens)}
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
