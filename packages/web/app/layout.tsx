import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Playfair_Display } from "next/font/google";
import { NavLinks } from "~/components/NavLinks";
import { AuthButton } from "~/components/AuthButton";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata = {
  title: "Transparência Federal — Emendas, Despesas e Dados do Congresso",
  description:
    "Explore dados públicos sobre emendas parlamentares, despesas de gabinete e votações da Câmara. Transparência para cidadãos, jornalistas, pesquisadores e ONGs.",
  openGraph: {
    title: "Transparência Federal",
    description: "Dados públicos do Congresso Nacional em um único lugar",
    type: "website",
  },
};

const FOOTER_COLS = [
  {
    label: "Explorar",
    links: [
      { label: "Ranking Nacional", href: "/ranking" },
      { label: "Emendas Parlamentares", href: "/amendments" },
      { label: "Gastos de Gabinete", href: "/expenses" },
      { label: "Sobre o Projeto", href: "/about" },
    ],
  },
  {
    label: "Fontes de Dados",
    links: [
      { label: "Portal da Transparência", href: "https://portaldatransparencia.gov.br", external: true },
      { label: "Câmara dos Deputados", href: "https://dadosabertos.camara.leg.br", external: true },
      { label: "Senado Federal", href: "https://legis.senado.leg.br/dadosabertos", external: true },
    ],
  },
];

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`dark ${inter.variable} ${playfair.variable}`}
      style={
        {
          "--font-sans": "var(--font-inter), system-ui, sans-serif",
          "--font-display": "var(--font-playfair), Georgia, serif",
        } as React.CSSProperties
      }
    >
      <body style={{ backgroundColor: "hsl(var(--background))", color: "hsl(var(--foreground))" }}>

        {/* Barra de acento no topo */}
        <div className="accent-line" />

        {/* Header */}
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            backgroundColor: "hsl(var(--card))",
            borderBottom: "1px solid hsl(var(--border))",
          }}
        >
          <div className="container" style={{ display: "flex", alignItems: "center", height: "4rem", gap: "2rem" }}>

            {/* Logo */}
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none" }}>
              <div
                style={{
                  height: "2.25rem",
                  width: "2.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "2px",
                  backgroundColor: "hsl(var(--primary))",
                  color: "hsl(var(--primary-foreground))",
                  fontWeight: 700,
                  fontSize: "0.8125rem",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                }}
              >
                TF
              </div>
              <div style={{ display: "none" }} className="sm:block">
                <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
                  Observatório
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                  Transparência Federal
                </div>
              </div>
            </Link>

            {/* Nav */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
              <NavLinks />
              <AuthButton />
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", marginTop: "auto" }}>
          <div className="container" style={{ padding: "2.5rem 1.5rem", display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem" }}>
              {/* Logo + tagline */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  <div style={{
                    height: "2rem", width: "2rem", borderRadius: "2px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                    fontSize: "0.75rem", fontWeight: 700,
                  }}>
                    TF
                  </div>
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))" }}>
                    Transparência Federal
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "hsl(var(--text-caption))", maxWidth: "13rem" }}>
                  Dados públicos sobre o Congresso Nacional, organizados para você.
                </p>
              </div>

              {/* Colunas de links */}
              {FOOTER_COLS.map((col) => (
                <div key={col.label}>
                  <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))", marginBottom: "0.75rem" }}>
                    {col.label}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {col.links.map((link) =>
                      "external" in link && link.external ? (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", textDecoration: "none" }}
                        >
                          {link.label}
                        </a>
                      ) : (
                        <Link
                          key={link.label}
                          href={link.href}
                          style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", textDecoration: "none" }}
                        >
                          {link.label}
                        </Link>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Copyright bar */}
          <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                Lei de Acesso à Informação · Lei nº 12.527/2011
              </p>
              <p style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>
                Dados: Portal da Transparência · Câmara dos Deputados
              </p>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
