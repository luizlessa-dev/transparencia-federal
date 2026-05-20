export function generateMetadata() {
  return {
    title: "Sobre — Transparência Federal",
    description: "Conheça o projeto Transparência Federal: fontes de dados, tecnologia e propósito.",
  };
}

export default function AboutPage() {
  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Sobre Transparência Federal</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginLeft: "calc(3px + 0.75rem)", fontFamily: "var(--font-sans)", margin: "0 0 0 calc(3px + 0.75rem)" }}>
            Dados públicos do Congresso Nacional, organizados para a sociedade civil
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem", maxWidth: "760px" }}>

        {/* O Projeto */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            O Projeto
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: "hsl(var(--text-headline))" }}>Transparência Federal</strong> reúne e organiza dados públicos sobre o Congresso Nacional,
            com foco em emendas parlamentares, despesas de gabinete e registros votivos. Nossa missão é oferecer
            uma visão clara e acessível desses dados para cidadãos, jornalistas, pesquisadores e organizações
            da sociedade civil.
          </p>
        </div>

        {/* Fontes */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Fontes de Dados
          </h2>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", marginBottom: "0.875rem" }}>
            Os dados são coletados de fontes oficiais e públicas:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              {
                title: "Portal da Transparência",
                desc: "Emendas parlamentares, transferências voluntárias e informações de execução orçamentária",
                url: "https://www.gov.br/transparencia",
                label: "gov.br/transparencia",
              },
              {
                title: "Câmara dos Deputados — API Dados Abertos",
                desc: "Informações de deputados, despesas CEAPS e registros votivos",
                url: "https://dadosabertos.camara.leg.br",
                label: "dadosabertos.camara.leg.br",
              },
              {
                title: "Senado Federal",
                desc: "Dados de senadores e votações (em integração)",
                url: null,
                label: null,
              },
            ].map((fonte) => (
              <div key={fonte.title} style={{ paddingLeft: "0.875rem", borderLeft: "2px solid hsl(var(--border))" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))", marginBottom: "0.25rem" }}>
                  {fonte.title}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                  {fonte.desc}
                  {fonte.url && (
                    <> — <a href={fonte.url} target="_blank" rel="noopener noreferrer"
                      style={{ color: "hsl(var(--primary))", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                      {fonte.label}
                    </a></>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tecnologia */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Tecnologia
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.625rem" }}>
            {[
              { label: "Frontend", value: "Next.js + React" },
              { label: "Backend", value: "Node.js + TypeScript" },
              { label: "Banco de Dados", value: "Supabase (PostgreSQL)" },
              { label: "Deploy", value: "Vercel" },
              { label: "Licença", value: "Código aberto (GitHub)" },
            ].map((item) => (
              <div key={item.label} style={{ padding: "0.625rem 0.875rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
                <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.25rem" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))", fontFamily: "var(--font-mono)" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Público-Alvo */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Público-Alvo
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.625rem" }}>
            {[
              { icon: "👤", title: "Cidadãos", desc: "Fiscalizar como deputados gastam recursos públicos" },
              { icon: "📰", title: "Jornalistas", desc: "Dados estruturados para investigações e reportagens" },
              { icon: "🔬", title: "Pesquisadores", desc: "APIs e datasets para análises científicas" },
              { icon: "🤝", title: "ONGs", desc: "Monitoramento e campanhas de advocacy" },
            ].map((item) => (
              <div key={item.title} style={{ padding: "0.875rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
                <div style={{ fontSize: "1.125rem", marginBottom: "0.375rem" }}>{item.icon}</div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "hsl(var(--text-headline))", marginBottom: "0.25rem" }}>{item.title}</div>
                <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contato */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Contato e Feedback
          </h2>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            Tem sugestões ou encontrou um erro? Abra uma issue no{" "}
            <a href="https://github.com/luizlessa-dev/transparencia-federal" target="_blank" rel="noopener noreferrer"
              style={{ color: "hsl(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
              repositório GitHub
            </a>{" "}
            ou envie um e-mail com sua contribuição.
          </p>
        </div>

        {/* Disclaimer */}
        <div style={{ padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", borderLeft: "3px solid hsl(var(--border))" }}>
          <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
            Disclaimer
          </div>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            Os dados apresentados neste site foram coletados de fontes públicas e oficiais. Ainda que tenhamos
            o cuidado de garantir a integridade das informações, não oferecemos garantias sobre a precisão
            completa ou atual dos dados. Sempre consulte as fontes originais para validações críticas.
          </p>
        </div>

      </div>
    </>
  );
}
