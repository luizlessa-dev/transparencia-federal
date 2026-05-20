import Link from "next/link";
import { getProposicoesRanking, getPartidosProposicoes, getUfsProposicoes } from "~/services/proposicoes";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ partido?: string; uf?: string; page?: string }>;
}

function Foto({ url, nome }: { url: string | null; nome: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={nome}
        style={{ width: "24px", height: "24px", borderRadius: "50%", objectFit: "cover", display: "block" }}
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

export default async function ProposicoesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10));
  const partido = sp.partido;
  const uf = sp.uf;
  const perPage = 30;

  const [{ data, total }, partidos, ufs] = await Promise.all([
    getProposicoesRanking(page, perPage, { partido, uf }),
    getPartidosProposicoes(),
    getUfsProposicoes(),
  ]);

  const totalPages = Math.ceil(total / perPage);
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
    return `/proposicoes?${params}`;
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
            <div style={{ height: "2rem", width: "3px", backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Produção Legislativa</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)" }}>
            57ª Legislatura · Proposições de autoria por deputado ·{" "}
            {vazio ? "dados pendentes" : <><strong>{total.toLocaleString("pt-BR")}</strong> deputados com proposições</>}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── Filtros ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Partido:
          </span>
          <Link href={buildUrl({ partido: undefined })} style={chipStyle(!partido)}>Todos</Link>
          {partidos.map((p) => (
            <Link key={p} href={buildUrl({ partido: p })} style={chipStyle(partido === p)}>
              {p}
            </Link>
          ))}
        </div>

        {ufs.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
              UF:
            </span>
            <Link href={buildUrl({ uf: undefined })} style={chipStyle(!uf)}>Todas</Link>
            {ufs.map((u) => (
              <Link key={u} href={buildUrl({ uf: u })} style={chipStyle(uf === u)}>
                {u}
              </Link>
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
              Dados de proposições ainda não ingeridos.
            </p>
            <code style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))" }}>
              npm run proposicoes:ts
            </code>
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Nenhum deputado encontrado para os filtros selecionados.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th style={{ width: "2.5rem", textAlign: "right" }}>#</th>
                  <th style={{ width: "2rem" }} />
                  <th>Deputado</th>
                  <th style={{ width: "6rem" }}>Partido</th>
                  <th style={{ width: "3rem" }}>UF</th>
                  <th style={{ width: "6rem", textAlign: "right" }}>Projetos</th>
                  <th style={{ width: "4rem", textAlign: "right" }}>PL</th>
                  <th style={{ width: "4rem", textAlign: "right" }}>PEC</th>
                  <th style={{ width: "4rem", textAlign: "right" }}>Todos</th>
                  <th style={{ width: "2rem" }} />
                </tr>
              </thead>
              <tbody>
                {data.map((dep, idx) => {
                  const rank = (page - 1) * perPage + idx + 1;
                  return (
                    <tr key={dep.deputado_id}>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {rank}
                      </td>
                      <td>
                        <Foto url={dep.url_foto} nome={dep.nome} />
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <Link
                          href={`/proposicoes/deputado/${dep.deputado_id}`}
                          style={{ textDecoration: "none", color: "hsl(var(--text-headline))" }}
                        >
                          {dep.nome}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {dep.sigla_partido}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {dep.sigla_uf}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.875rem", fontWeight: 600 }}>
                        {dep.total_substantivo.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--success))" }}>
                        {dep.total_pl.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--danger))" }}>
                        {dep.total_pec.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {dep.total.toLocaleString("pt-BR")}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link
                          href={`/proposicoes/deputado/${dep.deputado_id}`}
                          style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", textDecoration: "none" }}
                          title="Ver proposições deste deputado"
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
      </div>
    </>
  );
}
