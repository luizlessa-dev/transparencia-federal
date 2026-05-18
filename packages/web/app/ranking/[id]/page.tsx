import { notFound } from "next/navigation";
import Link from "next/link";
import { getParlamentar } from "~/services/ranking";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) return { title: "Parlamentar não encontrado — Transparência Federal" };
  const { parlamentar: p } = resultado;
  return {
    title: `${p.nome_parlamentar || p.nome} — Transparência Federal`,
    description: `Emendas e ranking de ${p.nome_parlamentar || p.nome} (${p.partido}/${p.uf})`,
  };
}

export default async function ParlamentarPage({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) notFound();

  const { parlamentar: p, historico } = resultado;
  const nomeExibido = p.nome_parlamentar || p.nome;
  const totalEmpenhado = historico.reduce((acc, h) => acc + h.metricas.valor_empenhado, 0);
  const casa = p.casa_legislativa === "senado" ? "Senado Federal" : "Câmara dos Deputados";

  return (
    <div className="container py-12">
      {/* Breadcrumb */}
      <p className="text-sm text-gray-500 mb-8">
        <Link href="/ranking" className="text-blue-600 hover:text-blue-800 no-underline">
          Ranking
        </Link>
        {" / "}
        <span className="text-gray-700">{nomeExibido}</span>
      </p>

      {/* Cabeçalho */}
      <div className="border-b border-gray-200 pb-8 mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{nomeExibido}</h1>
        <p className="text-gray-500 mb-4">
          {p.partido} · {p.uf} · {casa}
          {!p.ativo && (
            <span className="ml-3 px-2 py-0.5 text-xs bg-gray-100 border border-gray-300 rounded text-gray-500">
              Inativo
            </span>
          )}
        </p>
        <p className="text-3xl font-bold text-blue-700">
          {fmtBRL(totalEmpenhado)}
          <span className="text-base font-normal text-gray-500 ml-2">
            total empenhado (todos os anos)
          </span>
        </p>
      </div>

      {/* Histórico por ano */}
      <h2 className="text-xl font-bold text-gray-900 mb-6">Histórico por Ano</h2>

      {historico.length === 0 ? (
        <p className="text-gray-500">Este parlamentar não aparece no ranking de emendas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {historico.map((h) => {
            const execColor =
              h.metricas.taxa_execucao >= 80
                ? "#228B22"
                : h.metricas.taxa_execucao >= 50
                ? "#e65100"
                : "#c62828";

            return (
              <div
                key={h.ano}
                className="bg-white border border-gray-200 rounded-xl p-6 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-center mb-5">
                  <span className="text-2xl font-bold text-gray-900">{h.ano}</span>
                  <span className="text-sm text-gray-500">#{h.posicao} no ranking</span>
                </div>

                <dl className="space-y-2 text-sm mb-5">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Empenhado</dt>
                    <dd className="font-semibold text-gray-900">{fmtBRL(h.metricas.valor_empenhado)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Pago</dt>
                    <dd className="text-gray-700">{fmtBRL(h.metricas.valor_pago)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Liquidado</dt>
                    <dd className="text-gray-700">{fmtBRL(h.metricas.valor_liquidado)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Emendas</dt>
                    <dd className="text-gray-700">{h.metricas.total_emendas}</dd>
                  </div>
                </dl>

                {/* Barra de execução */}
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Taxa de execução</span>
                    <span className="font-semibold" style={{ color: execColor }}>
                      {h.metricas.taxa_execucao}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${Math.min(h.metricas.taxa_execucao, 100)}%`,
                        backgroundColor: execColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-10">
        <Link href="/ranking" className="text-blue-600 hover:text-blue-800 no-underline font-medium">
          ← Voltar ao ranking
        </Link>
      </p>
    </div>
  );
}
