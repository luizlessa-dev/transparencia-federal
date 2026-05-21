import Link from "next/link";
import { getFrentesLista } from "~/services/frentes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Frentes Parlamentares — Transparência Federal",
  description: "Todas as frentes parlamentares da 57ª legislatura e seus membros.",
};

export default async function FrentesPage() {
  const frentes = await getFrentesLista();

  const total = frentes.length;
  const totalMembros = frentes.reduce((s, f) => s + (f.total_membros ?? 0), 0);

  return (
    <>
      {/* Cabeçalho */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Frentes Parlamentares</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginBottom: "1.5rem", fontFamily: "var(--font-sans)" }}>
            57ª Legislatura · Câmara dos Deputados
          </p>

          <div className="bloomberg-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-value" style={{ fontSize: "1.5rem" }}>{total}</span>
              <span className="bloomberg-kpi-label">frentes ativas</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-value" style={{ fontSize: "1.5rem" }}>{totalMembros.toLocaleString("pt-BR")}</span>
              <span className="bloomberg-kpi-label">adesões totais</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-value" style={{ fontSize: "1.5rem" }}>
                {frentes.length > 0 ? Math.round(totalMembros / frentes.length) : 0}
              </span>
              <span className="bloomberg-kpi-label">média por frente</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tabela */}
      <div className="container" style={{ padding: "2rem 1.5rem 3rem" }}>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
          Frentes são grupos temáticos suprapartidários de parlamentares em torno de causas ou setores específicos.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "80%" }}>Frente parlamentar</th>
                <th style={{ textAlign: "right" }}>Membros</th>
              </tr>
            </thead>
            <tbody>
              {frentes.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link
                      href={`/frentes/${f.id}`}
                      style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 500 }}
                    >
                      {f.titulo}
                    </Link>
                  </td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                    {(f.total_membros ?? 0) > 0
                      ? f.total_membros
                      : <span style={{ color: "hsl(var(--text-caption))" }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
