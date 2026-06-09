import Link from "next/link";
import { getDestinos } from "~/lib/radar-fab";

export const revalidate = 3600;

export const metadata = {
  title: "Mapa de Destinos",
  description:
    "Para onde voam as autoridades na FAB: mapa dos destinos mais frequentes no Brasil, dimensionados por volume de voos. Dados GABAER 2020–2026.",
  alternates: { canonical: "/destinos" },
};

const ACCENT = "hsl(350 73% 44%)";

// Projeção equiretangular sobre o Brasil
const W = 600, H = 620;
const LNG_MIN = -74, LNG_MAX = -34.5;
const LAT_MAX = 5.5, LAT_MIN = -34;
const px = (lng: number) => ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * W;
const py = (lat: number) => ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H;

export default async function DestinosPage() {
  const data = await getDestinos();
  if (!data) {
    return <div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Mapa indisponível.</div>;
  }

  const destinos = data.destinos;
  const maxN = Math.max(...destinos.map(d => d.n), 1);
  // raio proporcional à área (sqrt)
  const raio = (n: number) => 4 + Math.sqrt(n / maxN) * 34;
  const totalMapeado = destinos.reduce((s, d) => s + d.n, 0);

  // rótulos só para os maiores
  const top = [...destinos].sort((a, b) => b.n - a.n);
  const rotular = new Set(top.slice(0, 12).map(d => d.cidade));

  return (
    <>
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span><span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Destinos</span>
        </div>
      </div>

      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: ACCENT }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>Mapa</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", marginBottom: "0.75rem", lineHeight: 1.15 }}>
            Para onde<br /><em style={{ fontStyle: "normal", color: ACCENT }}>elas voam</em>
          </h1>
          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", maxWidth: "40rem", lineHeight: 1.6 }}>
            Os destinos nacionais dos voos de autoridades na FAB, dimensionados pelo volume.
            Cada círculo é uma cidade; quanto maior, mais voos pousaram lá.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2.5rem 1.5rem", display: "grid", gridTemplateColumns: "minmax(280px, 1.4fr) 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Mapa SVG */}
        <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "4px", backgroundColor: "hsl(var(--card))", padding: "0.5rem" }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img" aria-label="Mapa de destinos no Brasil">
            {/* graticule */}
            {[-70, -60, -50, -40].map(lng => (
              <line key={`v${lng}`} x1={px(lng)} y1={0} x2={px(lng)} y2={H} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="2 4" />
            ))}
            {[0, -10, -20, -30].map(lat => (
              <line key={`h${lat}`} x1={0} y1={py(lat)} x2={W} y2={py(lat)} stroke="hsl(var(--border))" strokeWidth={0.5} strokeDasharray="2 4" />
            ))}
            {/* círculos (menores na frente) */}
            {[...destinos].sort((a, b) => b.n - a.n).map(d => (
              <circle key={d.cidade} cx={px(d.lng)} cy={py(d.lat)} r={raio(d.n)}
                fill={ACCENT} fillOpacity={0.28} stroke={ACCENT} strokeWidth={1} strokeOpacity={0.7} />
            ))}
            {/* rótulos dos maiores */}
            {top.slice(0, 12).map(d => (
              <text key={`t${d.cidade}`} x={px(d.lng)} y={py(d.lat) - raio(d.n) - 2}
                textAnchor="middle" fontSize={11} fontWeight={600} fill="hsl(var(--text-headline))"
                style={{ paintOrder: "stroke", stroke: "hsl(var(--card))", strokeWidth: 3 }}>
                {d.cidade}
              </text>
            ))}
          </svg>
          <p style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", textAlign: "center", margin: "0.25rem 0" }}>
            Projeção geográfica aproximada · {data._meta.total_destinos_mapeados} cidades mapeadas
          </p>
        </div>

        {/* Ranking de destinos */}
        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem" }}>
            Destinos mais visitados
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {top.slice(0, 20).map((d, i) => (
              <div key={d.cidade} style={{ display: "flex", alignItems: "center", gap: "0.625rem", fontSize: "0.8125rem" }}>
                <span style={{ width: "1.25rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", fontSize: "0.6875rem", textAlign: "right" }}>{i + 1}</span>
                <span style={{ flex: 1, color: "hsl(var(--text-body))" }}>{d.cidade}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{d.n}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "1rem", lineHeight: 1.5 }}>
            {totalMapeado.toLocaleString("pt-BR")} voos nacionais mapeados.
            Voos internacionais não entram no mapa do Brasil — veja-os nas{" "}
            <Link href="/historico" style={{ color: ACCENT }}>análises históricas</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
