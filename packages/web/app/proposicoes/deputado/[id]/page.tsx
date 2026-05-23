import { notFound } from "next/navigation";
import Link from "next/link";
import { getDeputadoProposicaoAgg, getProposicoesDeputado } from "~/services/proposicoes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tipo?: string; ano?: string; page?: string }>;
}

function fmtData(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function BadgeTipo({ sigla }: { sigla: string }) {
  const cls =
    sigla === "PL"  ? "badge-success" :
    sigla === "PEC" ? "badge-danger"  :
    sigla === "RIC" ? "badge-warn"    :
    "badge-neutral";
  return <span className={cls}>{sigla}</span>;
}

function Foto({ url, nome, size = 40 }: { url: string | null; nome: string; size?: number }) {
  if (url) {
    return (
      <img
        src={url}
        alt={nome}
        style={{ width: `${size}px`, height: `${size}px`, borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        backgroundColor: "hsl(var(--surface))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${Math.round(size * 0.35)}px`,
        fontWeight: 600,
        color: "hsl(var(--text-caption))",
        border: "1px solid hsl(var(--border))",
        flexShrink: 0,
      }}
    >
      {nome.charAt(0).toUpperCase()}
    </div>
  );
}

export default async function DeputadoProposicoesPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const deputadoId = parseInt(id, 10);
  if (isNaN(deputadoId)) notFound();

  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const tipoFiltro = sp.tipo;
  const anoFiltro = sp.ano ? parseInt(sp.ano, 10) : undefined;
  const perPage = 30;

  const agg = await getDeputadoProposicaoAgg(deputadoId);
  if (!agg) notFound();

  const { data: proposicoes, total } = await getProposicoesDeputado(
    deputadoId,
    page,
    perPage,
    { tipo: tipoFiltro, ano: anoFiltro }
  );

  const totalPages = Math.ceil(total / perPage);

  // Tipos disponíveis (do por_tipo do agg)
  const tiposDisp = agg.por_tipo
    ? Object.entries(agg.por_tipo)
        .sort((a, b) => b[1] - a[1])
        .map(([tipo]) => tipo)
    : [];

  // Anos disponíveis (do por_ano do agg)
  const anosDisp = agg.por_ano
    ? Object.keys(agg.por_ano)
        .map(Number)
        .sort((a, b) => b - a)
    : [];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (sp.tipo) params.set("tipo", sp.tipo);
    if (sp.ano) params.set("ano", sp.ano);
    params.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    return `/proposicoes/deputado/${deputadoId}?${params}`;
  }

  const chipStyle = (active: boolean) => ({
    fontSize: "0.75rem",
    padding: "0.25rem 0.625rem",
    borderRadius: "2px",
    textDecoration: "none" as const,
    fontFamily: "var(--font-sans)",
    backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--surface))",
    color: active ? "#fff" : "hsl(var(--text-body))",
  });

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/proposicoes" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              ← Produção Legislativa
            </Link>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <Foto url={agg.url_foto} nome={agg.nome} size={40} />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                <h1 style={{ fontSize: "1.5rem", margin: 0 }}>{agg.nome}</h1>
                <span className="badge-neutral" style={{ fontSize: "0.875rem" }}>
                  {agg.total_substantivo} projetos
                </span>
              </div>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)" }}>
                {agg.sigla_partido} · {agg.sigla_uf} · 57ª Legislatura
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Total</span>
            <span className="bloomberg-kpi-value">{agg.total.toLocaleString("pt-BR")}</span>
            <span className="bloomberg-kpi-sub">incluindo req. e proc.</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Projetos de Lei</span>
            <span className="bloomberg-kpi-value" style={{ color: "hsl(var(--success))" }}>
              {agg.total_pl.toLocaleString("pt-BR")}
            </span>
            <span className="bloomberg-kpi-sub">PL de autoria</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">PEC</span>
            <span className="bloomberg-kpi-value" style={{ color: "hsl(var(--danger))" }}>
              {agg.total_pec.toLocaleString("pt-BR")}
            </span>
            <span className="bloomberg-kpi-sub">emendas constitucionais</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Requerimentos</span>
            <span className="bloomberg-kpi-value" style={{ color: "hsl(var(--text-caption))" }}>
              {agg.total_req.toLocaleString("pt-BR")}
            </span>
            <span className="bloomberg-kpi-sub">REQ, DOC e proc.</span>
          </div>
        </div>

        {/* ── Filtro por tipo ───────────────────────────────────────────── */}
        {tiposDisp.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
              Tipo:
            </span>
            <Link href={buildUrl({ tipo: undefined })} style={chipStyle(!tipoFiltro)}>Todos</Link>
            {tiposDisp.map((t) => (
              <Link key={t} href={buildUrl({ tipo: t })} style={chipStyle(tipoFiltro === t)}>
                {t}
                {agg.por_tipo?.[t] != null && (
                  <span style={{ marginLeft: "0.3rem", opacity: 0.7 }}>
                    ({agg.por_tipo[t]})
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* ── Filtro por ano ────────────────────────────────────────────── */}
        {anosDisp.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
              Ano:
            </span>
            <Link href={buildUrl({ ano: undefined })} style={chipStyle(!anoFiltro)}>Todos</Link>
            {anosDisp.map((a) => (
              <Link key={a} href={buildUrl({ ano: String(a) })} style={chipStyle(anoFiltro === a)}>
                {a}
              </Link>
            ))}
          </div>
        )}

        {/* ── Tabela ───────────────────────────────────────────────────── */}
        {proposicoes.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Nenhuma proposição encontrada para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th style={{ width: "4rem" }}>Tipo</th>
                  <th style={{ width: "8rem" }}>Número / Ano</th>
                  <th>Ementa</th>
                  <th style={{ width: "7rem", textAlign: "right" }}>Apresentação</th>
                  <th style={{ width: "2rem" }} />
                </tr>
              </thead>
              <tbody>
                {proposicoes.map((prop) => {
                  const href = `/proposicoes/${prop.id}`;
                  const linkStyle = {
                    display: "block",
                    width: "100%",
                    color: "inherit",
                    textDecoration: "none",
                  } as const;
                  return (
                    <tr key={prop.id} style={{ cursor: "pointer" }}>
                      <td>
                        <Link href={href} style={linkStyle} aria-label={`Abrir ${prop.sigla_tipo} ${prop.numero ?? ""}/${prop.ano ?? ""}`}>
                          <BadgeTipo sigla={prop.sigla_tipo} />
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                        <Link href={href} style={linkStyle}>
                          {prop.numero != null && prop.ano != null
                            ? `${prop.numero}/${prop.ano}`
                            : prop.numero != null
                            ? String(prop.numero)
                            : "—"}
                        </Link>
                      </td>
                      <td style={{ fontSize: "0.8125rem", lineHeight: 1.45, maxWidth: "32rem" }}>
                        <Link href={href} style={{ ...linkStyle, color: "hsl(var(--text-body))" }}>
                          {prop.ementa
                            ? prop.ementa.length > 120
                              ? prop.ementa.slice(0, 120) + "…"
                              : prop.ementa
                            : <span style={{ color: "hsl(var(--text-caption))" }}>Sem ementa</span>}
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                        <Link href={href} style={linkStyle}>
                          {fmtData(prop.data_apresentacao)}
                        </Link>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link
                          href={href}
                          style={{ fontSize: "0.875rem", color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}
                          aria-label="Abrir detalhe"
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

        {/* ── Paginação ─────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                style={{ padding: "0.375rem 0.75rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", textDecoration: "none", color: "hsl(var(--text-body))" }}
              >
                ← Anterior
              </Link>
            )}
            <span style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
              {page.toLocaleString("pt-BR")} / {totalPages.toLocaleString("pt-BR")} · {total.toLocaleString("pt-BR")} proposições
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                style={{ padding: "0.375rem 0.75rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", textDecoration: "none", color: "hsl(var(--text-body))" }}
              >
                Próxima →
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
