import Link from "next/link";
import { getRiscoRanking, getPartidosRisco, getUfsRisco } from "~/services/risco";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Score de Risco — Transparência Federal",
  description:
    "Ranking de deputados federais por score de risco composto: gastos CEAP, ausência, produção legislativa, financiamento e emendas RP9.",
};

const PER_PAGE = 50;

interface Props {
  searchParams: Promise<{ partido?: string; uf?: string; page?: string }>;
}

function fmtBRL(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtPct(v: number | null): string {
  if (v == null) return "—";
  return `${Math.round(v)}%`;
}

const corScore = (s: number) =>
  s >= 70 ? "hsl(var(--danger))" : s >= 40 ? "hsl(var(--warning))" : "hsl(var(--success))";

function Foto({ url, nome }: { url: string | null; nome: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={nome}
        style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "hsl(var(--surface))",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.625rem",
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

function BarraRisco({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div style={{ width: "60px", height: "6px", background: "hsl(var(--border))", borderRadius: "2px", display: "inline-block", verticalAlign: "middle" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, valor))}%`, height: "100%", background: cor, borderRadius: "2px" }} />
    </div>
  );
}

export default async function RiscoPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const partido = sp.partido;
  const uf = sp.uf;

  const [{ data, total }, partidos, ufs] = await Promise.all([
    getRiscoRanking(page, PER_PAGE, { partido, uf }),
    getPartidosRisco(),
    getUfsRisco(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);
  const vazio = total === 0;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (sp.partido) params.set("partido", sp.partido);
    if (sp.uf) params.set("uf", sp.uf);
    params.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    return `/risco?${params}`;
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", backgroundColor: "hsl(var(--danger))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Score de Risco</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: "0 0 0.75rem", fontFamily: "var(--font-sans)" }}>
            57ª Legislatura · {vazio ? "dados pendentes" : <><strong>{total.toLocaleString("pt-BR")}</strong> deputados</>}
          </p>
          {/* Nota metodológica */}
          <div style={{
            display: "inline-block",
            padding: "0.5rem 0.875rem",
            backgroundColor: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "2px",
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            fontFamily: "var(--font-sans)",
            maxWidth: "52rem",
          }}>
            Score composto (0–100) calculado com 5 dimensões: gastos CEAP, ausência em votações, produção legislativa, financiamento de campanha e emendas RP9. Maior score = mais alertas.
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        {partidos.length > 0 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "0.75rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginRight: "0.25rem" }}>
              Partido:
            </span>
            <Link href={buildUrl({ partido: undefined })} style={chipStyle(!partido)}>Todos</Link>
            {partidos.map((p) => (
              <Link key={p} href={buildUrl({ partido: p })} style={chipStyle(partido === p)}>{p}</Link>
            ))}
          </div>
        )}

        {ufs.length > 0 && (
          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginRight: "0.25rem" }}>
              UF:
            </span>
            <Link href={buildUrl({ uf: undefined })} style={chipStyle(!uf)}>Todas</Link>
            {ufs.map((u) => (
              <Link key={u} href={buildUrl({ uf: u })} style={chipStyle(uf === u)}>{u}</Link>
            ))}
          </div>
        )}

        {/* ── Tabela ───────────────────────────────────────────────────── */}
        {vazio ? (
          <div style={{
            padding: "4rem 2rem", textAlign: "center",
            border: "1px solid hsl(var(--border))", borderRadius: "2px",
            backgroundColor: "hsl(var(--surface))",
          }}>
            <p style={{ fontFamily: "var(--font-sans)", color: "hsl(var(--text-caption))", margin: "0 0 0.5rem" }}>
              Score de risco ainda não calculado.
            </p>
            <code style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))" }}>
              npm run risco:ts -w @transparencia/analytics
            </code>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th style={{ width: "2.5rem", textAlign: "right" }}>#</th>
                  <th style={{ width: "2rem" }} />
                  <th>Deputado</th>
                  <th style={{ width: "5rem" }}>Partido / UF</th>
                  <th style={{ width: "5rem", textAlign: "center" }}>Score</th>
                  <th style={{ width: "7rem" }}>CEAP</th>
                  <th style={{ width: "5rem", textAlign: "right" }}>Ausência</th>
                  <th style={{ width: "5rem", textAlign: "right" }}>RP9</th>
                  <th style={{ width: "7rem" }}>Financ.</th>
                </tr>
              </thead>
              <tbody>
                {data.map((dep, idx) => {
                  const rank = (page - 1) * PER_PAGE + idx + 1;
                  const cor = corScore(dep.score_total);
                  return (
                    <tr key={dep.deputado_id}>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {rank}
                      </td>
                      <td>
                        <Foto url={dep.url_foto} nome={dep.nome} />
                      </td>
                      <td>
                        <Link
                          href={`/risco/${dep.deputado_id}`}
                          style={{ fontWeight: 600, color: "hsl(var(--text-headline))", textDecoration: "none", fontSize: "0.875rem" }}
                        >
                          {dep.nome}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {dep.sigla_partido} · {dep.sigla_uf}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: cor,
                          fontFamily: "var(--font-mono)",
                        }}>
                          {dep.score_total.toFixed(1)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <BarraRisco valor={dep.dim_ceap} cor="hsl(var(--primary))" />
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
                            {Math.round(dep.dim_ceap)}
                          </span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: dep.dim_presenca >= 50 ? "hsl(var(--danger))" : "hsl(var(--text-body))" }}>
                        {fmtPct(dep.dim_presenca)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: dep.dim_rp9 > 0 ? "hsl(var(--danger))" : "hsl(var(--text-caption))" }}>
                        {fmtPct(dep.dim_rp9)}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                          <BarraRisco valor={dep.dim_financiamento} cor="hsl(var(--warning))" />
                          <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
                            {Math.round(dep.dim_financiamento)}
                          </span>
                        </div>
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
              {page.toLocaleString("pt-BR")} / {totalPages.toLocaleString("pt-BR")} · {total.toLocaleString("pt-BR")} deputados
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

        <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "2rem", fontFamily: "var(--font-mono)" }}>
          Score = CEAP×0,30 + Ausência×0,20 + Produção×0,15 + Financiamento×0,20 + RP9×0,15 · Dimensões normalizadas 0–100
        </p>
      </div>
    </>
  );
}
