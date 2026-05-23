import { notFound } from "next/navigation";
import Link from "next/link";
import { getAnalise, listarAnalises, formatMes, mdToHtml } from "~/lib/radar-fab";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params;
  const titulo = formatMes(mes);
  return {
    title: `Análise ${titulo}`,
    description: `Análise automática dos voos de autoridades em aeronaves da FAB — ${titulo}. Dados GABAER, Decreto 10.267/2020.`,
    alternates: { canonical: `/radar/${mes}` },
  };
}

export async function generateStaticParams() {
  const analises = await listarAnalises();
  return analises.map(a => ({ mes: a.mes }));
}

export default async function AnaliseMesPage({ params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params;

  // Valida formato
  if (!/^\d{4}-\d{2}$/.test(mes)) notFound();

  const [md, analises] = await Promise.all([
    getAnalise(mes),
    listarAnalises(),
  ]);

  if (!md) notFound();

  const html      = mdToHtml(md);
  const titulo    = formatMes(mes);
  const idx       = analises.findIndex(a => a.mes === mes);
  const anterior  = analises[idx + 1] ?? null;
  const proximo   = analises[idx - 1] ?? null;

  return (
    <>
      {/* ── BREADCRUMB + NAVEGAÇÃO ────────────────────────────── */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>{titulo}</span>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem", maxWidth: "52rem" }}>

        {/* ── HEADER DA ANÁLISE ──────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: "hsl(350 73% 44%)" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(350 73% 44%)" }}>
              Análise mensal
            </span>
          </div>

          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", marginBottom: "0.75rem", lineHeight: 1.2 }}>
            Voos de Autoridades<br />
            <em style={{ fontStyle: "normal", color: "hsl(350 73% 44%)" }}>{titulo}</em>
          </h1>

          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
            Análise automática · Fonte:{" "}
            <a href="https://github.com/FABdadosabertos/GABAER" target="_blank" rel="noopener" style={{ color: "hsl(var(--primary))" }}>
              GABAER
            </a>{" "}
            · Decreto nº 10.267/2020
          </p>
        </div>

        {/* ── CONTEÚDO MARKDOWN ────────────────────────────────── */}
        <div
          className="radar-content"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{ lineHeight: 1.7 }}
        />

        {/* ── NAVEGAÇÃO ENTRE MESES ──────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "3rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid hsl(var(--border))",
            gap: "1rem",
          }}
        >
          {anterior ? (
            <Link
              href={`/${anterior.mes}`}
              style={{
                display: "flex", flexDirection: "column",
                padding: "0.875rem 1rem",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                borderRadius: "2px", textDecoration: "none",
                minWidth: "10rem",
              }}
            >
              <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginBottom: "0.25rem" }}>← Mês anterior</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{anterior.titulo}</span>
            </Link>
          ) : <div />}

          {proximo ? (
            <Link
              href={`/${proximo.mes}`}
              style={{
                display: "flex", flexDirection: "column", alignItems: "flex-end",
                padding: "0.875rem 1rem",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--card))",
                borderRadius: "2px", textDecoration: "none",
                minWidth: "10rem",
              }}
            >
              <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginBottom: "0.25rem" }}>Mês seguinte →</span>
              <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{proximo.titulo}</span>
            </Link>
          ) : <div />}
        </div>

      </div>

      {/* Estilos do conteúdo markdown */}
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
