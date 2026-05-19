import { notFound } from "next/navigation";
import Link from "next/link";
import { getCeapsSenador, getCeapsSenadorHistorico, ANOS_CEAPS_SENADO, type TopFornecedor } from "~/services/ceaps-senado";

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

function ProgressBar({ value, max }: { value: number; max: number }) {
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height: "3px", backgroundColor: "hsl(var(--border))", borderRadius: "2px", marginTop: "0.25rem" }}>
      <div style={{ height: "100%", width: `${width}%`, backgroundColor: "hsl(var(--primary))", borderRadius: "2px" }} />
    </div>
  );
}

export default async function SenateExpensesSenadorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const ano = ANOS_CEAPS_SENADO.includes(Number(sp.ano)) ? Number(sp.ano) : 2025;
  const senadorNorm = decodeURIComponent(id);

  const [senador, historico] = await Promise.all([
    getCeapsSenador(senadorNorm, ano),
    getCeapsSenadorHistorico(senadorNorm),
  ]);

  if (!senador && historico.length === 0) notFound();

  const s = senador ?? historico[0];
  const total = senador?.total_reembolsado ?? 0;
  const topFornecedores: TopFornecedor[] = senador?.top_fornecedores ?? [];
  const porTipo = senador?.por_tipo
    ? Object.entries(senador.por_tipo).sort(([, a], [, b]) => b - a).slice(0, 8)
    : [];

  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <Link href={`/senate-expenses?ano=${ano}`}
            style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", textDecoration: "none", fontFamily: "var(--font-mono)", marginBottom: "0.75rem", display: "block" }}>
            ← CEAPS Senado {ano}
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{s.senador}</h1>
          </div>
          <div style={{ marginLeft: "calc(3px + 0.75rem)" }}>
            <span className="badge-neutral">Senador</span>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* KPIs */}
        {senador && (
          <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Total Reembolsado {ano}</div>
              <div className="bloomberg-kpi-value">{fmtBRL(total)}</div>
              <div className="bloomberg-kpi-sub">{fmtN(senador.total_documentos)} documentos</div>
            </div>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Ranking {ano}</div>
              <div className="bloomberg-kpi-value">#{senador.posicao ?? "—"}</div>
              <div className="bloomberg-kpi-sub">Entre os 81 senadores</div>
            </div>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Média por Documento</div>
              <div className="bloomberg-kpi-value">
                {fmtBRL(senador.total_documentos > 0 ? total / senador.total_documentos : 0)}
              </div>
              <div className="bloomberg-kpi-sub">Por reembolso</div>
            </div>
            <div className="bloomberg-kpi">
              <div className="bloomberg-kpi-label">Média Mensal</div>
              <div className="bloomberg-kpi-value">{fmtBRL(total / 12)}</div>
              <div className="bloomberg-kpi-sub">Limite: R$ 45.612/mês</div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

          {/* Categorias */}
          {porTipo.length > 0 && (
            <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
              <h2 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem" }}>
                Por Categoria de Despesa
              </h2>
              {porTipo.map(([tipo, valor]) => (
                <div key={tipo} style={{ marginBottom: "0.875rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "60%", lineHeight: 1.3 }}>
                      {tipo.split(",")[0].trim()}
                    </span>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>
                        {fmtBRL(valor)}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginLeft: "0.375rem" }}>
                        {pct(valor, total)}%
                      </span>
                    </div>
                  </div>
                  <ProgressBar value={valor} max={total} />
                </div>
              ))}
            </div>
          )}

          {/* Histórico por ano */}
          {historico.length > 0 && (
            <div style={{ padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
              <h2 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem" }}>
                Histórico por Ano
              </h2>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Ano</th>
                    <th style={{ textAlign: "right" }}>Total</th>
                    <th style={{ textAlign: "right" }}>Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h) => (
                    <tr key={h.ano}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                        <Link
                          href={`/senate-expenses/${encodeURIComponent(senadorNorm)}?ano=${h.ano}`}
                          style={{ color: h.ano === ano ? "hsl(var(--primary))" : "hsl(var(--text-body))", fontWeight: h.ano === ano ? 600 : 400, textDecoration: "none" }}
                        >
                          {h.ano}
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.8125rem" }}>
                        {fmtBRL(h.total_reembolsado)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
                        #{h.posicao ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Fornecedores */}
        {topFornecedores.length > 0 && (
          <div style={{ marginTop: "1.5rem", padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
            <h2 style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem" }}>
              Maiores Fornecedores
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "2rem" }}>#</th>
                    <th>Fornecedor</th>
                    <th style={{ textAlign: "right" }}>Total Pago</th>
                    <th style={{ textAlign: "right" }}>% do Gasto</th>
                  </tr>
                </thead>
                <tbody>
                  {topFornecedores.map((f, i) => (
                    <tr key={f.cnpj_cpf}>
                      <td style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{f.nome}</div>
                        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                          {f.cnpj_cpf}
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.875rem" }}>
                        {fmtBRL(f.total)}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
                        {pct(f.total, total)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
