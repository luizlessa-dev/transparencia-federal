import { notFound } from "next/navigation";
import Link from "next/link";
import { getDespesaDeputado } from "~/services/despesas";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const dep = await getDespesaDeputado(id);
  if (!dep) return { title: "Deputado não encontrado — Transparência Federal" };
  return {
    title: `${dep.nome} — Despesas CEAP — Transparência Federal`,
    description: `Detalhamento das despesas de gabinete (CEAP) de ${dep.nome} (${dep.sigla_partido}/${dep.sigla_uf})`,
  };
}

export default async function ExpensaDeputadoPage({ params }: Props) {
  const { id } = await params;
  const dep = await getDespesaDeputado(id);
  if (!dep) notFound();

  const totalGasto = dep.historico.reduce((acc, h) => acc + h.total_liquido, 0);

  return (
    <>
      {/* Cabeçalho */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>

          {/* Breadcrumb */}
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/expenses" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Despesas</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span>{dep.nome}</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{dep.nome}</h1>
          </div>

          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginBottom: "1.25rem", fontFamily: "var(--font-sans)" }}>
            {dep.sigla_partido} · {dep.sigla_uf} · Câmara dos Deputados
          </p>

          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 700, color: "hsl(var(--text-headline))", letterSpacing: "-0.02em" }}>
              {fmtBRL(totalGasto)}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
              total CEAP (todos os anos)
            </span>
          </div>
        </div>
      </section>

      {/* Histórico por ano */}
      <div className="container" style={{ padding: "2rem 1.5rem 3rem" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
          <h2 style={{ fontSize: "1.125rem", margin: 0, fontFamily: "var(--font-sans)" }}>Histórico por Ano</h2>
        </div>

        {dep.historico.length === 0 ? (
          <p style={{ color: "hsl(var(--text-caption))" }}>Sem dados de despesa disponíveis.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))" }}>
            {dep.historico.map((h) => {
              const cats = h.por_categoria ?? {};
              const catEntries = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5);

              return (
                <div key={h.ano} className="bloomberg-card" style={{ borderRadius: 0, border: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
                      {h.ano}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                      #{h.posicao} no ranking
                    </span>
                  </div>

                  <dl style={{ marginBottom: "1.25rem" }}>
                    {[
                      { label: "Total Líquido", value: fmtBRL(h.total_liquido), bold: true },
                      { label: "Documentos", value: fmtN(h.total_documentos), bold: false },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid hsl(var(--border-subtle))" }}>
                        <dt style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{row.label}</dt>
                        <dd style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: row.bold ? 600 : 400, color: row.bold ? "hsl(var(--text-headline))" : "hsl(var(--text-body))" }}>
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {/* Top categorias */}
                  {catEntries.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.625rem" }}>
                        Categorias
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                        {catEntries.map(([cat, valor]) => {
                          const pct = Math.round((valor / h.total_liquido) * 100);
                          return (
                            <div key={cat}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                                <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>
                                  {cat}
                                </span>
                                <span style={{ fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))", flexShrink: 0 }}>
                                  {fmtBRL(valor)}
                                </span>
                              </div>
                              <div style={{ width: "100%", backgroundColor: "hsl(var(--border))", height: "2px" }}>
                                <div style={{ height: "2px", width: `${Math.min(pct, 100)}%`, backgroundColor: "hsl(var(--primary))" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <Link
            href="/expenses"
            style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}
          >
            ← Voltar às despesas
          </Link>
        </div>
      </div>
    </>
  );
}
