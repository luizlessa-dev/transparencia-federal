import Link from "next/link";
import { getParlamentar } from "@/services/api";
import { ErrorBlock } from "@/components";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ParlamentarPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getParlamentar(slug);

  if (!result.ok) {
    return (
      <section className="section">
        <h1 className="page-title">Perfil do parlamentar</h1>
        <ErrorBlock
          title="Parlamentar não encontrado"
          message={result.status === 404 ? "O identificador informado não corresponde a um parlamentar publicado." : result.error}
        />
        <p className="mt-2">
          <Link href="/ranking">Voltar ao ranking</Link>
        </p>
      </section>
    );
  }

  const p = result.data!;
  const sub = [p.partido, p.uf].filter(Boolean).join(" / ");

  return (
    <section className="section">
      <h1 className="page-title">{p.nome}</h1>
      {sub && <p className="lead">{sub}</p>}
      <dl className="section" style={{ display: "grid", gap: "0.5rem" }}>
        {p.id_externo && (
          <>
            <dt style={{ fontWeight: 600 }}>ID externo</dt>
            <dd>{p.id_externo}</dd>
          </>
        )}
      </dl>
      <p className="mt-2">
        <Link href="/ranking">Ver ranking</Link>
      </p>
    </section>
  );
}
