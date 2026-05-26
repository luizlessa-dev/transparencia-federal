import { notFound } from "next/navigation";
import Link from "next/link";
import { getFrente } from "~/services/frentes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const { frente, membros } = await getFrente(parseInt(id, 10));
  if (!frente) return { title: "Frente não encontrada — The BR Insider" };
  return {
    title: `${frente.titulo} — The BR Insider`,
    description: `Confira os ${membros?.length ?? 0} membros da ${frente.titulo} na 57ª Legislatura. Distribuição por partido, estado e score de risco de cada deputado.`,
    alternates: { canonical: `/frentes/${id}` },
  };
}

// Agrupa por partido para exibição
function agruparPorPartido(membros: Array<{ deputado_id: number; nome: string; sigla_partido: string | null; sigla_uf: string | null }>) {
  const map = new Map<string, typeof membros>();
  for (const m of membros) {
    const p = m.sigla_partido ?? "Sem partido";
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(m);
  }
  return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
}

export default async function FrenteDetalhe({ params }: Props) {
  const { id } = await params;
  const { frente, membros } = await getFrente(parseInt(id, 10));
  if (!frente) notFound();

  const porPartido = agruparPorPartido(membros);
  const totalMembros = membros.length;

  // UFs únicas
  const ufs = [...new Set(membros.map((m) => m.sigla_uf).filter(Boolean))].sort();

  return (
    <>
      {/* Cabeçalho */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/frentes" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Frentes</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{frente.titulo}</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.5rem", margin: 0, lineHeight: 1.3 }}>{frente.titulo}</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginBottom: "1.5rem", fontFamily: "var(--font-sans)" }}>
            57ª Legislatura · Câmara dos Deputados
          </p>

          <div className="bloomberg-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-value">{totalMembros}</span>
              <span className="bloomberg-kpi-label">membros</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-value">{porPartido.length}</span>
              <span className="bloomberg-kpi-label">partidos</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-value">{ufs.length}</span>
              <span className="bloomberg-kpi-label">estados</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem" }}>

        {/* Distribuição por partido */}
        {porPartido.length > 0 && (
          <div style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ height: "1.5rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
              <h2 style={{ fontSize: "1rem", margin: 0, fontFamily: "var(--font-sans)" }}>Por partido</h2>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {porPartido.slice(0, 20).map(([partido, mems]) => (
                <span
                  key={partido}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.25rem 0.625rem", border: "1px solid hsl(var(--border))",
                    borderRadius: "3px", fontSize: "0.75rem", fontFamily: "var(--font-mono)",
                    backgroundColor: "hsl(var(--background))"
                  }}
                >
                  <strong style={{ color: "hsl(var(--text-headline))" }}>{partido}</strong>
                  <span style={{ color: "hsl(var(--text-caption))" }}>{mems.length}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Lista de membros */}
        {membros.length === 0 ? (
          <p style={{ color: "hsl(var(--text-caption))" }}>Nenhum membro registrado para esta frente.</p>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div style={{ height: "1.5rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
              <h2 style={{ fontSize: "1rem", margin: 0, fontFamily: "var(--font-sans)" }}>Membros</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Deputado</th>
                    <th>Partido</th>
                    <th>UF</th>
                    <th>Score de risco</th>
                  </tr>
                </thead>
                <tbody>
                  {membros.map((m) => (
                    <tr key={m.deputado_id}>
                      <td>
                        <Link
                          href={`/risco/${m.deputado_id}`}
                          style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 500 }}
                        >
                          {m.nome}
                        </Link>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                        {m.sigla_partido ?? "—"}
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                        {m.sigla_uf ?? "—"}
                      </td>
                      <td>
                        <Link
                          href={`/risco/${m.deputado_id}`}
                          style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", textDecoration: "none" }}
                        >
                          ver perfil →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div style={{ marginTop: "2rem" }}>
          <Link href="/frentes" style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}>
            ← Voltar às frentes
          </Link>
        </div>
      </div>
    </>
  );
}
