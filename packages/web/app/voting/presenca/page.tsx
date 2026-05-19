import Link from "next/link";
import { getDeputadosVotacaoListing, getPartidosDisponíveis } from "~/services/votacoes";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; partido?: string; uf?: string }>;
}

const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG",
  "MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR",
  "RS","SC","SE","SP","TO",
];

function fmtPct(n: number | null) {
  if (n === null) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function BarraPresenca({ pct }: { pct: number | null }) {
  const v = pct !== null ? Math.min(100, Math.max(0, Number(pct))) : 0;
  const cor = v >= 85 ? "hsl(var(--success))" : v >= 70 ? "hsl(var(--warn))" : "hsl(var(--danger))";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <div style={{ width: "80px", height: "5px", backgroundColor: "hsl(var(--border-subtle))", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${v}%`, height: "100%", backgroundColor: cor }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: cor, minWidth: "3.25rem" }}>
        {pct !== null ? `${v.toFixed(1)}%` : "—"}
      </span>
    </div>
  );
}

export default async function PresencaPage({ searchParams }: Props) {
  const sp      = await searchParams;
  const page    = Math.max(1, parseInt(sp.page ?? "1", 10));
  const perPage = 50;

  const [partidos, { rows, total }] = await Promise.all([
    getPartidosDisponíveis(),
    getDeputadosVotacaoListing(page, perPage, { partido: sp.partido, uf: sp.uf }),
  ]);

  const totalPages = Math.ceil(total / perPage);
  const offset     = (page - 1) * perPage;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (sp.partido) p.set("partido", sp.partido);
    if (sp.uf)      p.set("uf",      sp.uf);
    p.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    return `/voting/presenca?${p}`;
  }

  const vazio = rows.length === 0 && !sp.partido && !sp.uf && page === 1;

  return (
    <>
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "0.875rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/voting" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Votações</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            Ranking de Presença
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Ranking de Presença</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: "0.375rem 0 0", fontFamily: "var(--font-sans)" }}>
            57ª Legislatura · Ordenado por % de presença nas votações em plenário · {total.toLocaleString("pt-BR")} deputados
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── Filtros ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>Partido:</span>
          <Link href={buildUrl({ partido: undefined })}
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", borderRadius: "2px", textDecoration: "none", fontFamily: "var(--font-sans)", backgroundColor: !sp.partido ? "hsl(var(--primary))" : "hsl(var(--surface))", color: !sp.partido ? "#fff" : "hsl(var(--text-body))" }}>
            Todos
          </Link>
          {partidos.map((p) => (
            <Link key={p} href={buildUrl({ partido: p })}
              style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "2px", textDecoration: "none", fontFamily: "var(--font-mono)", backgroundColor: sp.partido === p ? "hsl(var(--primary))" : "hsl(var(--surface))", color: sp.partido === p ? "#fff" : "hsl(var(--text-body))" }}>
              {p}
            </Link>
          ))}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>UF:</span>
          <Link href={buildUrl({ uf: undefined })}
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "2px", textDecoration: "none", fontFamily: "var(--font-sans)", backgroundColor: !sp.uf ? "hsl(var(--primary))" : "hsl(var(--surface))", color: !sp.uf ? "#fff" : "hsl(var(--text-body))" }}>
            Todos
          </Link>
          {UFS.map((u) => (
            <Link key={u} href={buildUrl({ uf: u })}
              style={{ fontSize: "0.7rem", padding: "0.2rem 0.4rem", borderRadius: "2px", textDecoration: "none", fontFamily: "var(--font-mono)", backgroundColor: sp.uf === u ? "hsl(var(--primary))" : "hsl(var(--surface))", color: sp.uf === u ? "#fff" : "hsl(var(--text-caption))" }}>
              {u}
            </Link>
          ))}
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────── */}
        {vazio ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", border: "1px solid hsl(var(--border))", borderRadius: "2px", backgroundColor: "hsl(var(--surface))" }}>
            <p style={{ fontFamily: "var(--font-sans)", color: "hsl(var(--text-caption))", margin: "0 0 0.5rem" }}>
              Agregação ainda não calculada.
            </p>
            <code style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))" }}>
              npm run votacoes-agg:ts
            </code>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Nenhum deputado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th style={{ width: "3rem", textAlign: "right" }}>#</th>
                  <th style={{ width: "2.25rem" }} />
                  <th>Deputado</th>
                  <th style={{ width: "5rem" }}>Partido</th>
                  <th style={{ width: "3rem" }}>UF</th>
                  <th style={{ width: "14rem" }}>Presença</th>
                  <th style={{ width: "4.5rem", textAlign: "right" }}>Votações</th>
                  <th style={{ width: "4.5rem", textAlign: "right" }}>Ausências</th>
                  <th style={{ width: "7rem", textAlign: "right" }}>Conc. Partido</th>
                  <th style={{ width: "2rem" }} />
                </tr>
              </thead>
              <tbody>
                {rows.map((dep, i) => (
                  <tr key={dep.deputado_id}>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {(offset + i + 1).toLocaleString("pt-BR")}
                    </td>
                    <td style={{ padding: "0.35rem 0.5rem" }}>
                      {dep.url_foto
                        ? <img src={dep.url_foto} alt={dep.nome ?? ""} style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
                        : <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "hsl(var(--surface))" }} />
                      }
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>
                      <Link href={`/voting/deputado/${dep.deputado_id}`} style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
                        {dep.nome ?? "—"}
                      </Link>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.75rem" }}>
                      <Link href={buildUrl({ partido: sp.partido === dep.sigla_partido ? undefined : dep.sigla_partido ?? undefined })}
                        style={{ textDecoration: "none", color: "hsl(var(--text-body))" }}>
                        {dep.sigla_partido ?? "—"}
                      </Link>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {dep.sigla_uf ?? "—"}
                    </td>
                    <td><BarraPresenca pct={dep.pct_presenca} /></td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                      {dep.presencas.toLocaleString("pt-BR")}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: dep.ausencias > 0 ? "hsl(var(--danger))" : "hsl(var(--text-caption))" }}>
                      {dep.ausencias.toLocaleString("pt-BR")}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600,
                        color: dep.concordancia_partido === null ? "hsl(var(--text-caption))"
                          : Number(dep.concordancia_partido) >= 90 ? "hsl(var(--success))"
                          : Number(dep.concordancia_partido) < 70 ? "hsl(var(--danger))"
                          : "hsl(var(--warn))",
                      }}>
                        {fmtPct(dep.concordancia_partido)}
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Link href={`/voting/deputado/${dep.deputado_id}`}
                        style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", textDecoration: "none" }}>
                        →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Paginação ──────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })}
                style={{ padding: "0.375rem 0.75rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", textDecoration: "none", color: "hsl(var(--text-body))" }}>
                ← Anterior
              </Link>
            )}
            <span style={{ padding: "0.375rem 0.75rem", fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
              {page} / {totalPages} · {total.toLocaleString("pt-BR")} deputados
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
