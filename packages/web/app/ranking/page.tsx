import Link from "next/link";
import { getRanking } from "~/services/ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ranking de Emendas — Transparência Federal",
  description:
    "Ranking de parlamentares por valor total de emendas empenhadas no orçamento federal.",
};

const ANOS = [2024, 2023];
const PER_PAGE = 50;

interface SearchParams {
  ano?: string;
  page?: string;
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function badgeExecucao(taxa: number) {
  const cor =
    taxa >= 80 ? "#228B22" : taxa >= 50 ? "#e65100" : "#c62828";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15em 0.5em",
        borderRadius: "3px",
        fontSize: "0.8125rem",
        fontWeight: 600,
        backgroundColor: cor + "18",
        color: cor,
        border: `1px solid ${cor}44`,
      }}
    >
      {taxa}%
    </span>
  );
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ano = ANOS.includes(Number(params.ano)) ? Number(params.ano) : 2024;
  const page = Math.max(1, Number(params.page ?? 1));

  const { data, total } = await getRanking(ano, page, PER_PAGE);
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <section className="section">
      <h1 className="page-title">Ranking de Emendas Parlamentares</h1>
      <p className="lead">
        Parlamentares ordenados pelo valor total empenhado no orçamento federal.
        Fonte: Portal da Transparência do Governo Federal.
      </p>

      {/* Filtro de ano */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Ano:</span>
        {ANOS.map((a) => (
          <Link
            key={a}
            href={`/ranking?ano=${a}`}
            style={{
              padding: "0.3em 0.9em",
              borderRadius: "4px",
              fontSize: "0.875rem",
              fontWeight: a === ano ? 600 : 400,
              textDecoration: "none",
              backgroundColor: a === ano ? "var(--color-primary)" : "#f0f0f0",
              color: a === ano ? "#fff" : "#444",
              border: `1px solid ${a === ano ? "var(--color-primary)" : "#ddd"}`,
            }}
          >
            {a}
          </Link>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          {total.toLocaleString("pt-BR")} parlamentares
        </span>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: "3rem" }}>#</th>
              <th>Parlamentar</th>
              <th style={{ textAlign: "right" }}>Empenhado</th>
              <th style={{ textAlign: "right" }}>Pago</th>
              <th style={{ textAlign: "right" }}>Execução</th>
              <th style={{ textAlign: "right" }}>Emendas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const p = row.parlamentares;
              return (
                <tr key={p.id}>
                  <td style={{ color: "var(--color-text-light)", fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}>
                    {row.posicao}
                  </td>
                  <td>
                    <Link
                      href={`/ranking/${p.id}`}
                      style={{ textDecoration: "none", color: "var(--color-primary)", fontWeight: 500 }}
                    >
                      {p.nome_parlamentar || p.nome}
                    </Link>
                    <span style={{ display: "block", fontSize: "0.8125rem", color: "var(--color-text-secondary)", marginTop: "0.1rem" }}>
                      {p.partido} · {p.uf} · {p.casa_legislativa === "senado" ? "Senado" : "Câmara"}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                    {fmtBRL(row.metricas.valor_empenhado)}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--color-text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtBRL(row.metricas.valor_pago)}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {badgeExecucao(row.metricas.taxa_execucao)}
                  </td>
                  <td style={{ textAlign: "right", color: "var(--color-text-secondary)" }}>
                    {row.metricas.total_emendas}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.5rem" }}>
          <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            Página {page} de {totalPages}
          </span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {page > 1 && (
              <Link href={`/ranking?ano=${ano}&page=${page - 1}`} className="cta-button" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={`/ranking?ano=${ano}&page=${page + 1}`} className="cta-button" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}

      <p style={{ fontSize: "0.8125rem", color: "var(--color-text-light)", marginTop: "2rem" }}>
        Ranking por valor empenhado. Taxa de execução = valor pago / valor empenhado.
        Dados atualizados mensalmente a partir do Portal da Transparência.
      </p>
    </section>
  );
}
