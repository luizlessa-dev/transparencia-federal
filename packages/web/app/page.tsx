import Link from "next/link";
import { getCobertura } from "../src/services/ranking.js";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getCobertura().catch(() => null);

  return (
    <>
      {/* === Hero Section === */}
      <section className="hero">
        <div className="container">
          <h1>Transparência Federal</h1>
          <p className="subtitle">
            Explore emendas parlamentares e dados do Congresso.
            Dados públicos de fácil acesso para cidadãos, jornalistas e pesquisadores.
          </p>
          <Link href="/ranking" className="cta-primary">
            Ver Ranking de Emendas →
          </Link>
        </div>
      </section>

      {/* === Statistics Section === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Os Dados em Números</h2>
            <p className="subtitle">Cobertura de emendas orçamentárias federais (2023–2024)</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="number">
                {stats
                  ? `${(stats.total_registros_financeiro / 1000).toFixed(1)}K`
                  : "11.7K"}
              </div>
              <div className="label">Registros de Emendas<br />(2023–2024)</div>
            </div>

            <div className="stat-card">
              <div className="number">
                {stats ? stats.total_parlamentares : "594"}
              </div>
              <div className="label">Parlamentares<br />no Banco de Dados</div>
            </div>

            <div className="stat-card">
              <div className="number">
                {stats ? `${stats.taxa_cobertura}%` : "67%"}
              </div>
              <div className="label">Taxa de Vínculo<br />Emenda–Parlamentar</div>
            </div>

            <div className="stat-card">
              <div className="number">27</div>
              <div className="label">Estados Brasileiros<br />Cobertos</div>
            </div>
          </div>
        </div>
      </section>

      {/* === Explore os Dados === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Explore os Dados</h2>
            <p className="subtitle">Comece a investigar tendências e padrões de gastos públicos</p>
          </div>

          <div className="featured-grid">
            <div className="featured-card">
              <div className="thumbnail">🏆</div>
              <div className="content">
                <h3>Ranking de Emendas</h3>
                <p>
                  Quem empenhou mais? Veja o ranking completo de parlamentares por valor de emendas,
                  taxa de execução e histórico por ano.
                </p>
                <Link href="/ranking">Ver Ranking →</Link>
              </div>
            </div>

            <div className="featured-card">
              <div className="thumbnail">📋</div>
              <div className="content">
                <h3>Emendas por Deputado</h3>
                <p>
                  Veja quais deputados têm mais emendas aprovadas, seus padrões de gasto e impacto regional.
                </p>
                <Link href="/amendments">Pesquisar Emendas →</Link>
              </div>
            </div>

            <div className="featured-card">
              <div className="thumbnail">💰</div>
              <div className="content">
                <h3>Gastos de Gabinete</h3>
                <p>
                  Analise despesas de pessoal, viagens e custeio de gabinetes parlamentares.
                </p>
                <Link href="/expenses">Ver Despesas →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === Sobre === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Sobre Este Projeto</h2>
          </div>

          <p>
            <strong>Transparência Federal</strong> reúne e organiza dados públicos sobre emendas ao
            orçamento e despesas do Congresso Nacional.
            Os dados são coletados de fontes oficiais:
          </p>

          <ul>
            <li>
              <strong>Portal da Transparência</strong> — Emendas parlamentares e execução orçamentária
            </li>
            <li>
              <strong>Câmara dos Deputados (API Dados Abertos)</strong> — Informações de deputados e despesas CEAPS
            </li>
            <li>
              <strong>Senado Federal</strong> — Dados de senadores
            </li>
          </ul>

          <p>
            <Link href="/about">Saiba mais sobre a metodologia →</Link>
          </p>
        </div>
      </section>
    </>
  );
}
