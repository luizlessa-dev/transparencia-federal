import { notFound } from "next/navigation";
import Link from "next/link";
import { getDeputadoVotacaoAgg, getUltimasVotacoesDeDeputado } from "~/services/votacoes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtPct(n: number | null) {
  if (n === null) return "—";
  return `${Number(n).toFixed(1)}%`;
}

function fmtData(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtNum(n: number) { return n.toLocaleString("pt-BR"); }

function ProgressBar({ value, total, color, label }: {
  value: number; total: number; color: string; label: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.5rem" }}>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "0.75rem", color: "hsl(var(--text-caption))", minWidth: "6rem" }}>{label}</span>
      <div style={{ flex: 1, height: "6px", backgroundColor: "hsl(var(--border-subtle))", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", backgroundColor: color, borderRadius: "2px" }} />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))", minWidth: "4rem", textAlign: "right" }}>
        {fmtNum(value)} ({pct}%)
      </span>
    </div>
  );
}

function BadgeVoto({ tipo }: { tipo: string }) {
  const cls =
    tipo === "Sim"       ? "badge-success" :
    tipo === "Não"       ? "badge-danger"  :
    tipo === "Abstenção" ? "badge-warn"    :
    "badge-neutral";
  return <span className={cls}>{tipo.toUpperCase()}</span>;
}

export default async function DeputadoVotacaoPage({ params }: Props) {
  const { id } = await params;
  const deputadoId = parseInt(id, 10);
  if (isNaN(deputadoId)) notFound();

  const [agg, ultimasVotacoes] = await Promise.all([
    getDeputadoVotacaoAgg(deputadoId),
    getUltimasVotacoesDeDeputado(deputadoId, 40),
  ]);

  if (!agg) notFound();

  const totalVotos  = agg.presencas; // total de votos computados
  const pctPresenca = agg.pct_presenca !== null ? Number(agg.pct_presenca) : null;
  const concPartido = agg.concordancia_partido !== null ? Number(agg.concordancia_partido) : null;

  const corPresenca = pctPresenca === null ? "hsl(var(--text-headline))"
    : pctPresenca >= 85 ? "hsl(var(--success))"
    : pctPresenca >= 70 ? "hsl(var(--warn))"
    : "hsl(var(--danger))";

  const corConcordancia = concPartido === null ? "hsl(var(--text-headline))"
    : concPartido >= 90 ? "hsl(var(--success))"
    : concPartido >= 70 ? "hsl(var(--warn))"
    : "hsl(var(--danger))";

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/voting" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Votações</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <Link href="/voting/presenca" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Presença</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            {agg.nome ?? "Deputado"}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
            {/* Foto */}
            {agg.url_foto && (
              <img
                src={agg.url_foto}
                alt={agg.nome ?? ""}
                style={{ width: "72px", height: "72px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "2px solid hsl(var(--border))" }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
                <div style={{ height: "2rem", width: "3px", backgroundColor: "hsl(var(--primary))" }} />
                <h1 style={{ fontSize: "1.625rem", margin: 0 }}>{agg.nome ?? "Deputado"}</h1>
              </div>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)" }}>
                {agg.sigla_partido ?? "—"} · {agg.sigla_uf ?? "—"} · Câmara dos Deputados · 57ª Legislatura
              </p>
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.625rem", flexWrap: "wrap" }}>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "0.15rem 0.5rem",
                  backgroundColor: "hsl(var(--surface))", borderRadius: "2px", border: "1px solid hsl(var(--border-subtle))",
                }}>
                  #{agg.posicao ?? "—"} geral
                </span>
                <span style={{
                  fontFamily: "var(--font-mono)", fontSize: "0.75rem", padding: "0.15rem 0.5rem",
                  backgroundColor: "hsl(var(--surface))", borderRadius: "2px", border: "1px solid hsl(var(--border-subtle))",
                }}>
                  #{agg.posicao_partido ?? "—"} no {agg.sigla_partido ?? "partido"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Presença</span>
            <span className="bloomberg-kpi-value" style={{ color: corPresenca }}>
              {fmtPct(pctPresenca)}
            </span>
            <span className="bloomberg-kpi-sub">{fmtNum(agg.presencas)} de {fmtNum(agg.total_votacoes)} votações</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Ausências</span>
            <span className="bloomberg-kpi-value" style={{ color: agg.ausencias > 0 ? "hsl(var(--danger))" : undefined }}>
              {fmtNum(agg.ausencias)}
            </span>
            <span className="bloomberg-kpi-sub">votações sem registro de voto</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Concordância partido</span>
            <span className="bloomberg-kpi-value" style={{ color: corConcordancia }}>
              {fmtPct(concPartido)}
            </span>
            <span className="bloomberg-kpi-sub">% seguiu orientação {agg.sigla_partido ?? "partido"}</span>
          </div>
          <div className="bloomberg-kpi">
            <span className="bloomberg-kpi-label">Ranking geral</span>
            <span className="bloomberg-kpi-value">
              {agg.posicao ? `#${agg.posicao.toLocaleString("pt-BR")}` : "—"}
            </span>
            <span className="bloomberg-kpi-sub">por % presença entre todos os deps.</span>
          </div>
        </div>

        {/* ── Breakdown de votos ─────────────────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            Composição dos Votos
          </h2>
          <div style={{ maxWidth: "36rem" }}>
            <ProgressBar value={agg.votos_sim}       total={totalVotos} color="hsl(var(--success))"      label="Sim" />
            <ProgressBar value={agg.votos_nao}       total={totalVotos} color="hsl(var(--danger))"       label="Não" />
            <ProgressBar value={agg.votos_abstencao} total={totalVotos} color="hsl(var(--warn))"         label="Abstenção" />
            <ProgressBar value={agg.votos_obstrucao} total={totalVotos} color="hsl(var(--text-caption))" label="Obstrução" />
            {agg.votos_artigo17 > 0 && (
              <ProgressBar value={agg.votos_artigo17} total={totalVotos} color="hsl(var(--border))" label="Art. 17" />
            )}
          </div>
        </div>

        {/* ── Histórico de votações ──────────────────────────────────────── */}
        <div>
          <h2 style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.875rem", fontFamily: "var(--font-sans)" }}>
            Últimas Votações ({ultimasVotacoes.length})
          </h2>

          {ultimasVotacoes.length === 0 ? (
            <p style={{ color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", fontSize: "0.875rem" }}>
              Histórico de votações não disponível.
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="bloomberg-table">
                <thead>
                  <tr>
                    <th style={{ width: "6.5rem" }}>Data</th>
                    <th style={{ width: "8rem" }}>Proposta</th>
                    <th>Descrição</th>
                    <th style={{ width: "7rem" }}>Voto</th>
                    <th style={{ width: "8rem" }}>Orient. Partido</th>
                    <th style={{ width: "7rem" }}>Concordou?</th>
                    <th style={{ width: "2rem" }} />
                  </tr>
                </thead>
                <tbody>
                  {ultimasVotacoes.map((v, i) => (
                    <tr key={i}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                        {fmtData(v.data)}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                        {v.proposicao_autora ?? "—"}
                      </td>
                      <td style={{ fontSize: "0.8125rem", lineHeight: 1.4, maxWidth: "24rem" }}>
                        {v.descricao
                          ? v.descricao.length > 80 ? v.descricao.slice(0, 80) + "…" : v.descricao
                          : <span style={{ color: "hsl(var(--text-caption))" }}>—</span>}
                      </td>
                      <td><BadgeVoto tipo={v.tipo_voto} /></td>
                      <td>
                        {v.orientacao_partido
                          ? <span style={{
                              fontSize: "0.75rem", fontFamily: "var(--font-mono)",
                              color: v.orientacao_partido === "Liberado" ? "hsl(var(--text-caption))" : "hsl(var(--text-body))",
                            }}>{v.orientacao_partido}</span>
                          : <span style={{ color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>—</span>}
                      </td>
                      <td>
                        {v.concordou === null
                          ? <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>—</span>
                          : v.concordou
                          ? <span style={{ fontSize: "0.75rem", color: "hsl(var(--success))" }}>✓</span>
                          : <span style={{ fontSize: "0.75rem", color: "hsl(var(--danger))", fontWeight: 700 }}>✗</span>}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link href={`/voting/${encodeURIComponent(v.votacao_id)}`}
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
        </div>
      </div>
    </>
  );
}
