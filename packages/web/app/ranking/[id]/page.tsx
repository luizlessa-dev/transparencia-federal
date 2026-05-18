import { notFound } from "next/navigation";
import Link from "next/link";
import { getParlamentar } from "~/services/ranking";

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

  return (
    <section className="section">
      {/* Breadcrumb */}
      <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
        <Link href="/ranking" style={{ color: "var(--color-primary)" }}>Ranking</Link>
        {" / "}
        {nomeExibido}
      </p>

      {/* Cabeçalho */}
      <div style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <h1 className="page-title">{nomeExibido}</h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
          {p.partido} · {p.uf} · {casa}
          {!p.ativo && (
            <span style={{
              marginLeft: "0.75rem",
              padding: "0.1em 0.5em",
              fontSize: "0.8125rem",
              backgroundColor: "#f5f5f5",
              border: "1px solid #ddd",
              borderRadius: "3px",
              color: "#777",
            }}>
              Inativo
            </span>
          )}
        </p>
        <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--color-primary)", marginBottom: 0 }}>
          {fmtBRL(totalEmpenhado)}
          <span style={{ fontSize: "0.9375rem", fontWeight: 400, color: "var(--color-text-secondary)", marginLeft: "0.5rem" }}>
            total empenhado (todos os anos)
          </span>
        </p>
      </div>

      {/* Histórico por ano */}
      <h2 style={{ marginTop: 0 }}>Histórico por Ano</h2>

      {historico.length === 0 ? (
        <p>Este parlamentar não aparece no ranking de emendas.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginTop: "1rem" }}>
          {historico.map((h) => (
            <div
              key={h.ano}
              style={{
                background: "#fff",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1a1a1a" }}>{h.ano}</span>
                <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                  #{h.posicao} no ranking
                </span>
              </div>

              <table style={{ marginBottom: "1rem", fontSize: "0.9375rem" }}>
                <tbody>
                  <tr>
                    <td style={{ color: "var(--color-text-secondary)", paddingBottom: "0.35rem", border: "none" }}>Empenhado</td>
                    <td style={{ fontWeight: 600, textAlign: "right", border: "none", paddingBottom: "0.35rem" }}>{fmtBRL(h.metricas.valor_empenhado)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--color-text-secondary)", paddingBottom: "0.35rem", border: "none" }}>Pago</td>
                    <td style={{ textAlign: "right", border: "none", paddingBottom: "0.35rem" }}>{fmtBRL(h.metricas.valor_pago)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--color-text-secondary)", paddingBottom: "0.35rem", border: "none" }}>Liquidado</td>
                    <td style={{ textAlign: "right", border: "none", paddingBottom: "0.35rem" }}>{fmtBRL(h.metricas.valor_liquidado)}</td>
                  </tr>
                  <tr>
                    <td style={{ color: "var(--color-text-secondary)", border: "none" }}>Emendas</td>
                    <td style={{ textAlign: "right", border: "none" }}>{h.metricas.total_emendas}</td>
                  </tr>
                </tbody>
              </table>

              {/* Barra de execução */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginBottom: "0.35rem" }}>
                  <span>Taxa de execução</span>
                  <span style={{ fontWeight: 600 }}>{h.metricas.taxa_execucao}%</span>
                </div>
                <div style={{ width: "100%", backgroundColor: "#eee", borderRadius: "3px", height: "6px" }}>
                  <div
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      width: `${Math.min(h.metricas.taxa_execucao, 100)}%`,
                      backgroundColor:
                        h.metricas.taxa_execucao >= 80 ? "#228B22" :
                        h.metricas.taxa_execucao >= 50 ? "#e65100" : "#c62828",
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p style={{ marginTop: "2rem" }}>
        <Link href="/ranking">← Voltar ao ranking</Link>
      </p>
    </section>
  );
}
