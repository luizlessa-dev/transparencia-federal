import Link from "next/link";
import { getRanking } from "../../src/services/ranking.js";
import { ValorBRL } from "../../src/components/ValorBRL.js";
import { FotoAvatar } from "../../src/components/FotoAvatar.js";

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
      <div className="section-header">
        <h1 className="page-title">Ranking de Emendas Parlamentares</h1>
        <p className="lead">
          Parlamentares ordenados pelo valor total empenhado no orçamento federal.
          Dados do Portal da Transparência do Governo Federal.
        </p>
      </div>

      {/* Filtro de ano */}
      <div className="flex gap-2 mt-6 mb-8">
        {ANOS.map((a) => (
          <Link
            key={a}
            href={`/ranking?ano=${a}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors no-underline ${
              a === ano
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {a}
          </Link>
        ))}
        <span className="ml-auto text-sm text-gray-500 self-center">
          {total.toLocaleString("pt-BR")} parlamentares
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3 w-12">#</th>
              <th className="px-4 py-3">Parlamentar</th>
              <th className="px-4 py-3 text-right">Empenhado</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Pago</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">Execução</th>
              <th className="px-4 py-3 text-right hidden lg:table-cell">Emendas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const p = row.parlamentares;
              const posicaoGlobal = (page - 1) * PER_PAGE + row.posicao;
              return (
                <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">
                    {posicaoGlobal}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ranking/${p.id}`}
                      className="flex items-center gap-3 no-underline group"
                    >
                      <FotoAvatar src={p.foto_url} nome={p.nome_parlamentar || p.nome} size={36} />
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                          {p.nome_parlamentar || p.nome}
                        </div>
                        <div className="text-xs text-gray-400">
                          {p.partido} · {p.uf} ·{" "}
                          {p.casa_legislativa === "senado" ? "Senado" : "Câmara"}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    <ValorBRL valor={row.metricas.valor_empenhado} />
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600 hidden md:table-cell">
                    <ValorBRL valor={row.metricas.valor_pago} />
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        row.metricas.taxa_execucao >= 80
                          ? "bg-green-100 text-green-700"
                          : row.metricas.taxa_execucao >= 50
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {row.metricas.taxa_execucao}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 hidden lg:table-cell">
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
        <div className="flex items-center justify-between mt-6 text-sm">
          <span className="text-gray-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/ranking?ano=${ano}&page=${page - 1}`}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 no-underline transition-colors"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/ranking?ano=${ano}&page=${page + 1}`}
                className="px-4 py-2 rounded-lg bg-blue-700 text-white hover:bg-blue-600 no-underline transition-colors"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Nota metodológica */}
      <p className="text-xs text-gray-400 mt-8">
        Fonte: Portal da Transparência do Governo Federal. Ranking por valor empenhado. Taxa de
        execução = valor pago / valor empenhado. Dados atualizados mensalmente.
      </p>
    </section>
  );
}
