import { getCobertura } from "@/services/api";
import { ErrorBlock, EmptyBlock } from "@/components";

export const dynamic = "force-dynamic";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function CoberturaPage() {
  const result = await getCobertura();

  if (!result.ok) {
    return (
      <section className="section">
        <h1 className="page-title">Cobertura dos dados</h1>
        <ErrorBlock message={result.error} />
      </section>
    );
  }

  const items = result.data;
  if (items.length === 0) {
    return (
      <section className="section">
        <h1 className="page-title">Cobertura dos dados</h1>
        <p className="lead">Visão geral da abrangência e da disponibilidade das bases utilizadas.</p>
        <EmptyBlock
          title="Sem cobertura"
          message="Não há registros de cobertura disponíveis no momento."
        />
      </section>
    );
  }

  const sorted = [...items].sort((a, b) => b.ano - a.ano);

  return (
    <section className="section">
      <h1 className="page-title">Cobertura dos dados</h1>
      <p className="lead">
        Visão geral da abrangência e da disponibilidade das bases utilizadas.
      </p>
      <div className="section">
        <table>
          <thead>
            <tr>
              <th>Ano</th>
              <th>Status</th>
              <th>Última ingestão</th>
              <th>Registros</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.ano}>
                <td>{row.ano}</td>
                <td>{row.status ?? "—"}</td>
                <td>{formatDate(row.ultima_ingestao_em)}</td>
                <td>{row.total_registros != null ? row.total_registros.toLocaleString("pt-BR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
