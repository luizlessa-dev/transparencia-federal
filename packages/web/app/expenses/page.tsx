import Link from "next/link";
import { getDespesasRanking, getDespesasFiltrosDisponiveis } from "~/services/despesas";


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

const ANOS = [2026, 2025, 2024, 2023];

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function generateMetadata() {
  return {
    title: "Despesas de Gabinete — Câmara dos Deputados — The BR Insider",
    description:
      "Ranking dos deputados federais com maiores gastos da CEAP (Cota para Exercício da Atividade Parlamentar). Dados de 2023 a 2026.",
  };
}

export default async function ExpensesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ano = ANOS.includes(Number(sp.ano)) ? Number(sp.ano) : 2025;
  const page = Math.max(1, Number(sp.page ?? 1));
  const PER_PAGE = 50;
  const search = sp.search?.trim() || undefined;
  const partido = sp.partido?.trim().toUpperCase() || undefined;
  const uf = sp.uf?.trim().toUpperCase() || undefined;

  const [{ data, total }, filtros] = await Promise.all([
    getDespesasRanking(ano, page, PER_PAGE, { search, partido, uf }),
    getDespesasFiltrosDisponiveis(ano),
  ]);
  const totalPages = Math.ceil(total / PER_PAGE);
  const temFiltro = !!(search || partido || uf);

  // Constrói URL preservando filtros, sobrescrevendo overrides
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
    return `/expenses?${params}`;
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
      {/* Cabeçalho */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>CEAP — Câmara dos Deputados</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginLeft: "calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Cota para Exercício da Atividade Parlamentar · {fmtN(total)} deputados ·{" "}
            <Link href="/senate-expenses" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 500 }}>
              ver CEAP do Senado →
            </Link>
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* Barra unificada de filtros (form GET — server-side) */}
        <form
          action="/expenses"
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
          {/* Busca por nome */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 0.5rem", minWidth: 0 }}>
            <span style={{ fontSize: "1rem", color: "hsl(var(--text-caption))" }} aria-hidden="true">🔎</span>
            <input
              type="search"
              name="search"
              defaultValue={search ?? ""}
              placeholder="Buscar por nome (ex.: Erika Hilton, Lira)"
              aria-label="Buscar deputado por nome"
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

          {/* Ano */}
          <select
            name="ano"
            defaultValue={String(ano)}
            aria-label="Filtrar por ano"
            style={selectStyle}
          >
            {ANOS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Partido */}
          <select
            name="partido"
            defaultValue={partido ?? ""}
            aria-label="Filtrar por partido"
            style={selectStyle}
          >
            <option value="">Todos partidos</option>
            {filtros.partidos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          {/* UF */}
          <select
            name="uf"
            defaultValue={uf ?? ""}
            aria-label="Filtrar por estado"
            style={selectStyle}
          >
            <option value="">Todas UFs</option>
            {filtros.ufs.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <button type="submit" style={btnPrimary}>Filtrar</button>

          {temFiltro ? (
            <Link href={`/expenses?ano=${ano}`} style={btnSecondary}>Limpar</Link>
          ) : (
            <span />
          )}
        </form>

        {/* Contador de resultados quando filtrado */}
        {temFiltro && (
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            Mostrando <strong style={{ color: "hsl(var(--text-headline))" }}>{fmtN(total)}</strong>{" "}
            {total === 1 ? "deputado" : "deputados"} com{" "}
            {[
              search && <>nome contém <strong key="s" style={{ color: "hsl(var(--text-headline))" }}>"{search}"</strong></>,
              partido && <>partido <strong key="p" style={{ color: "hsl(var(--text-headline))" }}>{partido}</strong></>,
              uf && <>UF <strong key="u" style={{ color: "hsl(var(--text-headline))" }}>{uf}</strong></>,
            ].filter(Boolean).reduce((acc: React.ReactNode[], curr, idx, arr) => {
              if (idx === 0) return [curr];
              if (idx === arr.length - 1) return [...acc, " e ", curr];
              return [...acc, ", ", curr];
            }, [])}
            .
          </p>
        )}

        {/* Tabela */}
        <div style={{ overflowX: "auto" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "3.5rem" }}>#</th>
                <th>Deputado</th>
                <th style={{ textAlign: "right" }}>Total Líquido</th>
                <th style={{ textAlign: "right" }}>Documentos</th>
                <th style={{ textAlign: "right" }}>Maior Categoria</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--text-caption))" }}>
                    {temFiltro
                      ? `Nenhum deputado encontrado com esses filtros em ${ano}.`
                      : `Nenhum dado disponível para ${ano}. Execute a ingestão CEAP.`}
                  </td>
                </tr>
              ) : (
                data.map((entry) => {
                  const dep = entry.deputados_brutas;
                  const nome = dep?.nome ?? entry.deputado_id_externo;
                  const partido = dep?.sigla_partido ?? "—";
                  const uf = dep?.sigla_uf ?? "—";

                  // Categoria com maior gasto
                  const cats = entry.por_categoria ?? {};
                  const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
                  const maiorCat = catEntries[0];

                  return (
                    <tr key={entry.deputado_id_externo}>
                      <td style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                        {entry.posicao}
                      </td>
                      <td>
                        <Link
                          href={`/expenses/${entry.deputado_id_externo}`}
                          style={{ fontWeight: 600, color: "hsl(var(--text-headline))", textDecoration: "none", fontSize: "0.875rem" }}
                        >
                          {nome}
                        </Link>
                        <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginTop: "0.125rem" }}>
                          {partido} · {uf}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.875rem" }}>
                        {fmtBRL(entry.total_liquido)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))", fontSize: "0.8125rem" }}>
                        {fmtN(entry.total_documentos)}
                      </td>
                      <td style={{ textAlign: "right", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {maiorCat ? (
                          <span title={`${fmtBRL(maiorCat[1])}`}>
                            {maiorCat[0].split(" ").slice(0, 2).join(" ")}
                          </span>
                        ) : "—"}
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
              <Link
                href={buildUrl({ page: String(page - 1) })}
                style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}
              >
                ← Anterior
              </Link>
            )}
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", padding: "0 0.5rem" }}>
              {page} / {totalPages} · {fmtN(total)} {total === 1 ? "deputado" : "deputados"}
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}
              >
                Próxima →
              </Link>
            )}
          </div>
        )}

        {/* Nota metodológica */}
        <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)", lineHeight: 1.6 }}>
            <strong style={{ color: "hsl(var(--text-body))" }}>Nota:</strong> Dados da CEAP (Cota para Exercício da Atividade Parlamentar) —
            recurso mensal disponibilizado a deputados federais para custeio de atividades parlamentares.
            Fonte: <a href="https://dadosabertos.camara.leg.br/api/v2/deputados" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(var(--primary))" }}>API da Câmara dos Deputados</a>.
            Valores em reais (R$), liquidados conforme documentos fiscais apresentados.
          </p>
        </div>
      </div>
    </>
  );
}
