import Link from "next/link";
import { getRanking, getRankingTotais, getRankingFiltros, getEmendasColetivasAno } from "~/services/ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ranking de Emendas — The BR Insider",
  description:
    "Parlamentares ordenados por valor total de emendas empenhadas no orçamento federal. Busque por nome, filtre por partido e UF, e clique para ver detalhamento por tipo, ano, função e cada emenda individual.",
};

const ANOS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];
const PER_PAGE = 50;

interface SearchParams {
  ano?: string;
  page?: string;
  search?: string;
  partido?: string;
  uf?: string;
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fmtBRLShort(valor: number) {
  if (valor >= 1e9) return `R$ ${(valor / 1e9).toFixed(1)} bi`;
  if (valor >= 1e6) return `R$ ${(valor / 1e6).toFixed(1)} mi`;
  if (valor >= 1e3) return `R$ ${(valor / 1e3).toFixed(0)} mil`;
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

function fmtNum(valor: number) {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
      {sub && <div className="bloomberg-kpi-sub">{sub}</div>}
    </div>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ano = ANOS.includes(Number(params.ano)) ? Number(params.ano) : 2025;
  const page = Math.max(1, Number(params.page ?? 1));
  const search = params.search?.trim() || undefined;
  const partido = params.partido?.trim().toUpperCase() || undefined;
  const uf = params.uf?.trim().toUpperCase() || undefined;
  const temFiltro = !!(search || partido || uf);

  const [{ data, total }, totais, filtros, coletivas] = await Promise.all([
    getRanking(ano, page, PER_PAGE, { search, partido, uf }),
    getRankingTotais(ano, { search, partido, uf }),
    getRankingFiltros(ano),
    getEmendasColetivasAno(ano).catch(() => null),
  ]);
  const totalPages = Math.ceil(total / PER_PAGE);
  const topEmp = totais?.top_empenhado ?? data[0]?.valor_total ?? 1;

  // Mostra faixa quando coletivas representam volume relevante
  // (limiar: ≥ R$ 1bi ou ≥ 100 emendas coletivas no ano)
  const mostrarFaixaColetivas =
    !temFiltro &&
    !!coletivas &&
    (coletivas.total_empenhado >= 1_000_000_000 ||
      coletivas.bancada_qtd + coletivas.comissao_qtd >= 100);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    p.set("ano", String(ano));
    if (search) p.set("search", search);
    if (partido) p.set("partido", partido);
    if (uf) p.set("uf", uf);
    p.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined || v === "") p.delete(k);
      else p.set(k, v);
    }
    return `/ranking?${p}`;
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
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1080px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
              Ranking de Emendas
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
              Câmara + Senado · {ano}
            </span>
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
              margin: "0.5rem 0 0",
              maxWidth: "640px",
            }}
          >
            Parlamentares ordenados pelo valor total empenhado no orçamento federal.
            Clique em qualquer linha para ver detalhamento por tipo, ano, função e cada
            emenda individual. Fonte: Portal da Transparência.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1080px" }}>
        {/* ── Barra unificada de filtros (form GET — server-side) ─── */}
        <form
          action="/ranking"
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
              placeholder="Buscar por nome (ex.: Erika Hilton, Lira, Pacheco)"
              aria-label="Buscar parlamentar por nome"
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
            {ANOS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select name="partido" defaultValue={partido ?? ""} aria-label="Filtrar por partido" style={selectStyle}>
            <option value="">Todos partidos</option>
            {filtros.partidos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <select name="uf" defaultValue={uf ?? ""} aria-label="Filtrar por UF" style={selectStyle}>
            <option value="">Todas UFs</option>
            {filtros.ufs.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          <button type="submit" style={btnPrimary}>Filtrar</button>

          {temFiltro ? (
            <Link href={`/ranking?ano=${ano}`} style={btnSecondary}>Limpar</Link>
          ) : (
            <span />
          )}
        </form>

        {temFiltro && (
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            Mostrando <strong style={{ color: "hsl(var(--text-headline))" }}>{fmtNum(total)}</strong>{" "}
            {total === 1 ? "parlamentar" : "parlamentares"} com filtros aplicados.
          </p>
        )}

        {/* Faixa: emendas coletivas (bancada + comissão) que não entram no ranking individual */}
        {mostrarFaixaColetivas && coletivas && (
          <div
            style={{
              padding: "0.875rem 1.125rem",
              marginBottom: "1.25rem",
              border: "1px solid hsl(var(--border))",
              borderLeft: "3px solid hsl(var(--accent))",
              borderRadius: "2px",
              backgroundColor: "hsl(var(--surface))",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <span style={{ fontSize: "1rem", flexShrink: 0 }} aria-hidden="true">ℹ️</span>
            <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.55, fontFamily: "var(--font-sans)" }}>
              <strong style={{ color: "hsl(var(--text-headline))" }}>
                Em {ano}, {fmtBRLShort(coletivas.total_empenhado)} em emendas foram coletivas
              </strong>{" "}
              ({fmtNum(coletivas.bancada_qtd)} de bancada estadual e {fmtNum(coletivas.comissao_qtd)} de comissão da Câmara).
              Essas emendas não têm autor individual, então não aparecem neste ranking.
              {ano === 2023 && (
                <>
                  {" "}A proporção foi maior em 2023 porque o STF suspendeu o orçamento secreto (RP9) no fim de 2022,
                  deslocando volume pra Bancada/Comissão.
                </>
              )}{" "}
              <Link href={`/amendments?ano=${ano}`} style={{ color: "hsl(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
                Ver todas as emendas de {ano} →
              </Link>
            </div>
          </div>
        )}

        {/* ── KPIs do ano ────────────────────────────────── */}
        {totais && (
          <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
            <Kpi
              label="Total empenhado"
              value={fmtBRLShort(totais.total_empenhado)}
              sub={`${ano}`}
            />
            <Kpi
              label="Total pago"
              value={fmtBRLShort(totais.total_pago)}
              sub={
                totais.total_empenhado > 0
                  ? `${Math.round((totais.total_pago / totais.total_empenhado) * 100)}% executado`
                  : "—"
              }
            />
            <Kpi
              label="Parlamentares"
              value={fmtNum(totais.parlamentares)}
              sub="com emendas no ano"
            />
            <Kpi
              label="Média por parlamentar"
              value={fmtBRLShort(totais.media)}
              sub={`${fmtNum(totais.total_emendas)} emendas`}
            />
          </div>
        )}

        {/* ── Tabela ─────────────────────────────────────── */}
        {data.length === 0 ? (
          <div
            style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              border: "1px dashed hsl(var(--border))",
              borderRadius: "2px",
              color: "hsl(var(--text-caption))",
            }}
          >
            {temFiltro
              ? `Nenhum parlamentar encontrado com esses filtros em ${ano}.`
              : `Sem dados de ranking para ${ano}.`}
          </div>
        ) : (
          <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "2.75rem", textAlign: "center" }}>#</th>
                  <th>Parlamentar</th>
                  <th style={{ textAlign: "right", width: "11rem" }}>Empenhado</th>
                  <th style={{ textAlign: "right", width: "10rem" }}>Pago</th>
                  <th style={{ textAlign: "right", width: "5rem" }}>Exec.</th>
                  <th style={{ textAlign: "right", width: "5rem" }}>Emendas</th>
                  <th style={{ width: "2rem" }} />
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const p = row.parlamentares;
                  const nome = p.nome_parlamentar || p.nome;
                  const pct = topEmp > 0 ? (row.valor_total / topEmp) * 100 : 0;
                  const rankGlobal = (page - 1) * PER_PAGE + idx + 1;
                  const exec = row.metricas.taxa_execucao;
                  const execColor =
                    exec >= 80
                      ? "badge-success"
                      : exec >= 50
                      ? "badge-warn"
                      : "badge-danger";
                  const barColor =
                    rankGlobal === 1
                      ? "hsl(var(--accent))"
                      : rankGlobal <= 5
                      ? "hsl(var(--primary))"
                      : "hsl(var(--text-caption))";
                  const href = `/parlamentares/${p.id}`;
                  const link = {
                    display: "block",
                    width: "100%",
                    color: "inherit",
                    textDecoration: "none",
                  } as const;
                  return (
                    <tr key={p.id} style={{ cursor: "pointer" }}>
                      <td
                        style={{
                          textAlign: "center",
                          color: "hsl(var(--text-caption))",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Link href={href} style={link}>{rankGlobal}</Link>
                      </td>
                      <td>
                        <Link href={href} style={link}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            {p.foto_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.foto_url}
                                alt={nome}
                                width={32}
                                height={32}
                                loading="lazy"
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  objectFit: "cover",
                                  flexShrink: 0,
                                  border: "1px solid hsl(var(--border))",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "50%",
                                  backgroundColor: "hsl(var(--muted))",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "hsl(var(--text-caption))",
                                  flexShrink: 0,
                                }}
                              >
                                {nome.charAt(0)}
                              </div>
                            )}
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  fontSize: "0.875rem",
                                  fontWeight: 600,
                                  color: "hsl(var(--text-headline))",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  maxWidth: "22rem",
                                }}
                              >
                                {nome}
                              </div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.375rem",
                                  marginTop: "0.25rem",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.6875rem",
                                    color: "hsl(var(--text-caption))",
                                    fontFamily: "var(--font-sans)",
                                  }}
                                >
                                  {p.partido} · {p.uf} ·{" "}
                                  {p.casa_legislativa === "senado" ? "Senado" : "Câmara"}
                                </span>
                              </div>
                              {/* Barra proporcional ao topo */}
                              <div
                                style={{
                                  marginTop: "0.4rem",
                                  width: "10rem",
                                  height: "3px",
                                  borderRadius: "2px",
                                  backgroundColor: "hsl(var(--border))",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${Math.min(pct, 100).toFixed(1)}%`,
                                    height: "100%",
                                    borderRadius: "2px",
                                    backgroundColor: barColor,
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.8125rem",
                          color: "hsl(var(--text-headline))",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Link href={href} style={link}>
                          {fmtBRL(row.metricas.valor_empenhado)}
                        </Link>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                          color: "hsl(var(--text-body))",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Link href={href} style={link}>
                          {fmtBRL(row.metricas.valor_pago)}
                        </Link>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={href} style={link}>
                          <span className={execColor} style={{ fontSize: "0.6875rem" }}>
                            {exec}%
                          </span>
                        </Link>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.75rem",
                          color: "hsl(var(--text-caption))",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Link href={href} style={link}>
                          {fmtNum(row.metricas.total_emendas)}
                        </Link>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link
                          href={href}
                          style={{
                            color: "hsl(var(--primary))",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            textDecoration: "none",
                          }}
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Paginação ─────────────────────────────────── */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "1.25rem",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--text-caption))",
                fontFamily: "var(--font-mono)",
              }}
            >
              Página {page} de {totalPages} · {fmtNum(total)} parlamentares
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  style={{
                    padding: "0.4rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    border: "1px solid hsl(var(--border))",
                    backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--text-body))",
                    borderRadius: "2px",
                    textDecoration: "none",
                  }}
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  style={{
                    padding: "0.4rem 0.875rem",
                    fontSize: "0.8125rem",
                    fontWeight: 500,
                    backgroundColor: "hsl(var(--primary))",
                    color: "hsl(var(--primary-foreground))",
                    borderRadius: "2px",
                    textDecoration: "none",
                  }}
                >
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}

        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Ranking por valor empenhado. Taxa de execução = valor pago / valor empenhado.
          Fonte: Portal da Transparência do Governo Federal. Valores em R$ nominais.
        </p>
      </div>
    </>
  );
}
