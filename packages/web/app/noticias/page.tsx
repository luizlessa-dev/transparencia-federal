/**
 * Índice editorial do The BR Insider — investigações próprias e curadoria.
 * Rota: /noticias
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getNoticias, type NoticiaCard } from "~/services/noticias";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notícias — The BR Insider",
  description:
    "Investigações próprias e curadoria editorial do The BR Insider: política, economia e dados públicos.",
  alternates: { canonical: "https://www.thebrinsider.com/noticias" },
  openGraph: {
    title: "Notícias — The BR Insider",
    description: "Investigações e curadoria: política, economia e dados públicos.",
    url: "https://www.thebrinsider.com/noticias",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

function NoticiaItem({ m }: { m: NoticiaCard }) {
  const isCuradoria = m.tipo === "curadoria";
  const href = isCuradoria && m.fonte_url ? m.fonte_url : `/noticias/${m.slug}`;
  const target = isCuradoria && m.fonte_url ? "_blank" : undefined;
  const rel = isCuradoria && m.fonte_url ? "noopener noreferrer" : undefined;

  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className="bloomberg-card"
      style={{ padding: "1.25rem 1.5rem", textDecoration: "none", display: "block" }}
    >
      <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", marginBottom: "0.5rem" }}>
        <span className="badge-neutral" style={{ fontSize: "0.6875rem" }}>{m.tag}</span>
        {isCuradoria && (
          <span className="badge-warn" style={{ fontSize: "0.6875rem" }}>Curadoria</span>
        )}
        <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{m.data_pub}</span>
        {isCuradoria && m.fonte_nome && (
          <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>· {m.fonte_nome}</span>
        )}
      </div>
      <h2 style={{ fontSize: "1.0625rem", fontWeight: 700, margin: "0 0 0.375rem", color: "hsl(var(--text-headline))", lineHeight: 1.3 }}>
        {m.titulo}
      </h2>
      <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: 0, lineHeight: 1.55 }}>
        {m.resumo}
      </p>
    </Link>
  );
}

export default async function NoticiasPage() {
  const materias = await getNoticias();
  const investigacoes = materias.filter((m) => m.tipo === "investigacao");
  const curadoria = materias.filter((m) => m.tipo === "curadoria");

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "860px" }}>
          <h1 style={{ fontSize: "1.625rem", margin: 0 }}>Notícias</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "600px" }}>
            Investigações próprias a partir de dados públicos e curadoria editorial de política e economia.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "860px" }}>
        {materias.length === 0 ? (
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))" }}>Nenhuma matéria publicada ainda.</p>
        ) : (
          <>
            {investigacoes.length > 0 && (
              <div style={{ marginBottom: "2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ height: "1.25rem", width: "3px", backgroundColor: "hsl(var(--primary))" }} />
                  <h2 style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, color: "hsl(var(--text-caption))" }}>
                    Investigações
                  </h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {investigacoes.map((m) => <NoticiaItem key={m.slug} m={m} />)}
                </div>
              </div>
            )}

            {curadoria.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ height: "1.25rem", width: "3px", backgroundColor: "hsl(var(--border))" }} />
                  <h2 style={{ fontSize: "0.8125rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0, color: "hsl(var(--text-caption))" }}>
                    Curadoria
                  </h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {curadoria.map((m) => <NoticiaItem key={m.slug} m={m} />)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
