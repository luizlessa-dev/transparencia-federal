import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getVotacao,
  getVotosDeVotacao,
  getOrientacoesDeVotacao,
  type PlenVoto,
  type PlenOrientacao,
} from "~/services/votacoes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ partido?: string; tipo?: string }>;
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function fmtNum(n: number) { return n.toLocaleString("pt-BR"); }

const COR_VOTO: Record<string, string> = {
  "Sim":       "hsl(var(--success))",
  "Não":       "hsl(var(--danger))",
  "Abstenção": "hsl(var(--warn))",
  "Obstrução": "hsl(var(--text-caption))",
  "Art. 17":   "hsl(var(--border))",
};

function BadgeOrientacao({ orientacao }: { orientacao: string }) {
  const cls =
    orientacao === "Sim"      ? "badge-success" :
    orientacao === "Não"      ? "badge-danger"  :
    orientacao === "Liberado" ? "badge-neutral"  :
    "badge-warn";
  return <span className={cls}>{orientacao.toUpperCase()}</span>;
}

function BadgeVoto({ tipo }: { tipo: string }) {
  const cls =
    tipo === "Sim"       ? "badge-success" :
    tipo === "Não"       ? "badge-danger"  :
    tipo === "Abstenção" ? "badge-warn"    :
    "badge-neutral";
  return <span className={cls}>{tipo.toUpperCase()}</span>;
}

function calcularDisciplina(votos: PlenVoto[], orientacoes: PlenOrientacao[]) {
  const mapOrient = new Map(orientacoes.map((o) => [o.sigla_bancada, o.orientacao]));
  const porPartido = new Map<string, { seguiram: number; divergiram: number; orientacao: string }>();

  for (const v of votos) {
    const p = v.sigla_partido;
    if (!p) continue;
    const orient = mapOrient.get(p);
    if (!orient || orient === "Liberado" || orient === "Art. 17") continue;
    if (!porPartido.has(p)) porPartido.set(p, { seguiram: 0, divergiram: 0, orientacao: orient });
    const e = porPartido.get(p)!;
    if (v.tipo_voto === orient) e.seguiram++;
    else e.divergiram++;
  }

  return Array.from(porPartido.entries())
    .map(([sigla, { seguiram, divergiram, orientacao }]) => {
      const total = seguiram + divergiram;
      return { sigla, orientacao, seguiram, divergiram, total, pct: total > 0 ? Math.round((seguiram / total) * 100) : 0 };
    })
    .sort((a, b) => b.total - a.total);
}

