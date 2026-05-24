import Link from "next/link";
import { getVotacoesListing, getVotacoesStats } from "~/services/votacoes";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; ano?: string; aprovacao?: string }>;
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
}

function BadgeResultado({ aprovacao }: { aprovacao: number | null }) {
  if (aprovacao === 1) return <span className="badge-success">APROVADA</span>;
  if (aprovacao === 0) return <span className="badge-danger">REJEITADA</span>;
  return <span className="badge-neutral">PROCEDURAL</span>;
}

function PlacarMini({
  sim,
  nao,
  outros,
  aprovacao,
}: {
  sim: number;
  nao: number;
  outros: number;
  aprovacao: number | null;
}) {
  const total = sim + nao + outros;
  if (total === 0) {
    // Votação com resultado declarado mas sem placar nominal = simbólica.
    // Sem aprovacao + sem placar = procedural (não houve votação contada).
    const txt = aprovacao === null ? "—" : "simbólica";
    return (
      <span
        style={{ color: "hsl(var(--text-caption))", fontSize: "0.6875rem", fontStyle: "italic" }}
        title={
          aprovacao === null
            ? "Sem placar nominal registrado"
            : "Aprovação simbólica — sem contagem individual de votos"
        }
      >
        {txt}
      </span>
    );
  }
  return (
    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
      <span style={{ color: "hsl(var(--success))" }}>{sim}S</span>
      {" · "}
      <span style={{ color: "hsl(var(--danger))" }}>{nao}N</span>
      {outros > 0 && <span style={{ color: "hsl(var(--text-caption))" }}> · {outros}O</span>}
    </span>
  );
}

