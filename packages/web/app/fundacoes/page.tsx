import Link from "next/link";
import { getFundacoesRanking, getFundacoesStats } from "~/services/fundacoes";
import { FundacoesAskBox } from "~/components/FundacoesAskBox";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Observatório das Fundações Partidárias — The BR Insider",
  description:
    "25 fundações e institutos partidários receberam R$ 241,5 milhões em 2024. Veja quais têm sede compartilhada com o partido, aluguel circular e concentração de repasses no fim do ano.",
  alternates: { canonical: "/fundacoes" },
};

function fmtBRL(v: number): string {
  if (v >= 1e9) return `R$ ${(v / 1e9).toFixed(2)} bi`;
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function fmtPct(v: number): string {
  return `${Math.round(v)}%`;
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return null;
  const cor = score >= 2 ? "hsl(var(--danger))" : "hsl(var(--warning))";
  const label = score >= 2 ? "Alto risco" : "Alerta";
  return (
    <span style={{ display: "inline-block", padding: "0.125rem 0.5rem", backgroundColor: cor, color: "white", borderRadius: "2px", fontSize: "0.6875rem", fontWeight: 600 }}>
      {label} {score}/4
    </span>
  );
}

export default async function FundacoesPage() {
  const [stats, ranking] = await Promise.all([
    getFundacoesStats().catch(() => null),
    getFundacoesRanking().catch(() => []),
  ]);

  const totalRepassado = stats?.total_repassado ?? 241_509_267;

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--primary))" }}>
              Observatório
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", marginBottom: "1rem", lineHeight: 1.15 }}>
            Fundações Partidárias<br />
            <em style={{ fontStyle: "normal", color: "hsl(var(--primary))" }}>por dentro.</em>
          </h1>

          <p style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "hsl(var(--text-body))", maxWidth: "36rem", marginBottom: "2rem" }}>
            Cada partido tem uma fundação que recebe no mínimo 20% do Fundo Partidário.
            Em 2024,{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              25 fundações receberam {fmtBRL(totalRepassado)}
            </strong>{" "}
            em repasses. Cruzamos os dados do TSE com a Receita Federal para revelar
            sede compartilhada, aluguel circular e concentração de caixa no fim do ano.
          </p>

          {/* KPIs */}
          <div className="bloomberg-kpi-grid">
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Total repassado</span>
              <span className="bloomberg-kpi-value">{fmtBRL(totalRepassado)}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Fundações mapeadas</span>
              <span className="bloomberg-kpi-value">{stats?.total_fundacoes ?? 25}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Sede compartilhada</span>
              <span className="bloomberg-kpi-value" style={{ color: "hsl(var(--danger))" }}>
                {stats?.com_sede_compartilhada ?? 5}
              </span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Aluguel circular</span>
              <span className="bloomberg-kpi-value" style={{ color: "hsl(var(--warning))" }}>
                {stats?.com_aluguel_circular ?? 2}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CAIXA DE PESQUISA ───────────────────────────────── */}
      <FundacoesAskBox />

      {/* ── RANKING COMPLETO ────────────────────────────────── */}
      <section>
        <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
              Ranking 2024 — todos os repasses
            </h2>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption, var(--foreground)))" }}>
              Fonte: TSE Dados Abertos · Receita Federal
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fundação</th>
                  <th>Partido</th>
                  <th>Presidente</th>
                  <th style={{ textAlign: "right" }}>Total 2024</th>
                  <th style={{ textAlign: "right" }}>Repasses</th>
                  <th style={{ textAlign: "right" }}>% Q4</th>
                  <th style={{ textAlign: "right" }}>Aluguel</th>
                  <th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((f, i) => (
                  <tr key={f.cnpj}>
                    <td style={{ color: "hsl(var(--text-caption, var(--foreground)))", fontVariantNumeric: "tabular-nums" }}>
                      {i + 1}
                    </td>
                    <td>
                      <Link
                        href={`/fundacoes/${f.cnpj}`}
                        style={{ fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--primary))", textDecoration: "none" }}
                      >
                        {f.nome_popular ?? f.cnpj}
                      </Link>
                      {(f.mesmo_endereco_partido || f.mesmo_telefone_partido) && (
                        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--danger))", marginTop: "0.125rem" }}>
                          {f.mesmo_endereco_partido ? "📍 Sede = partido" : ""}
                          {f.mesmo_telefone_partido ? "📞 Tel = partido" : ""}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className="badge-neutral">{f.partido_sigla}</span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                      {f.presidente_nome
                        ? f.presidente_nome.split(" ").slice(0, 2).join(" ")
                        : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(f.total_repassado_2024)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {f.qtd_repasses_2024}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {f.pct_q4_2024 > 0 ? (
                        <span style={{ color: f.pct_q4_2024 > 40 ? "hsl(var(--danger))" : "inherit" }}>
                          {fmtPct(f.pct_q4_2024)}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {f.total_aluguel_2024 > 0
                        ? <span style={{ color: "hsl(var(--warning))" }}>{fmtBRL(f.total_aluguel_2024)}</span>
                        : "—"}
                    </td>
                    <td>
                      <ScoreBadge score={f.score_alertas} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Metodologia */}
          <div style={{ marginTop: "2rem", padding: "1.25rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
            <strong style={{ display: "block", marginBottom: "0.5rem" }}>Metodologia</strong>
            Os dados de repasses vêm do dataset <em>Prestação de Contas Anual Partidária</em> do TSE (exercício 2024).
            Endereços e QSA são da Receita Federal via BrasilAPI.
            "Sede compartilhada" indica que partido e fundação têm o mesmo logradouro e número cadastrados na Receita Federal.
            "Aluguel circular" indica pagamento de aluguel do partido à fundação que ele mesmo financia.
            "Q4" é a concentração dos repasses nos meses de outubro, novembro e dezembro — padrão que pode indicar
            acúmulo de caixa para o ano eleitoral seguinte.
            Score de alertas: 0–4 sinais de risco presentes. Não implica ilegalidade — apenas identifica padrões para investigação.
          </div>
        </div>
      </section>
    </>
  );
}