export default async function VotacaoDetailPage({ params, searchParams }: Props) {
  const { id }    = await params;
  const sp        = await searchParams;
  const votacaoId = decodeURIComponent(id);

  const [votacao, todosVotos, orientacoes] = await Promise.all([
    getVotacao(votacaoId),
    getVotosDeVotacao(votacaoId),
    getOrientacoesDeVotacao(votacaoId),
  ]);

  if (!votacao) notFound();

  const partidos      = Array.from(new Set(todosVotos.map((v) => v.sigla_partido).filter(Boolean) as string[])).sort();
  const filtroPartido = sp.partido ?? "";
  const filtroTipo    = sp.tipo ?? "";
  const votos         = todosVotos.filter((v) => {
    if (filtroPartido && v.sigla_partido !== filtroPartido) return false;
    if (filtroTipo    && v.tipo_voto     !== filtroTipo)    return false;
    return true;
  });

  const total      = todosVotos.length;
  const disciplina = calcularDisciplina(todosVotos, orientacoes);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    if (sp.partido) p.set("partido", sp.partido);
    if (sp.tipo)    p.set("tipo",    sp.tipo);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `/voting/${encodeURIComponent(votacaoId)}${s ? "?" + s : ""}`;
  }

  const TIPOS_VOTO = ["Sim", "Não", "Abstenção", "Obstrução", "Art. 17"];

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/voting" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Votações</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem" }}>{votacaoId}</span>
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "16rem" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.5rem" }}>
                <div style={{ height: "2rem", width: "3px", flexShrink: 0, marginTop: "0.25rem", backgroundColor: "hsl(var(--primary))" }} />
                <h1 style={{ fontSize: "1.375rem", margin: 0, lineHeight: 1.35 }}>
                  {votacao.proposicao_autora && (
                    <span style={{ fontFamily: "var(--font-mono)", marginRight: "0.5rem", color: "hsl(var(--primary))" }}>
                      {votacao.proposicao_autora}
                    </span>
                  )}
                  {votacao.descricao
                    ? votacao.descricao.length > 90 ? votacao.descricao.slice(0, 90) + "…" : votacao.descricao
                    : "Votação sem descrição"}
                </h1>
              </div>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)" }}>
                {fmtData(votacao.data)} · Plenário · {fmtNum(total)} votos registrados
              </p>
              {votacao.descricao && votacao.descricao.length > 90 && (
                <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", marginTop: "0.625rem", fontFamily: "var(--font-sans)", lineHeight: 1.55, maxWidth: "44rem" }}>
                  {votacao.descricao}
                </p>
              )}
            </div>

            {/* Card de resultado */}
            <div style={{
              padding: "0.875rem 1.5rem", textAlign: "center", minWidth: "9rem",
              backgroundColor: votacao.aprovacao === 1 ? "hsla(142,71%,45%,0.08)" : votacao.aprovacao === 0 ? "hsla(0,84%,60%,0.08)" : "hsl(var(--surface))",
              border: `1.5px solid ${votacao.aprovacao === 1 ? "hsl(var(--success))" : votacao.aprovacao === 0 ? "hsl(var(--danger))" : "hsl(var(--border))"}`,
              borderRadius: "2px",
            }}>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 0.375rem" }}>
                Resultado
              </p>
              <p style={{
                fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.125rem", margin: 0,
                color: votacao.aprovacao === 1 ? "hsl(var(--success))" : votacao.aprovacao === 0 ? "hsl(var(--danger))" : "hsl(var(--text-headline))",
              }}>
                {votacao.aprovacao === 1 ? "APROVADA" : votacao.aprovacao === 0 ? "REJEITADA" : "PROCEDURAL"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── Placar KPIs ───────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.25rem" }}>
          {[
            { label: "Sim",       val: votacao.votos_sim,       color: "hsl(var(--success))"      },
            { label: "Não",       val: votacao.votos_nao,       color: "hsl(var(--danger))"       },
            { label: "Abstenção", val: votacao.votos_abstencao, color: "hsl(var(--warn))"         },
            { label: "Obstrução", val: votacao.votos_obstrucao, color: "hsl(var(--text-caption))" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">{label}</span>
              <span className="bloomberg-kpi-value" style={{ color: val > 0 ? color : undefined }}>
                {fmtNum(val)}
              </span>
              <span className="bloomberg-kpi-sub">
                {total > 0 ? `${Math.round((val / total) * 100)}% dos votos` : "—"}
              </span>
            </div>
          ))}
        </div>

        {/* Barra visual do placar */}
        {total > 0 && (
          <div style={{ display: "flex", height: "10px", borderRadius: "2px", overflow: "hidden", marginBottom: "2rem", border: "1px solid hsl(var(--border))" }}>
            {[
              { val: votacao.votos_sim,       color: "hsl(var(--success))"      },
              { val: votacao.votos_nao,       color: "hsl(var(--danger))"       },
              { val: votacao.votos_abstencao, color: "hsl(var(--warn))"         },
              { val: votacao.votos_obstrucao, color: "hsl(var(--text-caption))" },
              { val: votacao.votos_artigo17,  color: "hsl(var(--border))"       },
            ].map(({ val, color }, i) =>
              val > 0 ? <div key={i} style={{ flex: val, backgroundColor: color }} title={`${val}`} /> : null
            )}
          </div>
        )}

        {/* ── Disciplina + Orientações ─────────────────────────────────── */}
        {(disciplina.length > 0 || orientacoes.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2.5rem" }}>

            {disciplina.length > 0 && (
              <div>
                <h2 style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem", fontFamily: "var(--font-sans)" }}>
                  Disciplina Partidária
                </h2>
                <table className="bloomberg-table">
                  <thead>
                    <tr>
                      <th>Partido</th>
                      <th>Orientação</th>
                      <th style={{ textAlign: "right" }}>Seguiram</th>
                      <th style={{ textAlign: "right" }}>Divergiram</th>
                      <th style={{ textAlign: "right" }}>Disciplina</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplina.map((d) => (
                      <tr key={d.sigla}>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          <Link href={buildUrl({ partido: filtroPartido === d.sigla ? undefined : d.sigla })}
                            style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
                            {d.sigla}
                          </Link>
                        </td>
                        <td><BadgeOrientacao orientacao={d.orientacao} /></td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "hsl(var(--success))" }}>{d.seguiram}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: d.divergiram > 0 ? "hsl(var(--danger))" : "hsl(var(--text-caption))" }}>{d.divergiram}</td>
                        <td style={{ textAlign: "right" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: d.pct >= 90 ? "hsl(var(--success))" : d.pct < 70 ? "hsl(var(--danger))" : "hsl(var(--warn))" }}>
                            {d.pct}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {orientacoes.length > 0 && (
              <div>
                <h2 style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem", fontFamily: "var(--font-sans)" }}>
                  Orientação das Bancadas
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {orientacoes.map((o) => (
                    <div key={o.sigla_bancada} style={{
                      display: "inline-flex", alignItems: "center", gap: "0.375rem",
                      padding: "0.2rem 0.5rem 0.2rem 0.625rem",
                      backgroundColor: "hsl(var(--surface))", borderRadius: "2px",
                      border: "1px solid hsl(var(--border-subtle))",
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.7rem" }}>
                        {o.sigla_bancada}
                      </span>
                      <BadgeOrientacao orientacao={o.orientacao} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Lista de votos ────────────────────────────────────────────── */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.625rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)" }}>
              Votos ({votos.length.toLocaleString("pt-BR")}{(filtroPartido || filtroTipo) ? ` de ${fmtNum(total)}` : ""})
            </h2>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
              {TIPOS_VOTO.map((t) => {
                const count = todosVotos.filter((v) => v.tipo_voto === t).length;
                if (count === 0) return null;
                const active = filtroTipo === t;
                return (
                  <Link key={t} href={buildUrl({ tipo: active ? undefined : t })}
                    style={{
                      fontSize: "0.7rem", padding: "0.175rem 0.5rem", borderRadius: "2px",
                      textDecoration: "none", fontFamily: "var(--font-sans)",
                      backgroundColor: active ? COR_VOTO[t] : "hsl(var(--surface))",
                      color: active ? "#fff" : "hsl(var(--text-body))",
                      border: `1px solid ${active ? COR_VOTO[t] : "hsl(var(--border-subtle))"}`,
                    }}>
                    {t} ({count})
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Filtro por partido */}
          {!filtroPartido && partidos.length > 1 && (
            <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {partidos.map((p) => {
                const count = todosVotos.filter((v) => v.sigla_partido === p).length;
                return (
                  <Link key={p} href={buildUrl({ partido: p })}
                    style={{
                      fontSize: "0.65rem", padding: "0.1rem 0.4rem", borderRadius: "2px",
                      textDecoration: "none", fontFamily: "var(--font-mono)",
                      backgroundColor: "hsl(var(--surface))", color: "hsl(var(--text-caption))",
                      border: "1px solid hsl(var(--border-subtle))",
                    }}>
                    {p} ({count})
                  </Link>
                );
              })}
            </div>
          )}
          {filtroPartido && (
            <p style={{ fontSize: "0.75rem", fontFamily: "var(--font-sans)", marginBottom: "0.75rem", color: "hsl(var(--text-caption))" }}>
              Filtrado: <strong style={{ color: "hsl(var(--primary))" }}>{filtroPartido}</strong>{" "}
              <Link href={buildUrl({ partido: undefined })} style={{ color: "hsl(var(--danger))", textDecoration: "none" }}>× remover</Link>
            </p>
          )}

          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th style={{ width: "2.25rem" }} />
                  <th>Deputado</th>
                  <th style={{ width: "4.5rem" }}>Partido</th>
                  <th style={{ width: "3rem" }}>UF</th>
                  <th style={{ width: "7rem" }}>Voto</th>
                  <th style={{ width: "8rem" }}>vs. Partido</th>
                </tr>
              </thead>
              <tbody>
                {votos.map((v) => {
                  const orient    = orientacoes.find((o) => o.sigla_bancada === v.sigla_partido);
                  const concordou =
                    orient && orient.orientacao !== "Liberado" && orient.orientacao !== "Art. 17"
                      ? v.tipo_voto === orient.orientacao
                      : null;
                  return (
                    <tr key={v.deputado_id}>
                      <td style={{ padding: "0.35rem 0.5rem" }}>
                        {v.url_foto
                          ? <img src={v.url_foto} alt={v.nome ?? ""} style={{ width: "26px", height: "26px", borderRadius: "50%", objectFit: "cover", display: "block" }} />
                          : <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "hsl(var(--surface))" }} />
                        }
                      </td>
                      <td>
                        <Link href={`/voting/deputado/${v.deputado_id}`} style={{ color: "hsl(var(--primary))", textDecoration: "none", fontSize: "0.8125rem" }}>
                          {v.nome ?? "—"}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.75rem" }}>
                        <Link href={buildUrl({ partido: filtroPartido === v.sigla_partido ? undefined : v.sigla_partido ?? undefined })}
                          style={{ textDecoration: "none", color: "hsl(var(--text-body))" }}>
                          {v.sigla_partido ?? "—"}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                        {v.sigla_uf ?? "—"}
                      </td>
                      <td><BadgeVoto tipo={v.tipo_voto} /></td>
                      <td>
                        {concordou === null
                          ? <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>Liberado</span>
                          : concordou
                          ? <span style={{ fontSize: "0.75rem", color: "hsl(var(--success))" }}>✓ Seguiu</span>
                          : <span style={{ fontSize: "0.75rem", color: "hsl(var(--danger))", fontWeight: 700 }}>✗ Divergiu</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