export default async function VotingPage({ searchParams }: Props) {
  const sp      = await searchParams;
  const page    = Math.max(1, parseInt(sp.page ?? "1", 10));
  const ano     = sp.ano ? parseInt(sp.ano, 10) : undefined;
  const aprovacao = sp.aprovacao === "1" ? 1 : sp.aprovacao === "0" ? 0 : undefined;
  const perPage = 30;

  const [stats, { rows, total }] = await Promise.all([
    getVotacoesStats(),
    getVotacoesListing(page, perPage, { ano, aprovacao }),
  ]);

  const totalPages = Math.ceil(total / perPage);
  const anosDisp   = [2023, 2024, 2025, 2026];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (sp.ano)       params.set("ano", sp.ano);
    if (sp.aprovacao) params.set("aprovacao", sp.aprovacao);
    params.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    return `/voting?${params}`;
  }

  const vazio = stats.total_votacoes === 0;

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Votações em Plenário</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)" }}>
            57ª Legislatura · Registro completo de como cada deputado votou em cada projeto
            {stats.data_mais_recente && (
              <> · Última sessão: <strong>{fmtData(stats.data_mais_recente)}</strong></>
            )}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Total de votações</span>
            <span className="bloomberg-kpi-value">
              {vazio ? "—" : stats.total_votacoes.toLocaleString("pt-BR")}
            </span>
            <span className="bloomberg-kpi-sub">57ª legislatura · plenário</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Aprovadas</span>
            <span className="bloomberg-kpi-value" style={{ color: vazio ? undefined : "hsl(var(--success))" }}>
              {vazio ? "—" : stats.aprovadas.toLocaleString("pt-BR")}
            </span>
            <span className="bloomberg-kpi-sub">
              {vazio || stats.total_votacoes === 0
                ? "dados pendentes"
                : `${((stats.aprovadas / stats.total_votacoes) * 100).toFixed(1)}% do total`}
            </span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Rejeitadas</span>
            <span className="bloomberg-kpi-value" style={{ color: vazio ? undefined : "hsl(var(--danger))" }}>
              {vazio ? "—" : stats.rejeitadas.toLocaleString("pt-BR")}
            </span>
            <span className="bloomberg-kpi-sub">
              {vazio || stats.total_votacoes === 0
                ? "dados pendentes"
                : `${((stats.rejeitadas / stats.total_votacoes) * 100).toFixed(1)}% do total`}
            </span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Média de presença</span>
            <span className="bloomberg-kpi-value">
              {vazio ? "—" : fmtPct(stats.media_presenca)}
            </span>
            <span className="bloomberg-kpi-sub">por deputado · após agregação</span>
          </div>
        </div>

        {/* ── Atalho para ranking de presença ──────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1.25rem" }}>
          <Link
            href="/voting/presenca"
            style={{
              fontSize: "0.8125rem", color: "hsl(var(--primary))",
              textDecoration: "none", fontFamily: "var(--font-sans)", fontWeight: 500,
            }}
          >
            Ranking de presença por deputado →
          </Link>
        </div>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Ano:
          </span>
          {[undefined, ...anosDisp].map((a) => {
            const active = ano === a || (a === undefined && !ano);
            return (
              <Link key={String(a)} href={buildUrl({ ano: a !== undefined ? String(a) : undefined })}
                style={{
                  fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "2px",
                  textDecoration: "none", fontFamily: "var(--font-sans)",
                  backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--surface))",
                  color: active ? "#fff" : "hsl(var(--text-body))",
                }}>
                {a ?? "Todos"}
              </Link>
            );
          })}

          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginLeft: "0.75rem" }}>
            Resultado:
          </span>
          {[
            { label: "Todos",      val: undefined },
            { label: "Aprovadas",  val: "1" },
            { label: "Rejeitadas", val: "0" },
          ].map(({ label, val }) => {
            const active = sp.aprovacao === val || (!sp.aprovacao && val === undefined);
            return (
              <Link key={label} href={buildUrl({ aprovacao: val })}
                style={{
                  fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "2px",
                  textDecoration: "none", fontFamily: "var(--font-sans)",
                  backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--surface))",
                  color: active ? "#fff" : "hsl(var(--text-body))",
                }}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* ── Tabela ───────────────────────────────────────────────────── */}
        {vazio ? (
          <div style={{
            padding: "4rem 2rem", textAlign: "center",
            border: "1px solid hsl(var(--border))", borderRadius: "2px",
            backgroundColor: "hsl(var(--surface))",
          }}>
            <p style={{ fontFamily: "var(--font-sans)", color: "hsl(var(--text-caption))", margin: "0 0 0.5rem" }}>
              Dados de votações ainda não ingeridos.
            </p>
            <code style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))" }}>
              npm run votacoes:ts
            </code>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Nenhuma votação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th style={{ width: "6.5rem" }}>Data</th>
                  <th style={{ width: "8rem" }}>Proposta</th>
                  <th>Descrição</th>
                  <th style={{ width: "8rem" }}>Resultado</th>
                  <th style={{ width: "8rem", textAlign: "right" }}>Placar</th>
                  <th style={{ width: "2rem" }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => {
                  const href = `/voting/${encodeURIComponent(v.id)}`;
                  const cellLink = {
                    display: "block",
                    width: "100%",
                    color: "inherit",
                    textDecoration: "none",
                  } as const;
                  return (
                    <tr key={v.id} style={{ cursor: "pointer" }}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        <Link href={href} style={cellLink}>{fmtData(v.data)}</Link>
                      </td>
                      <td style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                        <Link href={href} style={cellLink}>{v.proposicao_autora ?? "—"}</Link>
                      </td>
                      <td style={{ fontSize: "0.8125rem", lineHeight: 1.45, maxWidth: "28rem" }}>
                        <Link href={href} style={{ ...cellLink, color: "hsl(var(--text-body))" }}>
                          {v.descricao
                            ? v.descricao.length > 100
                              ? v.descricao.slice(0, 100) + "…"
                              : v.descricao
                            : v.proposicao_autora ? (
                              <span style={{ color: "hsl(var(--text-caption))", fontStyle: "italic" }}>
                                Votação sobre {v.proposicao_autora}
                              </span>
                            ) : (
                              <span style={{ color: "hsl(var(--text-caption))", fontStyle: "italic" }}>
                                Item procedimental
                              </span>
                            )}
                        </Link>
                      </td>
                      <td>
                        <Link href={href} style={cellLink}>
                          <BadgeResultado aprovacao={v.aprovacao} />
                        </Link>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={href} style={cellLink}>
                          <PlacarMini
                            sim={v.votos_sim}
                            nao={v.votos_nao}
                            outros={v.votos_abstencao + v.votos_obstrucao + v.votos_artigo17}
                            aprovacao={v.aprovacao}
                          />
                        </Link>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link
                          href={href}
                          style={{ fontSize: "0.875rem", color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}
                          title="Ver detalhes desta votação"
                        >→</Link>
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
              <Link href={buildUrl({ page: String(page - 1) })}
                style={{ padding: "0.375rem 0.75rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", textDecoration: "none", color: "hsl(var(--text-body))" }}>
                ← Anterior
              </Link>
            )}
            <span style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
              {page.toLocaleString("pt-BR")} / {totalPages.toLocaleString("pt-BR")} · {total.toLocaleString("pt-BR")} votações
            </span>
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })}
                style={{ padding: "0.375rem 0.75rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", textDecoration: "none", color: "hsl(var(--text-body))" }}>
                Próxima →
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  );
}
