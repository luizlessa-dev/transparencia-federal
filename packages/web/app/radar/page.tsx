import Link from "next/link";
import { listarAnalises, formatMes } from "~/lib/radar-fab";

export const revalidate = 3600;

export const metadata = {
  title: "Radar FAB — Voos de Autoridades",
  description:
    "Monitoramento serial dos voos de autoridades em aeronaves da FAB. Dados GABAER desde 2020, análise automática mensal.",
  alternates: { canonical: "/radar" },
};

export default async function RadarHomePage() {
  const analises = await listarAnalises();
  const ultima   = analises[0];

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(350 73% 44%)" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(350 73% 44%)", fontFamily: "var(--font-sans)" }}>
              Produto jornalístico · Transparência Federal
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBottom: "1rem" }}>
            Quem voou na<br />
            <em style={{ fontStyle: "normal", color: "hsl(350 73% 44%)" }}>aeronave do governo?</em>
          </h1>

          <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "hsl(var(--text-body))", marginBottom: "2rem", maxWidth: "38rem" }}>
            Monitoramento serial dos voos de autoridades em aeronaves da Força Aérea Brasileira — base histórica desde 2020, análise automática mensal, dados abertos via{" "}
            <a href="https://github.com/FABdadosabertos/GABAER" target="_blank" rel="noopener" style={{ color: "hsl(var(--primary))" }}>GABAER</a>.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {ultima && (
              <Link
                href={`/radar/${ultima.mes}`}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.375rem",
                  padding: "0.75rem 1.25rem", fontSize: "0.875rem", fontWeight: 600,
                  backgroundColor: "hsl(350 73% 44%)", color: "#fff",
                  borderRadius: "2px", textDecoration: "none",
                }}
              >
                Última análise: {ultima.titulo} →
              </Link>
            )}
            <Link
              href="/radar/busca"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                padding: "0.75rem 1.25rem", fontSize: "0.875rem", fontWeight: 500,
                border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--text-body))", borderRadius: "2px", textDecoration: "none",
              }}
            >
              Buscar por autoridade
            </Link>
            <Link
              href="/radar/historico"
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.375rem",
                padding: "0.75rem 1.25rem", fontSize: "0.875rem", fontWeight: 500,
                border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--text-body))", borderRadius: "2px", textDecoration: "none",
              }}
            >
              Comparativo histórico
            </Link>
          </div>
        </div>
      </section>

      {/* ── KPI STRIP ──────────────────────────────────────────── */}
      <div className="bloomberg-kpi-grid">
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Voos monitorados</div>
            <div className="bloomberg-kpi-value">10.012+</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>2020–hoje</div>
          </div>
        </div>
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Custo médio/missão</div>
            <div className="bloomberg-kpi-value">R$ 38,1k</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>TCU TC 008.687/2024-2</div>
          </div>
        </div>
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Análises disponíveis</div>
            <div className="bloomberg-kpi-value">{analises.length}</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>mensais + histórico</div>
          </div>
        </div>
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Atualização</div>
            <div className="bloomberg-kpi-value">Diária</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>GitHub Actions 06h BRT</div>
          </div>
        </div>
      </div>

      {/* ── ANÁLISES MENSAIS ───────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(350 73% 44%)" }} />
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Análises Mensais</h2>
          </div>

          {analises.length === 0 ? (
            <p style={{ color: "hsl(var(--text-caption))" }}>Carregando análises…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))" }}>
              {analises.map((a, idx) => (
                <Link
                  key={a.mes}
                  href={`/radar/${a.mes}`}
                  style={{
                    display: "block",
                    padding: "1.25rem",
                    backgroundColor: "hsl(var(--card))",
                    textDecoration: "none",
                    position: "relative",
                  }}
                >
                  {idx === 0 && (
                    <span
                      style={{
                        display: "inline-block",
                        marginBottom: "0.5rem",
                        padding: "0.125rem 0.5rem",
                        fontSize: "0.625rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        backgroundColor: "hsl(350 73% 44%)",
                        color: "#fff",
                        borderRadius: "2px",
                      }}
                    >
                      Mais recente
                    </span>
                  )}
                  <div style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))" }}>
                    {a.titulo}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "hsl(350 73% 44%)", marginTop: "0.5rem", fontWeight: 600 }}>
                    Ver análise →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SOBRE A BASE ──────────────────────────────────────── */}
      <section>
        <div className="container" style={{ padding: "2.5rem 1.5rem", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem" }}>

          {[
            {
              icon: "✈️",
              titulo: "Fonte primária",
              texto: "Dados do repositório público FABdadosabertos/GABAER, publicados pelo COMAER com base no Decreto nº 10.267/2020.",
            },
            {
              icon: "🔁",
              titulo: "Atualização automática",
              texto: "GitHub Actions verifica diariamente (06h BRT) se há CSV novo ou atualizado no GABAER e gera análise automaticamente.",
            },
            {
              icon: "📊",
              titulo: "Referência de custo",
              texto: "Estimativas baseadas no acórdão TCU TC 008.687/2024-2: custo médio de R$ 38.100 por missão entre 2020–2024.",
            },
          ].map(item => (
            <div
              key={item.titulo}
              style={{
                padding: "1.5rem",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                borderRadius: "2px",
              }}
            >
              <div style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>{item.icon}</div>
              <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, marginBottom: "0.5rem", color: "hsl(var(--text-headline))" }}>
                {item.titulo}
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.6, margin: 0 }}>
                {item.texto}
              </p>
            </div>
          ))}

        </div>
      </section>
    </>
  );
}
