import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getNoticia } from "~/services/noticias";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const noticia = await getNoticia(slug);
  if (!noticia) return {};
  return {
    title: `${noticia.titulo} — The BR Insider`,
    description: noticia.resumo,
    alternates: { canonical: `https://www.thebrinsider.com/noticias/${slug}` },
    openGraph: {
      title: noticia.titulo,
      description: noticia.resumo,
      url: `https://www.thebrinsider.com/noticias/${slug}`,
      siteName: "The BR Insider",
      type: "article",
      locale: "pt_BR",
    },
  };
}

export default async function NoticiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const noticia = await getNoticia(slug);
  if (!noticia) notFound();

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "860px" }}>
          <Link
            href="/noticias"
            style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", textDecoration: "none" }}
          >
            ← Notícias
          </Link>
          <div style={{ display: "flex", gap: "0.625rem", alignItems: "center", margin: "1rem 0 0.75rem" }}>
            <span className="badge-neutral" style={{ fontSize: "0.6875rem" }}>{noticia.tag}</span>
            <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{noticia.data_pub}</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", lineHeight: 1.25, margin: "0 0 1rem" }}>{noticia.titulo}</h1>
          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            {noticia.resumo}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 4rem", maxWidth: "860px" }}>
        <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", fontStyle: "italic" }}>
          Conteúdo completo desta investigação em breve.
        </p>
      </div>
    </>
  );
}
