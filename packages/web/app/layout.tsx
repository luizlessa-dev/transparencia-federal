import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Transparência Federal — Emendas, Despesas e Dados do Congresso",
  description: "Explore dados públicos sobre emendas parlamentares, despesas de gabinete e votações da Câmara. Transparência para cidadãos, jornalistas, pesquisadores e ONGs.",
  openGraph: {
    title: "Transparência Federal",
    description: "Dados públicos do Congresso Nacional em um único lugar",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="site-header">
          <div className="container">
            <Link href="/" className="site-title">
              Transparência Federal
            </Link>
            <nav className="site-nav" aria-label="Menu principal">
              <Link href="/" data-current="true">Início</Link>
              <Link href="/amendments">Emendas</Link>
              <Link href="/expenses">Despesas</Link>
              <Link href="/voting">Votações</Link>
              <Link href="/about">Sobre</Link>
            </nav>
          </div>
        </header>
        <main className="main-content">
          <div className="container">
            {children}
          </div>
        </main>
        <footer className="site-footer">
          <div className="container">
            <p>
              <strong>Transparência Federal</strong> — Dados públicos sobre emendas parlamentares, despesas de gabinete
              e votações da Câmara dos Deputados. Para cidadãos, jornalistas, pesquisadores e ONGs.
            </p>
            <p>
              Dados de:
              <a href="https://www.gov.br/transparencia" target="_blank" style={{marginLeft: "0.25rem"}}>Portal da Transparência</a>
              {" • "}
              <a href="https://dadosabertos.camara.leg.br" target="_blank">Câmara dos Deputados</a>
              {" • "}
              <a href="https://github.com" target="_blank">Código Aberto</a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
