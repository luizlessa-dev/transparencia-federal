import Link from "next/link";
import { getRanking } from "~/lib/radar-fab";
import { RankingTable } from "./RankingTable";

export const revalidate = 3600;

export const metadata = {
  title: "Ranking de Autoridades",
  description:
    "Quem mais voa e quem mais custa em aeronaves da FAB. Ranking de autoridades por voos, custo estimado, viagens de fim de semana e internacionais. 2020–hoje.",
  alternates: { canonical: "/ranking" },
};

const ACCENT = "hsl(350 73% 44%)";

function brlFull(n: number): string {
  return `R$ ${n.toLocaleString("pt-BR")}`;
}

export default async function RankingPage() {
  const data = await getRanking();

  if (!data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>
        Ranking indisponível no momento.
      </div>
    );
  }

  const { _meta, ranking } = data;

  // Highlights (líderes em cada dimensão, ignorando "À Disposição" genéricos onde faz sentido)
  const maisVoos = [...ranking].sort((a, b) => b.voos - a.voos)[0];
  const maisCaro = [...ranking].sort((a, b) => b.custo_estimado - a.custo_estimado)[0];
  const maisIntl = [...ranking].sort((a, b) => b.internacionais - a.internacionais)[0];
  const maisFds = [...ranking].filter(r => r.voos >= 30).sort((a, b) => b.fds_pct - a.fds_pct)[0];

  const HL = [
    { titulo: "Mais voos", quem: maisVoos.autoridade, valor: `${maisVoos.voos} voos`, icon: "✈️" },
    { titulo: "Maior custo estimado", quem: maisCaro.autoridade, valor: brlFull(maisCaro.custo_estimado), icon: "💸" },
    { titulo: "Mais voos internacionais", quem: maisIntl.autoridade, valor: `${maisIntl.internacionais} voos`, icon: "🌍" },
    { titulo: "Mais voos em fim de semana", quem: maisFds.autoridade, valor: `${maisFds.fds_pct}% dos voos`, icon: "📅" },
  ];

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Ranking</span>
        </div>
      </div>

      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: ACCENT }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>
              Ranking
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", marginBottom: "0.75rem", lineHeight: 1.15 }}>
            Quem mais voa<br />
            <em style={{ fontStyle: "normal", color: ACCENT }}>e quem mais custa</em>
          </h1>
          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", maxWidth: "40rem", lineHeight: 1.6 }}>
            {_meta.total_autoridades} autoridades, {_meta.total_voos.toLocaleString("pt-BR")} voos
            e <strong>{brlFull(_meta.total_custo_estimado)}</strong> estimados em aeronaves da FAB,
            de {_meta.periodo}. Ordene a tabela por qualquer coluna.
          </p>
        </div>
      </section>

      {/* KPIs */}
      <div className="bloomberg-kpi-grid">
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Voos totais</div>
          <div className="bloomberg-kpi-value">{(_meta.total_voos / 1000).toFixed(1)}K</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>{_meta.periodo}</div>
        </div></div>
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Custo estimado</div>
          <div className="bloomberg-kpi-value">R$ {(_meta.total_custo_estimado / 1_000_000).toFixed(0)}mi</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>base TCU</div>
        </div></div>
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Autoridades</div>
          <div className="bloomberg-kpi-value">{_meta.total_autoridades}</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>cargos distintos</div>
        </div></div>
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Custo médio/voo</div>
          <div className="bloomberg-kpi-value">R$ {Math.round(_meta.total_custo_estimado / _meta.total_voos / 1000)}k</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>estimado</div>
        </div></div>
      </div>

      {/* Highlights */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {HL.map(h => (
              <div key={h.titulo} style={{ padding: "1.25rem", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", borderRadius: "3px" }}>
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{h.icon}</div>
                <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))" }}>{h.titulo}</div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))", margin: "0.25rem 0" }}>{h.quem}</div>
                <div style={{ fontSize: "0.8125rem", color: ACCENT, fontWeight: 600 }}>{h.valor}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabela ordenável */}
      <div className="container" style={{ padding: "2rem 1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ height: "1.75rem", width: "3px", flexShrink: 0, backgroundColor: ACCENT }} />
          <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Ranking completo</h2>
        </div>
        <RankingTable dados={ranking} />

        <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", borderRadius: "3px" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
            Como o custo é estimado
          </div>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", lineHeight: 1.55, margin: 0 }}>
            {_meta.nota_custo} A coluna "À disp." conta os voos registrados como "À Disposição de"
            uma autoridade — categoria opaca em que os passageiros reais não constam nos dados públicos.
          </p>
        </div>
      </div>
    </>
  );
}
