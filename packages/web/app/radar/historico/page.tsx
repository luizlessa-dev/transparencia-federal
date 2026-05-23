import Link from "next/link";
import { getHistorico, mdToHtml } from "~/lib/radar-fab";

export const revalidate = 3600;

export const metadata = {
  title: "Histórico 2020–hoje",
  description: "Análise comparativa histórica dos voos de autoridades na FAB: Bolsonaro vs Lula, recordistas, destinos mais frequentes.",
  alternates: { canonical: "/radar/historico" },
};

export default async function RadarHistoricoPage() {
  const md   = await getHistorico();
  const html = md ? mdToHtml(md) : null;

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Histórico</span>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem", maxWidth: "52rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: "hsl(350 73% 44%)" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(350 73% 44%)" }}>
              Análise histórica
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginBottom: "0.75rem" }}>
            Voos Oficiais<br />
            <em style={{ fontStyle: "normal", color: "hsl(350 73% 44%)" }}>2020 – hoje</em>
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", marginBottom: "1.5rem" }}>
            Comparativo por governo, recordistas históricos, destinos mais frequentes e picos mensais.
            Fonte: GABAER · Decreto 10.267/2020.
          </p>
        </div>

        {html ? (
          <>
            <div
              className="radar-content"
              dangerouslySetInnerHTML={{ __html: html }}
              style={{ lineHeight: 1.7 }}
            />
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid hsl(var(--border))" }}>
              <Link
                href="/"
                style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(350 73% 44%)", textDecoration: "none" }}
              >
                ← Ver análises mensais
              </Link>
            </div>
          </>
        ) : (
          <div
            style={{
              padding: "2rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--surface))",
              borderRadius: "2px",
              textAlign: "center",
              color: "hsl(var(--text-caption))",
            }}
          >
            Análise histórica será gerada na próxima execução do pipeline.
          </div>
        )}
      </div>

      <style>{`
        .radar-content .radar-h1 { font-size: 1.625rem; font-family: var(--font-display); color: hsl(var(--text-headline)); margin: 2rem 0 0.75rem; }
        .radar-content .radar-h2 { font-size: 1.1875rem; font-family: var(--font-display); color: hsl(var(--text-headline)); margin: 2rem 0 0.75rem; padding-bottom: 0.375rem; border-bottom: 1px solid hsl(var(--border)); }
        .radar-content .radar-h3 { font-size: 0.9375rem; font-weight: 700; color: hsl(var(--text-headline)); margin: 1.25rem 0 0.5rem; }
        .radar-content .radar-p  { font-size: 0.9375rem; color: hsl(var(--text-body)); margin: 0 0 0.75rem; }
        .radar-content .radar-list { padding-left: 1.25rem; margin: 0.5rem 0 1rem; }
        .radar-content .radar-list li { font-size: 0.9375rem; color: hsl(var(--text-body)); margin-bottom: 0.25rem; }
        .radar-content .radar-table-wrap { overflow-x: auto; margin: 1rem 0; }
        .radar-content code { font-family: var(--font-mono); font-size: 0.8125rem; background: hsl(var(--surface)); padding: 0.125rem 0.375rem; border-radius: 2px; }
        .radar-content a { color: hsl(var(--primary)); }
        .radar-content strong { color: hsl(var(--text-headline)); }
        .radar-content em { color: hsl(350 73% 44%); font-style: normal; font-weight: 600; }
      `}</style>
    </>
  );
}
