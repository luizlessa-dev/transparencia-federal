import Link from "next/link";
import {
  getCeapsSenadorListing,
  getCeapsSenadorStats,
  getCeapsSenadoFiltros,
  ANOS_CEAPS_SENADO,
} from "~/services/ceaps-senado";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    ano?: string;
    page?: string;
    search?: string;
    partido?: string;
    uf?: string;
  }>;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function generateMetadata() {
  return {
    title: "CEAP — Despesas dos Senadores — The BR Insider",
    description: "Ranking de gastos com a Cota para o Exercício da Atividade Parlamentar dos Senadores. Dados de 2019 a 2026, com busca por nome e filtros de partido e UF.",
  };
}

export default async function SenateExpensesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ano = ANOS_CEAPS_SENADO.includes(Number(sp.ano)) ? Number(sp.ano) : 2025;
  const page = Math.max(1, Number(sp.page ?? 1));
  const PER_PAGE = 50;
  const search = sp.search?.trim() || undefined;
  const partido = sp.partido?.trim().toUpperCase() || undefined;
  const uf = sp.uf?.trim().toUpperCase() || undefined;
  const temFiltro = !!(search || partido || uf);

  const [{ data, total }, stats, filtros] = await Promise.all([
    getCeapsSenadorListing(ano, page, PER_PAGE, { search, partido, uf }),
    getCeapsSenadorStats(ano),
    getCeapsSenadoFiltros(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    params.set("ano", String(ano));
    if (search) params.set("search", search);
    if (partido) params.set("partido", partido);
    if (uf) params.set("uf", uf);
    params.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") params.delete(k);
      else params.set(k, v);
    }
    return `/senate-expenses?${params}`;
  }

  const selectStyle: React.CSSProperties = {
    padding: "0.5rem 0.625rem",
    fontSize: "0.8125rem",
    fontFamily: "var(--font-sans)",
    color: "hsl(var(--text-headline))",
    backgroundColor: "hsl(var(--surface))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "2px",
    cursor: "pointer",
    minWidth: "8rem",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "0.5rem 1rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "hsl(var(--primary-foreground))",
    backgroundColor: "hsl(var(--primary))",
    border: "none",
    borderRadius: "2px",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
  };

  const btnSecondary: React.CSSProperties = {
    padding: "0.5rem 0.875rem",
    fontSize: "0.75rem",
    color: "hsl(var(--text-body))",
    backgroundColor: "transparent",
    border: "1px solid hsl(var(--border))",
    borderRadius: "2px",
    textDecoration: "none",
    fontFamily: "var(--font-sans)",
    display: "inline-block",
  };

  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>CEAP — Senado Federal</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginLeft: "calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Cota para Exercício da Atividade Parlamentar dos Senadores · {ano} · {fmtN(total)} senadores ·{" "}
            <Link href="/expenses" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 500 }}>
              ver CEAP da Câmara →
            </Link>
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* KPIs */}
        {stats && (
          <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Total Reembolsado</div>
              <div className="bloomberg-kpi-value">{fmtBRL(stats.total_reembolsado)}</div>
              <div className="bloomberg-kpi-sub">{fmtN(stats.total_senadores)} senadores · {ano}</div>
            </div>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Média por Senador</div>
              <div className="bloomberg-kpi-value">{fmtBRL(stats.media_reembolsado)}</div>
              <div className="bloomberg-kpi-sub">Valor anual</div>
            </div>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Categoria Líder</div>
              <div className="bloomberg-kpi-value" style={{ fontSize: "0.875rem", lineHeight: 1.3 }}>
                {stats.tipo_mais_comum.split(",")[0].trim().slice(0, 40)}
              </div>
              <div className="bloomberg-kpi-sub">Por valor total gasto</div>
            </div>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Limite Mensal CEAPS</div>
              <div className="bloomberg-kpi-value">R$ 45.612</div>
              <div className="bloomberg-kpi-sub">Por senador · 2024</div>
            </div>
          </div>
        )}

        {/* Barra unificada de filtros (form GET — server-side) */}
        <form
          action="/senate-expenses"
          method="GET"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto auto auto auto",
            gap: "0.5rem",
            alignItems: "center",
            padding: "0.5rem",
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "2px",
            marginBottom: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 0.5rem", minWidth: 0 }}>
            <span style={{ fontSize: "1rem", color: "hsl(var(--text-caption))" }} aria-hidden="true">🔎</span>
            <input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Buscar senador por nome (ex.: Renan, Gleisi, Otto)"
              aria-label="Buscar senador por nome"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.875rem",
                color: "hsl(var(--text-headline))",
                padding: "0.5rem 0",
                fontFamily: "var(--font-sans)",
              }}
            />
          </div>

          <select name="ano" defaultValue={String(ano)} aria-label="Filtrar por ano" style={selectStyle}>
            {ANOS_CEAPS_SENADO.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select name="partido" defaultValue={partido ?? ""} aria-label="Filtrar por partido" style={selectStyle}>
            <option value="">Todos partidos</option>
            {filtros.partidos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select name="uf" defaultValue={uf ?? ""} aria-label="Filtrar por estado" style={selectStyle}>
            <option value="">Todas UFs</option>
            {filtros.ufs.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <button type="submit" style={btnPrimary}>Filtrar</button>

          {temFiltro ? (
            <Link href={`/senate-expenses?ano=${ano}`} style={btnSecondary}>Limpar</Link>
          ) : (
            <span />
          )}
        </form>

        {temFiltro && (
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            Mostrando <strong style={{ color: "hsl(var(--text-headline))" }}>{fmtN(total)}</strong>{" "}
            {total === 1 ? "senador" : "senadores"} com filtros aplicados.
          </p>
        )}

        {/* Tabela */}
        <div style={{ overflowX: "auto" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                <th>Senador</th>
                <th style={{ textAlign: "right" }}>Total Reembolsado</th>
                <th style={{ textAlign: "right" }}>Documentos</th>
                <th style={{ textAlign: "right" }}>Média/Doc</th>
                <th style={{ width: "2rem" }} />
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--text-caption))" }}>
                    {temFiltro
                      ? `Nenhum senador encontrado com esses filtros em ${ano}.`
                      : `Dados de ${ano} ainda não disponíveis ou sendo processados.`}
                  </td>
                </tr>
              ) : (
                data.map((s, i) => {
                  const mediaDocs = s.total_documentos > 0 ? s.total_reembolsado / s.total_documentos : 0;
                  const slug = encodeURIComponent(s.senador_normalizado);
                  const href = `/senate-expenses/${slug}?ano=${ano}`;
                  const link = {
                    display: "block",
                    width: "100%",
                    color: "inherit",
                    textDecoration: "none",
                  } as const;
                  return (
                    <tr key={s.senador_normalizado} style={{ cursor: "pointer" }}>
                      <td style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", fontSize: "0.75rem", textAlign: "center" }}>
                        <Link href={href} style={link}>{s.posicao ?? ((page - 1) * PER_PAGE + i + 1)}</Link>
                      </td>
                      <td>
                        <Link href={href} style={{ ...link, color: "inherit" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            {s.foto_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.foto_url}
                                alt={s.senador}
                                width={28}
                                height={28}
                                loading="lazy"
                                style={{
                                  width: "28px",
                                  height: "28px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  border: "1px solid hsl(var(--border))",
                                }}
                              />
                            ) : (
                              <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "hsl(var(--muted))", flexShrink: 0 }} />
                            )}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.875rem" }}>
                                {s.senador}
                              </div>
                              {(s.sigla_partido || s.sigla_uf) && (
                                <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginTop: "0.125rem" }}>
                                  {[s.sigla_partido, s.sigla_uf].filter(Boolean).join(" · ")}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.875rem", fontVariantNumeric: "tabular-nums" }}>
                        <Link href={href} style={link}>{fmtBRL(s.total_reembolsado)}</Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-body))", fontVariantNumeric: "tabular-nums" }}>
                        <Link href={href} style={link}>{fmtN(s.total_documentos)}</Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>
                        <Link href={href} style={link}>{fmtBRL(mediaDocs)}</Link>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link href={href} style={{ color: "hsl(var(--primary))", fontWeight: 600, fontSize: "0.875rem", textDecoration: "none" }}>
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })}
                style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                ← Anterior
              </Link>
            )}
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", padding: "0 0.5rem" }}>
              {fmtN((page - 1) * PER_PAGE + 1)}–{fmtN(Math.min(page * PER_PAGE, total))} de {fmtN(total)}
            </span>
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })}
                style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                Próxima →
              </Link>
            )}
          </div>
        )}

        {/* Nota */}
        <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: 0, fontFamily: "var(--font-sans)" }}>
            <strong style={{ color: "hsl(var(--text-headline))" }}>Sobre a CEAPS:</strong>{" "}
            Cota parlamentar usada pelos 81 senadores para gastos com passagens aéreas, hospedagem, combustível,
            aluguel de escritórios, contratação de serviços e divulgação parlamentar.
            Dados oficiais do{" "}
            <strong>Senado Federal</strong> via{" "}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>senado.leg.br/transparencia/LAI/verba/</span>.
          </p>
        </div>
      </div>
    </>
  );
}
