import { listarParlamentares } from "~/services/ranking";
import { ParlamentaresGrid } from "./ParlamentaresGrid";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Parlamentares — Transparência Federal",
  description:
    "Encontre todos os deputados federais e senadores ativos. Busque por nome, partido, UF ou casa legislativa e abra o perfil completo de cada parlamentar.",
  alternates: { canonical: "/parlamentares" },
};

export default async function ParlamentaresPage() {
  const parlamentares = await listarParlamentares().catch(() => []);

  return (
    <>
      {/* Cabeçalho */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Parlamentares</h1>
          </div>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", maxWidth: "44rem", lineHeight: 1.6 }}>
            Todos os deputados federais e senadores em exercício. Use a busca e os filtros
            abaixo para encontrar um parlamentar e abrir o perfil completo com histórico de
            emendas, ranking, frentes e indicadores.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>
        <ParlamentaresGrid parlamentares={parlamentares} />
      </div>
    </>
  );
}
