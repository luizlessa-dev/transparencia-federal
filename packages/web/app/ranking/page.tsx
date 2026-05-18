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
  const color =
    taxa >= 80
      ? "bg-green-100 text-green-800 border-green-300"
      : taxa >= 50
      ? "bg-orange-100 text-orange-800 border-orange-300"
      : "bg-red-100 text-red-800 border-red-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${color}`}>
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
    <div className="container py-12">
      <h1 className="page-title">Ranking de Emendas Parlamentares</h1>
      <p className="lead">
        Parlamentares ordenados pelo valor total empenhado no orçamento federal.
        Fonte: Portal da Transparência do Governo Federal.
      </p>

      {/* Filtro de ano */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-sm text-gray-500">Ano:</span>
        {ANOS.map((a) => (
          <Link
            key={a}
            href={`/ranking?ano=${a}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium no-underline border transition-all ${
              a === ano
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-blue-50 hover:border-blue-300"
            }`}
          >
            {a}
          </Link>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          {total.toLocaleString("pt-BR")} parlamentares
        </span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-700 w-12">#</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700">Parlamentar</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Empenhado</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Pago</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Execução</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">Emendas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const p = row.parlamentares;
              return (
                <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400 tabular-nums text-xs">
                    {row.posicao}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/ranking/${p.id}`}
                      className="font-semibold text-blue-700 hover:text-blue-900 no-underline"
                    >
                      {p.nome_parlamentar || p.nome}
                    </Link>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {p.partido} · {p.uf} · {p.casa_legislativa === "senado" ? "Senado" : "Câmara"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-gray-900">
                    {fmtBRL(row.metricas.valor_empenhado)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500">
                    {fmtBRL(row.metricas.valor_pago)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {badgeExecucao(row.metricas.taxa_execucao)}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
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
        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/ranking?ano=${ano}&page=${page - 1}`}
                className="cta-button text-sm px-4 py-2"
              >
                ← Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/ranking?ano=${ano}&page=${page + 1}`}
                className="cta-button text-sm px-4 py-2"
              >
                Próxima →
              </Link>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-8">
        Ranking por valor empenhado. Taxa de execução = valor pago / valor empenhado.
        Dados atualizados mensalmente a partir do Portal da Transparência.
      </p>
    </div>
  );
}
