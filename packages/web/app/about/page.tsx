import Link from "next/link";
import { IndependenceNotice } from "~/components/IndependenceNotice";

export const metadata = {
  title: "Sobre — The BR Insider",
  description:
    "Projeto jornalístico independente que reúne e organiza dados públicos do Congresso Nacional. Responsável editorial, fontes e metodologia.",
  alternates: { canonical: "/about" },
};

const datasetJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  "name": "Emendas Parlamentares, Despesas CEAP e Votações do Congresso Nacional",
  "description":
    "Dados públicos sobre emendas parlamentares (2015–2026), despesas CEAP da Câmara e Senado (2019–2026), votações plenárias (2023–atual) e score de risco composto de deputados federais.",
  "url": "https://www.thebrinsider.com/about",
  "creator": {
    "@type": "Person",
    "name": "Luiz Lessa",
    "url": "https://www.thebrinsider.com/about",
    "jobTitle": "Jornalista — editor responsável",
  },
  "publisher": {
    "@type": "Organization",
    "name": "The BR Insider",
    "url": "https://www.thebrinsider.com",
  },
  "license": "https://creativecommons.org/licenses/by/4.0/",
  "temporalCoverage": "2015/2026",
  "spatialCoverage": {
    "@type": "Place",
    "name": "Brasil",
    "geo": { "@type": "GeoCoordinates", "latitude": -15.78, "longitude": -47.93 },
  },
  "keywords": [
    "emendas parlamentares",
    "despesas de gabinete",
    "CEAP",
    "votações Câmara",
    "transparência pública",
    "dados abertos",
    "Congresso Nacional",
    "deputados federais",
  ],
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Sobre o The BR Insider</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: "0 0 0 calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Projeto jornalístico independente. Dados públicos do Congresso, sob curadoria editorial.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem", maxWidth: "760px" }}>

        {/* Aviso de independência (versão expandida) */}
        <div style={{ marginBottom: "1.5rem" }}>
          <IndependenceNotice
            variant="card"
            context="Em caso de dúvida sobre origem, autoria ou metodologia de qualquer dado publicado aqui, consulte as fontes primárias listadas abaixo."
          />
        </div>

        {/* O Projeto */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            O Projeto
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.875rem 0" }}>
            O <strong style={{ color: "hsl(var(--text-headline))" }}>The BR Insider</strong> é
            um projeto de jornalismo de dados que reúne, normaliza e analisa informações públicas sobre
            a atividade parlamentar do Congresso Nacional brasileiro — emendas, despesas de gabinete,
            votações nominais e financiamento eleitoral.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            O serviço é gratuito para a leitura básica e cobra apenas pela camada analítica e de
            acesso prioritário — o que financia a operação. Os dados de origem são públicos e
            permanecem públicos.
          </p>
        </div>

        {/* Responsabilidade editorial */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Responsabilidade editorial
          </h2>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.875rem 0" }}>
            Editor responsável: <strong style={{ color: "hsl(var(--text-headline))" }}>Luiz Lessa</strong>,
            jornalista, com base em Belo Horizonte (MG). O projeto opera em modelo solo por desenho,
            apoiado em automação e ferramentas de IA — toda decisão editorial, metodologia e publicação
            é de responsabilidade direta do editor.
          </p>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.5rem 0" }}>
            Contato:{" "}
            <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))", fontFamily: "var(--font-mono)", textDecoration: "none" }}>
              contato@thebrinsider.com
            </a>
          </p>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", margin: 0, lineHeight: 1.6 }}>
            Razão Social: <span style={{ fontFamily: "var(--font-mono)" }}>Lessa Labs Tecnologia Ltda.</span>{" "}
            · CNPJ <span style={{ fontFamily: "var(--font-mono)" }}>65.659.055/0001-53</span>{" "}
            · MEI · Belo Horizonte/MG
          </p>
        </div>

        {/* Independência */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Independência
          </h2>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.75rem 0" }}>
            O The BR Insider não recebe financiamento público, repasses partidários,
            verbas de campanha ou patrocínio de gabinete parlamentar. A receita vem exclusivamente
            de planos pagos (jornalistas, redações e organizações) e de eventuais relatórios
            sob demanda — sempre divulgados.
          </p>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            Não realizamos consultoria política, assessoria parlamentar ou advocacy.
            Qualquer tentativa de instrumentalização política do projeto será publicamente repudiada.
          </p>
        </div>

        {/* Fontes */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Fontes de Dados
          </h2>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", marginBottom: "0.875rem" }}>
            Todos os dados são coletados de fontes públicas e oficiais. Nenhuma fonte privada
            ou anônima é utilizada.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            {[
              {
                title: "Portal da Transparência (CGU)",
                desc: "Emendas parlamentares, transferências voluntárias e execução orçamentária",
                url: "https://portaldatransparencia.gov.br",
                label: "portaldatransparencia.gov.br",
              },
              {
                title: "Câmara dos Deputados — API Dados Abertos",
                desc: "Cadastro de deputados, CEAP, votações nominais e proposições",
                url: "https://dadosabertos.camara.leg.br",
                label: "dadosabertos.camara.leg.br",
              },
              {
                title: "Senado Federal — Dados Abertos",
                desc: "Cadastro de senadores e CEAPS (2019–2026)",
                url: "https://www12.senado.leg.br/dados-abertos",
                label: "senado.leg.br/dados-abertos",
              },
              {
                title: "TSE — Tribunal Superior Eleitoral",
                desc: "Financiamento de campanha e bens declarados (2018, 2022)",
                url: "https://dadosabertos.tse.jus.br",
                label: "dadosabertos.tse.jus.br",
              },
            ].map((fonte) => (
              <div key={fonte.title} style={{ paddingLeft: "0.875rem", borderLeft: "2px solid hsl(var(--border))" }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))", marginBottom: "0.25rem" }}>
                  {fonte.title}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                  {fonte.desc}
                  {fonte.url && (
                    <>
                      {" — "}
                      <a href={fonte.url} target="_blank" rel="noopener noreferrer"
                        style={{ color: "hsl(var(--primary))", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                        {fonte.label}
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cobertura de Dados */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Cobertura de Dados
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.625rem" }}>
            {[
              { label: "Emendas Parlamentares", value: "2015 – 2026" },
              { label: "Despesas CEAP (Câmara)", value: "2023 – 2026" },
              { label: "Despesas CEAPS (Senado)", value: "2019 – 2026" },
              { label: "Votações Plenárias", value: "fev/2023 – atual" },
              { label: "Financiamento Eleitoral (TSE)", value: "2018 e 2022" },
              { label: "Frentes Parlamentares", value: "57ª Legislatura" },
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

        {/* Tecnologia */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Tecnologia e Código
          </h2>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.65, marginBottom: "0.875rem" }}>
            O código de ingestão de dados, agregação e a interface web são abertos no GitHub —
            qualquer pessoa pode auditar a pipeline.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.625rem", marginBottom: "0.875rem" }}>
            {[
              { label: "Frontend", value: "Next.js 16 + React" },
              { label: "Backend", value: "Node.js + TypeScript" },
              { label: "Banco de Dados", value: "Supabase (PostgreSQL)" },
              { label: "Deploy", value: "Vercel" },
              { label: "Licença", value: "Código aberto" },
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
          <a href="https://github.com/luizlessa-dev/transparencia-federal" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "0.875rem", color: "hsl(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
            github.com/luizlessa-dev/transparencia-federal →
          </a>
        </div>

        {/* Política editorial — links rápidos */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem 0" }}>
            Política editorial e legal
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.5rem" }}>
            {[
              { href: "/risco/metodologia", label: "Metodologia do Score de Risco" },
              { href: "/correcoes", label: "Política de Correção de Dados" },
              { href: "/termos", label: "Termos de Uso" },
              { href: "/privacidade", label: "Política de Privacidade" },
            ].map((item) => (
              <Link key={item.href} href={item.href}
                style={{
                  display: "block",
                  padding: "0.625rem 0.875rem",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  fontSize: "0.8125rem",
                  color: "hsl(var(--text-body))",
                  textDecoration: "none",
                  backgroundColor: "hsl(var(--surface))",
                }}>
                {item.label} →
              </Link>
            ))}
          </div>
        </div>

        {/* Disclaimer final */}
        <div style={{ padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", borderLeft: "3px solid hsl(var(--border))" }}>
          <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
            Sobre a precisão dos dados
          </div>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            Os dados aqui apresentados foram coletados de fontes públicas e oficiais. Embora haja
            cuidado em garantir integridade e atualização constante, não oferecemos garantia de
            precisão absoluta — divergências, atrasos e omissões nas fontes originais são refletidos
            no projeto. Para decisões críticas (jornalísticas, jurídicas ou acadêmicas), sempre
            consulte a fonte primária. Encontrou um erro?{" "}
            <Link href="/correcoes" style={{ color: "hsl(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
              Política de Correção →
            </Link>
          </p>
        </div>

      </div>
    </>
  );
}
