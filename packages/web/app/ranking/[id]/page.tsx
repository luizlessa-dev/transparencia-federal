import { notFound } from "next/navigation";
import Link from "next/link";
import { getParlamentar } from "~/services/ranking";
import { getTopEmendasParlamentar } from "~/services/emendas";

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

function tipoLabel(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("relator")) return "RP9";
  if (t.includes("bancada")) return "Bancada";
  if (t.includes("comissão") || t.includes("comissao")) return "Comissão";
  if (t.includes("individual")) return "Individual";
  return tipo.split(" ")[0];
}

function tipoBadge(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("relator")) return "badge-danger";
  if (t.includes("bancada")) return "badge-warn";
  if (t.includes("comissão") || t.includes("comissao")) return "badge-neutral";
  return "badge-neutral";
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) return { title: "Parlamentar não encontrado — Transparência Federal" };
  const { parlamentar: p } = resultado;
  return {
    title: `${p.nome_parlamentar || p.nome} — Transparência Federal`,
    description: `Emendas e ranking de ${p.nome_parlamentar || p.nome} (${p.partido}/${p.uf})`,
  };
}

export default async function ParlamentarPage({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) notFound();

  const { parlamentar: p, historico } = resultado;
  const nomeExibido = p.nome_parlamentar || p.nome;
  const totalEmpenhado = historico.reduce((acc, h) => acc + h.metricas.valor_empenhado, 0);
  const casa = p.casa_legislativa === "senado" ? "Senado Federal" : "Câmara dos Deputados";

  const topEmendas = await getTopEmendasParlamentar(nomeExibido, 10);

  return (
    <>
      {/* Cabeçalho */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>

          {/* Breadcrumb */}
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/ranking" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Ranking</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span>{nomeExibido}</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>{nomeExibido}</h1>
            {!p.ativo && (
              <span className="badge-neutral" style={{ marginLeft: "0.5rem" }}>Inativo</span>
            )}
          </div>

          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginBottom: "1.25rem", fontFamily: "var(--font-sans)" }}>
            {p.partido} · {p.uf} · {casa}
          </p>

          <div style={{ display: "inline-flex", alignItems: "baseline", gap: "0.5rem" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", fontWeight: 700, color: "hsl(var(--text-headline))", letterSpacing: "-0.02em" }}>
              {fmtBRL(totalEmpenhado)}
            </span>
            <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
              total empenhado (todos os anos)
            </span>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem" }}>

        {/* Histórico por ano — cards clicáveis */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
          <h2 style={{ fontSize: "1.125rem", margin: 0, fontFamily: "var(--font-sans)" }}>Histórico por Ano</h2>
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            · clique para ver todas as emendas do ano
          </span>
        </div>

        {historico.length === 0 ? (
          <p style={{ color: "hsl(var(--text-caption))" }}>Este parlamentar não aparece no ranking de emendas.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))", marginBottom: "2.5rem" }}>
            {historico.map((h) => {
              const execColor =
                h.metricas.taxa_execucao >= 80 ? "hsl(142 60% 65%)"
                : h.metricas.taxa_execucao >= 50 ? "hsl(38 90% 60%)"
                : "hsl(350 73% 65%)";
              const badgeCls = h.metricas.taxa_execucao >= 80 ? "badge-success" : h.metricas.taxa_execucao >= 50 ? "badge-warn" : "badge-danger";

              return (
                <Link
                  key={h.ano}
                  href={`/amendments?ano=${h.ano}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div className="bloomberg-card" style={{ borderRadius: 0, border: "none", cursor: "pointer" }}>

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
                        { label: "Empenhado", value: fmtBRL(h.metricas.valor_empenhado), bold: true },
                        { label: "Pago", value: fmtBRL(h.metricas.valor_pago), bold: false },
                        { label: "Liquidado", value: fmtBRL(h.metricas.valor_liquidado), bold: false },
                        { label: "Emendas", value: String(h.metricas.total_emendas), bold: false },
                      ].map((row) => (
                        <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid hsl(var(--border-subtle))" }}>
                          <dt style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{row.label}</dt>
                          <dd style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: row.bold ? 600 : 400, color: row.bold ? "hsl(var(--text-headline))" : "hsl(var(--text-body))" }}>
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    {/* Taxa de execução */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))" }}>
                          Taxa de execução
                        </span>
                        <span className={badgeCls}>{h.metricas.taxa_execucao}%</span>
                      </div>
                      <div style={{ width: "100%", backgroundColor: "hsl(var(--border))", height: "3px" }}>
                        <div style={{
                          height: "3px",
                          width: `${Math.min(h.metricas.taxa_execucao, 100)}%`,
                          backgroundColor: execColor,
                          transition: "width 0.4s ease",
                        }} />
                      </div>
                    </div>

                    <div style={{ marginTop: "1rem", fontSize: "0.6875rem", color: "hsl(var(--primary))", fontFamily: "var(--font-sans)", fontWeight: 500 }}>
                      Ver todas as emendas de {h.ano} →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Maiores emendas individuais */}
        {topEmendas.length > 0 && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
              <h2 style={{ fontSize: "1.125rem", margin: 0, fontFamily: "var(--font-sans)" }}>Maiores Emendas</h2>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
                · top 10 por valor empenhado, todos os anos
              </span>
            </div>

            <div style={{ overflowX: "auto", border: "1px solid hsl(var(--border))" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th style={{ width: "3.5rem" }}>Ano</th>
                    <th>Objeto / Localidade</th>
                    <th>Função</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Empenhado</th>
                    <th style={{ textAlign: "right" }}>Execução</th>
                  </tr>
                </thead>
                <tbody>
                  {topEmendas.map((e) => {
                    const exec = e.valor_empenhado > 0
                      ? Math.round((e.valor_pago / e.valor_empenhado) * 100)
                      : 0;
                    const execCls = exec >= 80 ? "badge-success" : exec >= 50 ? "badge-warn" : "badge-danger";
                    const localidade = [e.municipio, e.uf].filter(Boolean).join("/") || e.localidade || "—";
                    return (
                      <tr key={e.id}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                          {e.ano}
                        </td>
                        <td>
                          <Link
                            href={`/amendments/${e.id}`}
                            style={{ fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none", fontSize: "0.8125rem" }}
                          >
                            {localidade}
                          </Link>
                          {e.subfuncao && (
                            <span style={{ display: "block", fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>
                              {e.subfuncao}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", fontFamily: "var(--font-sans)" }}>
                          {e.funcao ?? "—"}
                        </td>
                        <td>
                          <span className={tipoBadge(e.tipo_emenda)}>{tipoLabel(e.tipo_emenda)}</span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                          {fmtBRL(e.valor_empenhado)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className={execCls}>{exec}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ marginTop: "2rem" }}>
          <Link
            href="/ranking"
            style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}
          >
            ← Voltar ao ranking
          </Link>
        </div>
      </div>
    </>
  );
}
