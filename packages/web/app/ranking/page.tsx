import Link from "next/link";
import { getRanking } from "@/services/api";
import { ErrorBlock, EmptyBlock } from "@/components";

export const dynamic = "force-dynamic";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default async function RankingPage() {
  const result = await getRanking();

  if (!result.ok) {
    return (
      <section className="section">
        <h1 className="page-title">Ranking de parlamentares</h1>
        <ErrorBlock message={result.error} />
      </section>
    );
  }

  const items = result.data;
  if (items.length === 0) {
    return (
      <section className="section">
        <h1 className="page-title">Ranking de parlamentares</h1>
        <p className="lead">Ordenação dos parlamentares por execução de emendas ao orçamento.</p>
        <EmptyBlock title="Ranking vazio" message="Não há dados de ranking publicados no momento. Tente novamente mais tarde." />
      </section>
    );
  }

  return (
    <section className="section">
      <h1 className="page-title">Ranking de parlamentares</h1>
      <p className="lead">
        Ordenação dos parlamentares por execução de emendas ao orçamento.
      </p>
      <div className="section">
        <table>
          <thead>
            <tr>
              <th>Posição</th>
              <th>Parlamentar</th>
              <th>Ano</th>
              <th>Valor total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={`${row.parlamentar_id}-${row.ano}`}>
                <td>{row.posicao}</td>
                <td>
                  {row.parlamentar ? (
                    <Link href={`/parlamentares/${row.parlamentar_id}`}>
                      {row.parlamentar.nome}
                      {row.parlamentar.partido || row.parlamentar.uf
                        ? ` (${[row.parlamentar.partido, row.parlamentar.uf].filter(Boolean).join(" / ")})`
                        : ""}
                    </Link>
                  ) : (
                    <Link href={`/parlamentares/${row.parlamentar_id}`}>
                      {row.parlamentar_id}
                    </Link>
                  )}
                </td>
                <td>{row.ano}</td>
                <td>{formatCurrency(row.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
