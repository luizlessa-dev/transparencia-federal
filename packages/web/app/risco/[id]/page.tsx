import Link from "next/link";
import { notFound } from "next/navigation";
import { getParlamentarRisco } from "~/services/risco";
import { getFrentesDeDeputado, getComissoesDeDeputado } from "~/services/frentes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
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
  return `${Math.round(v * 10) / 10}%`;
}

const corScore = (s: number) =>
  s >= 70 ? "hsl(var(--danger))" : s >= 40 ? "hsl(var(--warning))" : "hsl(var(--success))";

interface DimensaoProps {
  label: string;
  valor: number;
  descricao: string;
  cor: string;
}

function Dimensao({ label, valor, descricao, cor }: DimensaoProps) {
  const v = Math.min(100, Math.max(0, valor));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>
          {label}
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, color: cor }}>
          {Math.round(v)}/100
        </span>
      </div>
      <div style={{ height: "8px", background: "hsl(var(--border))", borderRadius: "2px" }}>
        <div style={{ width: `${v}%`, height: "100%", background: cor, borderRadius: "2px", transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
        {descricao}
      </span>
    </div>
  );
}

export default async function ParlamentarRiscoPage({ params }: Props) {
  const { id } = await params;
  const deputadoId = parseInt(id, 10);

  if (isNaN(deputadoId)) notFound();

  const [dep, frentes, comissoes] = await Promise.all([
    getParlamentarRisco(deputadoId),
    getFrentesDeDeputado(deputadoId),
    getComissoesDeDeputado(deputadoId),
  ]);
  if (!dep) notFound();

  const scoreCor = corScore(dep.score_total);
  const presencaPct = dep.presenca_pct ?? 0;
  const ausencia = Math.round(100 - presencaPct);
  const pctRp9 = Math.round(dep.dim_rp9 * 10) / 10;
  const pctProducao = dep.total_proposicoes && dep.total_proposicoes > 0
    ? Math.round(((dep.total_proposicoes - (dep.total_substantivo ?? 0)) / dep.total_proposicoes) * 100)
    : null;

  const dimDescricoes = {
    ceap: dep.dim_ceap > 0
      ? `Gasta mais que ${Math.round(dep.dim_ceap)}% dos deputados no CEAP`
      : "Sem dados de CEAP disponíveis",
    presenca: dep.presenca_pct != null
      ? `Faltou ${ausencia}% das votações do Plenário`
      : "Sem dados de presença disponíveis",
    producao: pctProducao != null
      ? `${pctProducao}% das proposições são requerimentos ou similares`
      : "Sem dados de produção legislativa",
    financiamento: dep.dim_financiamento > 0
      ? `Arrecadou mais que ${Math.round(dep.dim_financiamento)}% dos candidatos a deputado em 2022`
      : "Sem dados de financiamento TSE",
    rp9: pctRp9 > 0
      ? `${pctRp9}% do valor das emendas individuais é RP9 (orçamento secreto)`
      : "Sem emendas do relator identificadas",
  };

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "1.5rem 1.5rem 1.5rem" }}>
          <Link
            href="/risco"
            style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))", textDecoration: "none", display: "inline-block", marginBottom: "1rem" }}
          >
            ← Ranking de Risco
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {dep.url_foto ? (
              <img
                src={dep.url_foto}
                alt={dep.nome}
                style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: "48px", height: "48px", borderRadius: "50%",
                backgroundColor: "hsl(var(--surface))",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.125rem", fontWeight: 700, color: "hsl(var(--text-caption))",
                border: "1px solid hsl(var(--border))", flexShrink: 0,
              }}>
                {dep.nome.charAt(0).toUpperCase()}
              </div>
            )}

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem", lineHeight: 1.2 }}>{dep.nome}</h1>
              <span style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
                {dep.sigla_partido} · {dep.sigla_uf} · 57ª Legislatura
              </span>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 800, color: scoreCor, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                {dep.score_total.toFixed(1)}
              </div>
              <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.25rem" }}>
                Score de Risco
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* ── KPIs ─────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
          <div className="bloomberg-kpi bloomberg-card">
            <span className="bloomberg-kpi-label">Score Total</span>
            <span className="bloomberg-kpi-value" style={{ color: scoreCor }}>{dep.score_total.toFixed(1)}</span>
          </div>
          <div className="bloomberg-kpi bloomberg-card">
            <span className="bloomberg-kpi-label">CEAP 2024</span>
            <span className="bloomberg-kpi-value">{fmtBRL(dep.ceap_total_2024)}</span>
          </div>
          <div className="bloomberg-kpi bloomberg-card">
            <span className="bloomberg-kpi-label">Presença Plenário</span>
            <span className="bloomberg-kpi-value">{fmtPct(dep.presenca_pct)}</span>
          </div>
          <div className="bloomberg-kpi bloomberg-card">
            <span className="bloomberg-kpi-label">Emendas RP9</span>
            <span className="bloomberg-kpi-value" style={{ color: dep.dim_rp9 > 0 ? "hsl(var(--danger))" : undefined }}>
              {fmtPct(dep.dim_rp9)}
            </span>
          </div>
          <div className="bloomberg-kpi bloomberg-card">
            <span className="bloomberg-kpi-label">Arrecadação TSE 2022</span>
            <span className="bloomberg-kpi-value">{fmtBRL(dep.financiamento_total)}</span>
          </div>
        </div>

        {/* ── Dimensões do Score ───────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1.25rem", color: "hsl(var(--text-headline))" }}>
            Dimensões do Score
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Dimensao
              label="Gastos CEAP"
              valor={dep.dim_ceap}
              descricao={dimDescricoes.ceap}
              cor="hsl(var(--primary))"
            />
            <Dimensao
              label="Ausência em Votações"
              valor={dep.dim_presenca}
              descricao={dimDescricoes.presenca}
              cor="hsl(var(--warning))"
            />
            <Dimensao
              label="Produção Legislativa"
              valor={dep.dim_producao}
              descricao={dimDescricoes.producao}
              cor="hsl(var(--primary))"
            />
            <Dimensao
              label="Financiamento de Campanha"
              valor={dep.dim_financiamento}
              descricao={dimDescricoes.financiamento}
              cor="hsl(var(--warning))"
            />
            <Dimensao
              label="Emendas RP9"
              valor={dep.dim_rp9}
              descricao={dimDescricoes.rp9}
              cor="hsl(var(--danger))"
            />
          </div>
        </div>

        {/* ── Alertas ──────────────────────────────────────────────────── */}
        {dep.fornecedores_sancionados > 0 && (
          <div style={{
            padding: "0.875rem 1rem",
            backgroundColor: "hsl(var(--danger) / 0.08)",
            border: "1px solid hsl(var(--danger) / 0.3)",
            borderRadius: "2px",
            marginBottom: "0.75rem",
            fontSize: "0.875rem",
            color: "hsl(var(--danger))",
            fontFamily: "var(--font-sans)",
          }}>
            ⚠ {dep.fornecedores_sancionados} fornecedor(es) do CEAP com sanção no governo federal
          </div>
        )}

        {dep.doadores_sancionados > 0 && (
          <div style={{
            padding: "0.875rem 1rem",
            backgroundColor: "hsl(var(--warning) / 0.08)",
            border: "1px solid hsl(var(--warning) / 0.3)",
            borderRadius: "2px",
            marginBottom: "0.75rem",
            fontSize: "0.875rem",
            color: "hsl(var(--warning))",
            fontFamily: "var(--font-sans)",
          }}>
            ⚠ {dep.doadores_sancionados} doador(es) de campanha com sanção no governo federal
          </div>
        )}

        {/* ── Dados Brutos ─────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 1rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Dados Brutos
          </h2>
          <table className="bloomberg-table">
            <tbody>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>CEAP total 2024</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(dep.ceap_total_2024)}</td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Passagens aéreas 2024</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(dep.passagens_aereas_2024)}</td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Presença em votações</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtPct(dep.presenca_pct)}</td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Concordância com partido</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtPct(dep.concordancia_partido)}</td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Total de proposições</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {dep.total_proposicoes != null ? dep.total_proposicoes.toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Proposições substantivas</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                  {dep.total_substantivo != null ? dep.total_substantivo.toLocaleString("pt-BR") : "—"}
                </td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Arrecadação total TSE 2022</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(dep.financiamento_total)}</td>
              </tr>
              <tr>
                <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>FEFC (fundo eleitoral)</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(dep.financiamento_fefc)}</td>
              </tr>
              {dep.patrimonio_2022 != null && (
                <tr>
                  <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Patrimônio declarado 2022</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRL(dep.patrimonio_2022)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Mandatos & contexto ──────────────────────────────────────── */}
        {(dep.total_legislaturas != null || dep.cargo_anterior) && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 1rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Histórico
            </h2>
            <table className="bloomberg-table">
              <tbody>
                {dep.total_legislaturas != null && (
                  <tr>
                    <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Legislaturas federais</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>
                      {dep.total_legislaturas}ª desde {dep.primeira_legislatura ?? "—"}
                    </td>
                  </tr>
                )}
                {dep.cargo_anterior && (
                  <tr>
                    <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Ocupação anterior</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{dep.cargo_anterior}</td>
                  </tr>
                )}
                {dep.total_frentes != null && dep.total_frentes > 0 && (
                  <tr>
                    <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Frentes parlamentares</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{dep.total_frentes}</td>
                  </tr>
                )}
                {dep.total_comissoes != null && dep.total_comissoes > 0 && (
                  <tr>
                    <td style={{ color: "hsl(var(--text-caption))", fontWeight: 500 }}>Comissões permanentes</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{dep.total_comissoes}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Frentes parlamentares ─────────────────────────────────────── */}
        {frentes.length > 0 && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Frentes parlamentares ({frentes.length})
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem" }}>
              {frentes.map((f) => (
                <Link
                  key={f.frente_id}
                  href={`/frentes/${f.frente_id}`}
                  style={{
                    display: "inline-block",
                    padding: "0.2rem 0.5rem",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "2px",
                    fontSize: "0.6875rem",
                    color: "hsl(var(--primary))",
                    textDecoration: "none",
                    lineHeight: 1.4,
                    maxWidth: "240px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={f.titulo}
                >
                  {f.titulo}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Comissões ─────────────────────────────────────────────────── */}
        {comissoes.length > 0 && (
          <div className="bloomberg-card" style={{ padding: "1.25rem", marginTop: "1.5rem" }}>
            <h2 style={{ fontSize: "0.875rem", fontWeight: 700, margin: "0 0 0.875rem", color: "hsl(var(--text-headline))", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Comissões permanentes
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {comissoes.map((c) => (
                <div key={c.comissao_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8125rem" }}>
                  <span style={{ color: "hsl(var(--text-body))" }}>
                    {c.sigla ? <strong style={{ fontFamily: "var(--font-mono)", marginRight: "0.375rem" }}>{c.sigla}</strong> : null}
                    {c.nome}
                  </span>
                  {c.titulo && (
                    <span className="badge-neutral" style={{ fontSize: "0.625rem", flexShrink: 0, marginLeft: "0.5rem" }}>
                      {c.titulo}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <Link
            href="/risco"
            style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))", textDecoration: "none" }}
          >
            ← Voltar ao Ranking de Risco
          </Link>
        </div>

        <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", fontFamily: "var(--font-mono)" }}>
          Score = CEAP×0,30 + Ausência×0,20 + Produção×0,15 + Financiamento×0,20 + RP9×0,15 · Dimensões normalizadas 0–100 via percentil entre pares
        </p>
      </div>
    </>
  );
}
