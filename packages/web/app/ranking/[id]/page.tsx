import { notFound } from "next/navigation";
import Link from "next/link";
import { getParlamentar } from "~/services/ranking";
import { ValorBRL } from "~/components/ValorBRL";
import { FotoAvatar } from "~/components/FotoAvatar";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const resultado = await getParlamentar(id);
  if (!resultado) return { title: "Parlamentar não encontrado" };
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
  const totalEmpenhado = historico.reduce(
    (acc, h) => acc + h.metricas.valor_empenhado,
    0
  );

  return (
    <section className="section">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400 mb-6">
        <Link href="/ranking" className="hover:text-blue-700">
          Ranking
        </Link>
        {" / "}
        <span className="text-gray-600">{nomeExibido}</span>
      </nav>

      {/* Cabeçalho do parlamentar */}
      <div className="flex items-start gap-6 mb-10">
        <FotoAvatar src={p.foto_url} nome={nomeExibido} size={80} />
        <div>
          <h1 className="page-title mb-1">{nomeExibido}</h1>
          <p className="text-gray-500 text-sm mb-3">
            {p.partido} · {p.uf} ·{" "}
            {p.casa_legislativa === "senado" ? "Senado Federal" : "Câmara dos Deputados"}
            {!p.ativo && (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                Inativo
              </span>
            )}
          </p>
          <p className="text-2xl font-bold text-blue-700">
            <ValorBRL valor={totalEmpenhado} />
            <span className="text-sm font-normal text-gray-400 ml-2">
              total empenhado (todos os anos)
            </span>
          </p>
        </div>
      </div>

      {/* Histórico por ano */}
      {historico.length === 0 ? (
        <p className="text-gray-500">
          Este parlamentar não aparece no ranking de emendas.
        </p>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Histórico por Ano
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {historico.map((h) => (
              <div
                key={h.ano}
                className="border border-gray-200 rounded-xl p-5 bg-white"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-bold text-gray-900">{h.ano}</span>
                  <span className="text-sm text-gray-400">
                    #{h.posicao} no ranking
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                      Empenhado
                    </dt>
                    <dd className="font-semibold text-gray-900">
                      <ValorBRL valor={h.metricas.valor_empenhado} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                      Pago
                    </dt>
                    <dd className="font-semibold text-gray-900">
                      <ValorBRL valor={h.metricas.valor_pago} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                      Liquidado
                    </dt>
                    <dd className="text-gray-600">
                      <ValorBRL valor={h.metricas.valor_liquidado} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">
                      Emendas
                    </dt>
                    <dd className="text-gray-600">{h.metricas.total_emendas}</dd>
                  </div>
                </dl>

                {/* Barra de execução */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Taxa de execução</span>
                    <span className="font-medium text-gray-600">
                      {h.metricas.taxa_execucao}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        h.metricas.taxa_execucao >= 80
                          ? "bg-green-500"
                          : h.metricas.taxa_execucao >= 50
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${Math.min(h.metricas.taxa_execucao, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/ranking"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          ← Voltar ao ranking
        </Link>
      </div>
    </section>
  );
}
