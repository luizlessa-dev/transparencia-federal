import type { ReactNode } from "react";
import Link from "next/link";
import { Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import { NavLinks } from "~/components/NavLinks";
import { AuthButton } from "~/components/AuthButton";
import { IndependenceNotice } from "~/components/IndependenceNotice";
import { LogoMonograma } from "~/components/Logo";
import { getSiteConfigForHost } from "~/lib/site-config";
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
  metadataBase: new URL("https://www.thebrinsider.com"),
  title: "The BR Insider — Emendas, Despesas e Dados do Congresso",
  description:
    "Projeto independente de jornalismo de dados sobre emendas parlamentares, despesas de gabinete e votações do Congresso Nacional. Sem vínculo com o Governo Federal.",
  verification: {
    google: "9PnvZuMDW6G5ahYDK6jWo0QPVREmdbwCgHgHfqw2XpU",
  },
  openGraph: {
    title: "The BR Insider",
    description: "Dados públicos do Congresso Nacional, sob curadoria jornalística independente.",
    url: "https://www.thebrinsider.com",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
    // images: gerado dinamicamente por app/opengraph-image.tsx (federal)
    //        e por app/{almg,alesp,alerj}/opengraph-image.tsx (estaduais)
  },
  twitter: {
    card: "summary_large_image",
    title: "The BR Insider",
    description: "Dados públicos do Congresso Nacional, sob curadoria jornalística independente.",
    // images: o Next.js usa automaticamente o opengraph-image como twitter:image
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const h    = await headers();
  const host = h.get("host") ?? "";
  const isRadar = host.startsWith("radar.");
  const site = getSiteConfigForHost(host);

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

        {/* Aviso de independência — oculto no subdomínio radar */}
        {!isRadar && <IndependenceNotice variant="strip" />}

        {/* Header — oculto no subdomínio radar (tem próprio header) */}
        <header
          style={{
            display: isRadar ? "none" : undefined,
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
              {site.badge === "BR" ? (
                <div style={{ color: "hsl(var(--text-headline))", flexShrink: 0, display: "flex" }}>
                  <LogoMonograma size={40} />
                </div>
              ) : (
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
                  {site.badge}
                </div>
              )}
              <div style={{ display: "none" }} className="sm:block">
                <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
                  {site.kicker}
                </div>
                <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                  {site.shortName}
                </div>
              </div>
            </Link>

            {/* Nav */}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "1rem" }}>
              <NavLinks items={site.nav} />
              <AuthButton />
            </div>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1 }}>
          {children}
        </main>

        {/* Footer — oculto no subdomínio radar */}
        <footer style={{ display: isRadar ? "none" : undefined, borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", marginTop: "auto" }}>
          <div className="container" style={{ padding: "2.5rem 1.5rem", display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2rem" }}>
              {/* Logo + tagline */}
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.75rem" }}>
                  {site.badge === "BR" ? (
                    <div style={{ color: "hsl(var(--text-headline))", flexShrink: 0, display: "flex" }}>
                      <LogoMonograma size={36} />
                    </div>
                  ) : (
                    <div style={{
                      height: "2rem", width: "2rem", borderRadius: "2px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                      fontSize: "0.75rem", fontWeight: 700,
                    }}>
                      {site.badge}
                    </div>
                  )}
                  <span style={{ fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))" }}>
                    {site.shortName}
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", lineHeight: 1.6, color: "hsl(var(--text-caption))", maxWidth: "16rem" }}>
                  {site.tagline}
                </p>
              </div>

              {/* Colunas de links */}
              {site.footer.map((col) => (
                <div key={col.label}>
                  <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))", marginBottom: "0.75rem" }}>
                    {col.label}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {col.links.map((link) => {
                      if (!link.href) return null;
                      if (link.external) {
                        return (
                          <a
                            key={link.label}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", textDecoration: "none" }}
                          >
                            {link.label}
                          </a>
                        );
                      }
                      return (
                        <Link
                          key={link.label}
                          href={link.href}
                          style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", textDecoration: "none" }}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Copyright bar */}
          <div style={{ borderTop: "1px solid hsl(var(--border))" }}>
            <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                {site.copyLeft}
              </p>
              <p style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>
                {site.copyRight}
              </p>
            </div>
          </div>
        </footer>

      </body>
    </html>
  );
}
