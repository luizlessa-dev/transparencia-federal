import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";

export const metadata = {
  metadataBase: new URL("https://radar.transparenciafederal.org"),
  title: { default: "Radar FAB — Voos de Autoridades", template: "%s · Radar FAB" },
  description:
    "Monitoramento serial dos voos de autoridades em aeronaves da Força Aérea Brasileira. Dados abertos, análise automática mensal, base histórica desde 2020.",
  openGraph: {
    title: "Radar FAB",
    description: "Voos de autoridades em aeronaves da FAB — base aberta desde 2020",
    url: "https://radar.transparenciafederal.org",
    siteName: "Radar FAB · Transparência Federal",
    type: "website",
    locale: "pt_BR",
  },
};

const NAV = [
  { label: "Análises",   href: "/" },
  { label: "Busca",      href: "/busca" },
  { label: "Histórico",  href: "/historico" },
  { label: "Newsletter", href: "/newsletter" },
];

export default async function RadarLayout({ children }: { children: ReactNode }) {
  const h       = await headers();
  const host    = h.get("host") ?? "";
  const isRadar = host.startsWith("radar.");

  return (
    <div>
      {/* Barra de identidade Radar FAB */}
      <div
        style={{
          position: "sticky",
          top: isRadar ? "0" : "4rem", // no subdomínio fica no topo; no TF, abaixo do header
          zIndex: 40,
          backgroundColor: "hsl(var(--card))",
          borderBottom: "1px solid hsl(var(--border))",
          borderTop: "2px solid hsl(350 73% 44%)", // --accent vermelho
        }}
      >
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", height: "3rem", gap: "2rem" }}
        >
          {/* Brand */}
          <Link
            href="/"
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", flexShrink: 0 }}
          >
            <div
              style={{
                height: "1.75rem",
                width: "1.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "2px",
                backgroundColor: "hsl(350 73% 44%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.625rem",
                letterSpacing: "0.05em",
              }}
            >
              RF
            </div>
            <span
              style={{
                fontSize: "0.8125rem",
                fontWeight: 700,
                color: "hsl(var(--text-headline))",
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.01em",
              }}
            >
              Radar FAB
            </span>
          </Link>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: "0.125rem" }}>
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "0.375rem 0.75rem",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  color: "hsl(var(--text-body))",
                  textDecoration: "none",
                  borderRadius: "2px",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Badge TF */}
          <div style={{ marginLeft: "auto" }}>
            <Link
              href="/"
              style={{
                fontSize: "0.6875rem",
                color: "hsl(var(--text-caption))",
                textDecoration: "none",
                fontFamily: "var(--font-sans)",
              }}
            >
              ← Transparência Federal
            </Link>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {children}

      {/* Footer próprio — só no subdomínio radar */}
      {isRadar && (
        <footer style={{ borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", marginTop: "auto" }}>
          <div className="container" style={{ padding: "2rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
              <div style={{ height: "1.5rem", width: "1.5rem", borderRadius: "2px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "hsl(350 73% 44%)", color: "#fff", fontSize: "0.5rem", fontWeight: 700 }}>
                RF
              </div>
              <span style={{ fontSize: "0.8125rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))" }}>
                Radar FAB
              </span>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                · um produto do{" "}
                <Link href="https://www.transparenciafederal.com" style={{ color: "hsl(var(--text-caption))" }}>
                  Transparência Federal
                </Link>
              </span>
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              {[
                { label: "Análises", href: "/" },
                { label: "Busca",    href: "/busca" },
                { label: "Histórico",href: "/historico" },
                { label: "Newsletter",href: "/newsletter" },
              ].map(l => (
                <Link key={l.label} href={l.href} style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", textDecoration: "none" }}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="container" style={{ padding: "0.625rem 1.5rem" }}>
              <p style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                Fonte: GABAER / COMAER · Decreto nº 10.267/2020 · LAI nº 12.527/2011
              </p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
