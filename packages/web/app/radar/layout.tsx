import type { ReactNode } from "react";
import Link from "next/link";

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
  { label: "Análises",   href: "/radar" },
  { label: "Busca",      href: "/radar/busca" },
  { label: "Histórico",  href: "/radar/historico" },
  { label: "Newsletter", href: "/radar/newsletter" },
];

export default function RadarLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* Barra de identidade Radar FAB */}
      <div
        style={{
          position: "sticky",
          top: "4rem", // abaixo do header do TF
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
            href="/radar"
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
    </div>
  );
}
