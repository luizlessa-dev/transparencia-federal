export default function Page() {
  return (
    <>
      {/* === Hero Section === */}
      <section className="hero">
        <div className="container">
          <h1>Transparência Federal</h1>
          <p className="subtitle">
            Explore emendas parlamentares, despesas de gabinete e dados do Congresso.
            Dados públicos de fácil acesso para cidadãos, jornalistas e pesquisadores.
          </p>
          <a href="/amendments" className="cta-primary">
            Explorar Emendas →
          </a>
        </div>
      </section>

      {/* === Statistics Section === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Os Dados em Números</h2>
            <p className="subtitle">Cobertura completa de emendas, despesas de gabinete e registros votivos</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="number">11.7K</div>
              <div className="label">Emendas Parlamentares<br/>(2023–2024)</div>
            </div>

            <div className="stat-card">
              <div className="number">513</div>
              <div className="label">Deputados Federais<br/>Analisados</div>
            </div>

            <div className="stat-card">
              <div className="number">558.4K</div>
              <div className="label">Despesas de Gabinete<br/>(CEAPS)</div>
            </div>

            <div className="stat-card">
              <div className="number">27</div>
              <div className="label">Estados Brasileiros<br/>Cobertos</div>
            </div>
          </div>
        </div>
      </section>

      {/* === Featured Stories === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Explore os Dados</h2>
            <p className="subtitle">Comece a investigar tendências e padrões de gastos públicos</p>
          </div>

          <div className="featured-grid">
            <div className="featured-card">
              <div className="thumbnail">📋</div>
              <div className="content">
                <h3>Emendas por Deputado</h3>
                <p>
                  Veja quais deputados têm mais emendas aprovadas, seus padrões de gasto e impacto regional.
                </p>
                <a href="/amendments">Pesquisar Emendas →</a>
              </div>
            </div>

            <div className="featured-card">
              <div className="thumbnail">💰</div>
              <div className="content">
                <h3>Gastos de Gabinete</h3>
                <p>
                  Analise despesas de pessoal, viagens e custeio de gabinetes parlamentares.
                </p>
                <a href="/expenses">Ver Despesas →</a>
              </div>
            </div>

            <div className="featured-card">
              <div className="thumbnail">🗳️</div>
              <div className="content">
                <h3>Registros Votivos</h3>
                <p>
                  Consulte como deputados votaram em projetos-chave e identifique padrões políticos.
                </p>
                <a href="/voting">Ver Votações →</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === For Different Audiences === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Para Diferentes Públicos</h2>
            <p className="subtitle">Você é cidadão, jornalista, pesquisador ou representante de ONG?</p>
          </div>

          <div style={{ marginTop: "2rem" }}>
            <div className="cta-section">
              <h3>👥 Para Cidadãos</h3>
              <p>
                Entenda como deputados gastam recursos públicos, que emendas aprovam e qual impacto
                têm na sua região. Fiscalize seus representantes com dados transparentes.
              </p>
              <a href="/citizens" className="cta-button">Começar Pesquisa</a>
            </div>

            <div className="cta-section" style={{ marginTop: "1.5rem" }}>
              <h3>📰 Para Jornalistas</h3>
              <p>
                Acesse séries históricas, identificar padrões anômalos e contextualizar investigações
                com dados estruturados sobre orçamento e execução parlamentar.
              </p>
              <a href="/journalists" className="cta-button">Recursos Jornalísticos</a>
            </div>

            <div className="cta-section" style={{ marginTop: "1.5rem" }}>
              <h3>🎓 Para Pesquisadores</h3>
              <p>
                Baixe datasets em CSV e JSON, acesse a API REST completa e estude padrões de gastos
                públicos com metodologia científica.
              </p>
              <a href="/researchers" className="cta-button">Documentação Técnica</a>
            </div>

            <div className="cta-section" style={{ marginTop: "1.5rem" }}>
              <h3>🤝 Para ONGs</h3>
              <p>
                Use nossos dados em campanhas de advocacy, relatórios de impacto e monitoramento
                de políticas públicas. Acesso aberto para fins não comerciais.
              </p>
              <a href="/ngos" className="cta-button">Para Organizações</a>
            </div>
          </div>
        </div>
      </section>

      {/* === About Section === */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2>Sobre Este Projeto</h2>
          </div>

          <p>
            <strong>Transparência Federal</strong> reúne e organiza dados públicos sobre emendas ao
            orçamento, despesas de gabinete e registros votivos da Câmara dos Deputados.
            Oferecemos uma visão clara e acessível para cidadãos, jornalistas, pesquisadores
            e organizações da sociedade civil.
          </p>

          <p>
            Os dados são coletados de fontes oficiais:
          </p>

          <ul>
            <li><strong>Portal da Transparência</strong> — Emendas parlamentares e execução orçamentária</li>
            <li><strong>Câmara dos Deputados (API Dados Abertos)</strong> — Informações de deputados, despesas CEAPS e votações</li>
            <li><strong>Senado Federal</strong> — Dados de senadores (em desenvolvimento)</li>
          </ul>

          <p>
            Este projeto está em desenvolvimento contínuo. Envie sugestões e reportar
            problemas via <a href="https://github.com" target="_blank">GitHub</a>.
          </p>
        </div>
      </section>
    </>
  );
}
