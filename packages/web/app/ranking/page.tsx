import Link from "next/link";
import { getRanking } from "~/services/ranking";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ranking de Emendas — Transparência Federal",
  description:
    "Ranking de parlamentares por valor total de emendas empenhadas no orçamento federal.",
};

const ANOS = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];
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
  const cls = taxa >= 80 ? "badge-success" : taxa >= 50 ? "badge-warn" : "badge-danger";
  return <span className={cls}>{taxa}%</span>;
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const ano = ANOS.includes(Number(params.ano)) ? Number(params.ano) : 2025;
  const page = Math.max(1, Number(params.page ?? 1));

  const { data, total } = await getRanking(ano, page, PER_PAGE);
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      {/* Cabeçalho da página */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Ranking de Emendas</h1>
          </div>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", maxWidth: "40rem" }}>
            Parlamentares ordenados pelo valor total empenhado no orçamento federal.
            Fonte: Portal da Transparência do Governo Federal.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* Filtro de ano + contagem */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
            Ano:
          </span>
          {ANOS.map((a) => (
            <Link
              key={a}
              href={`/ranking?ano=${a}`}
              style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.8125rem",
                fontWeight: a === ano ? 600 : 400,
                textDecoration: "none",
                borderRadius: "2px",
                border: "1px solid",
                borderColor: a === ano ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: a === ano ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: a === ano ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
                transition: "all 0.15s",
              }}
            >
              {a}
            </Link>
          ))}
          <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
            {total.toLocaleString("pt-BR")} parlamentares
          </span>
        </div>

        {/* Tabela */}
        <div style={{ overflowX: "auto", border: "1px solid hsl(var(--border))" }}>
          <table className="bloomberg-table">
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
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {row.posicao}
                    </td>
                    <td>
                      <Link
                        href={`/ranking/${p.id}`}
                        style={{ fontWeight: 600, color: "hsl(var(--text-headline))", textDecoration: "none", fontSize: "0.875rem" }}
                      >
                        {p.nome_parlamentar || p.nome}
                      </Link>
                      <span style={{ display: "block", fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem", fontFamily: "var(--font-sans)" }}>
                        {p.partido} · {p.uf} · {p.casa_legislativa === "senado" ? "Senado" : "Câmara"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      {fmtBRL(row.metricas.valor_empenhado)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                      {fmtBRL(row.metricas.valor_pago)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {badgeExecucao(row.metricas.taxa_execucao)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem" }}>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
              Página {page} de {totalPages}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {page > 1 && (
                <Link
                  href={`/ranking?ano=${ano}&page=${page - 1}`}
                  style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: 500, border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", color: "hsl(var(--text-body))", borderRadius: "2px", textDecoration: "none" }}
                >
                  ← Anterior
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/ranking?ano=${ano}&page=${page + 1}`}
                  style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", fontWeight: 500, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: "2px", textDecoration: "none" }}
                >
                  Próxima →
                </Link>
              )}
            </div>
          </div>
        )}

        <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "2rem", fontFamily: "var(--font-mono)" }}>
          Ranking por valor empenhado · Taxa de execução = valor pago / valor empenhado · Dados: Portal da Transparência
        </p>
      </div>
    </>
  );
}
