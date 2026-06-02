/**
 * Índice de matérias investigativas do The BR Insider.
 * Rota: /noticias
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Investigações — The BR Insider",
  description:
    "Matérias investigativas do The BR Insider: cruzamento de dados públicos para revelar irregularidades no uso de recursos do Estado.",
  alternates: { canonical: "https://www.thebrinsider.com/noticias" },
  openGraph: {
    title: "Investigações — The BR Insider",
    description: "Jornalismo de dados: irregularidades reveladas por cruzamento de fontes abertas.",
    url: "https://www.thebrinsider.com/noticias",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

const MATERIAS = [
  {
    href: "/noticias/nutridores-mg",
    titulo: "MG pagou R$ 231 mi a empresa condenada por burlar a proibição de contratar",
    resumo:
      "A NUTRIDORES recebeu 166 empenhos da SEJUSP após a condenação pela CGE-MG transitar em julgado administrativamente. A ironia: a empresa foi punida por burlar o direito de contratar — e seguiu recebendo.",
    tag: "Governo MG",
    data: "2 jun. 2026",
  },
];

export default function NoticiasPage() {
  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "860px" }}>
          <h1 style={{ fontSize: "1.625rem", margin: 0 }}>Investigações</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "600px" }}>
            Matérias produzidas a partir do cruzamento de bases de dados públicas. Todos os dados
            são verificáveis nas fontes originais.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "860px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {MATERIAS.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="bloomberg-card"
              style={{ padding: "1.25rem 1.5rem", textDecoration: "none", display: "block" }}
            >
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", marginBottom: "0.5rem" }}>
                <span className="badge-neutral" style={{ fontSize: "0.6875rem" }}>{m.tag}</span>
                <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{m.data}</span>
              </div>
              <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: "0 0 0.375rem", color: "hsl(var(--text-headline))", lineHeight: 1.3 }}>
                {m.titulo}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: 0, lineHeight: 1.55 }}>
                {m.resumo}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
