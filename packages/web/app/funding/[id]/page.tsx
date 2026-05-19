import { notFound } from "next/navigation";
import Link from "next/link";
import { getTseCandidato, ANOS_ELEITORAIS, type TopDoador } from "~/services/tse";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string }>;
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function pct(part: number, total: number) {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: "4px", backgroundColor: "hsl(var(--border))", borderRadius: "2px", marginTop: "0.25rem" }}>
      <div style={{ height: "100%", width: `${width}%`, backgroundColor: color, borderRadius: "2px", transition: "width 0.3s ease" }} />
    </div>
  );
}

export default async function FundingCandidatoPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const ano = ANOS_ELEITORAIS.includes(Number(sp.ano)) ? Number(sp.ano) : 2022;
  const sqCandidato = decodeURIComponent(id);

  const candidato = await getTseCandidato(sqCandidato, ano);
  if (!candidato) notFound();

  const total = candidato.total_receitas;
  const cargoLabel = candidato.cd_cargo === 5 ? "Senador" : "Deputado Federal";
  const topDoadores: TopDoador[] = candidato.top_doadores ?? [];
  const porOrigem = candidato.por_origem
    ? Object.entries(candidato.por_origem).sort(([, a], [, b]) => b - a).slice(0, 8)
    : [];

  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <Link href={`/funding?ano=${ano}&cargo=${candidato.cd_cargo === 5 ? "senador" : "deputado"}`}
            style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", textDecoration: "none", fontFamily: "var(--font-mono)", marginBottom: "0.75rem", display: "block" }}>
            ← Financiamento Eleitoral {ano}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{candidato.nm_candidato}</h1>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginLeft: "calc(3px + 0.75rem)" }}>
            <span className={candidato.cd_cargo === 5 ? "badge-warn" : "badge-success"}>{cargoLabel}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
              {candidato.sg_uf} · {candidato.sg_partido} · Eleições {ano}
            </span>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* KPIs */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Total Arrecadado</div>
            <div className="bloomberg-kpi-value">{fmtBRL(total)}</div>
            <div className="bloomberg-kpi-sub">{fmtN(candidato.total_registros)} transações</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Ranking Geral</div>
            <div className="bloomberg-kpi-value">#{candidato.posicao ?? "—"}</div>
            <div className="bloomberg-kpi-sub">Entre dep. fed. + senadores</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Ranking {cargoLabel}</div>
            <div className="bloomberg-kpi-value">#{candidato.posicao_cargo ?? "—"}</div>
            <div className="bloomberg-kpi-sub">Entre {cargoLabel}s</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Fundo Público (FEFC)</div>
            <div className="bloomberg-kpi-value">{pct(candidato.fefc, total)}%</div>
            <div className="bloomberg-kpi-sub">{fmtBRL(candidato.fefc)}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

          {/* Fontes de Receita */}
          <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem" }}>
              Fontes de Financiamento
            </h2>

            {[
              { label: "FEFC (Fundo Especial)", value: candidato.fefc, color: "hsl(350 73% 55%)" },
              { label: "Fundo Partidário", value: candidato.fundo_partidario, color: "hsl(var(--primary))" },
              { label: "Recursos Próprios", value: candidato.recursos_proprios, color: "hsl(142 71% 45%)" },
              { label: "Outros Recursos", value: candidato.outros_recursos, color: "hsl(var(--text-caption))" },
            ].map((f) => (
              <div key={f.label} style={{ marginBottom: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>{f.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: "0.875rem", color: "hsl(var(--text-headline))" }}>
                      {fmtBRL(f.value)}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginLeft: "0.375rem" }}>
                      {pct(f.value, total)}%
                    </span>
                  </div>
                </div>
                <ProgressBar value={f.value} max={total} color={f.color} />
              </div>
            ))}
          </div>

          {/* Origem das Receitas */}
          {porOrigem.length > 0 && (
            <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
              <h2 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem" }}>
                Origem das Receitas
              </h2>
              {porOrigem.map(([origem, valor]) => (
                <div key={origem} style={{ marginBottom: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "60%", lineHeight: 1.3 }}>{origem}</span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>
                        {fmtBRL(valor)}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginLeft: "0.375rem" }}>
                        {pct(valor, total)}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={valor} max={total} color="hsl(var(--primary))" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Doadores */}
        {topDoadores.length > 0 && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem" }}>
              Maiores Doadores
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "2rem" }}>#</th>
                    <th>Doador</th>
                    <th style={{ textAlign: "right" }}>Valor</th>
                    <th style={{ textAlign: "right" }}>% do Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topDoadores.map((d, i) => (
                    <tr key={d.cpf_cnpj}>
                      <td style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{d.nome}</div>
                        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                          {d.cpf_cnpj.length > 11 ? "CNPJ" : "CPF"}: {d.cpf_cnpj}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.875rem" }}>
                        {fmtBRL(d.total)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
                        {pct(d.total, total)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Outros anos */}
        <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem" }}>
            Ver em outros anos
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {ANOS_ELEITORAIS.map((a) => (
              <Link key={a} href={`/funding/${encodeURIComponent(sqCandidato)}?ano=${a}`}
                style={{ padding: "0.3rem 0.75rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: a === ano ? 600 : 400, color: a === ano ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))", backgroundColor: a === ano ? "hsl(var(--primary))" : "transparent", border: `1px solid ${a === ano ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "2px", textDecoration: "none" }}>
                {a}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
