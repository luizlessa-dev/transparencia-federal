import Link from "next/link";

export const metadata = {
  title: "Conheça o Projeto — The BR Insider",
  description:
    "Dados públicos sobre emendas parlamentares, despesas de gabinete, votações e financiamento eleitoral do Congresso Nacional — organizados para jornalistas, pesquisadores e redações.",
  alternates: { canonical: "/demo" },
};

const STATS = [
  { value: "513", label: "Deputados monitorados" },
  { value: "81", label: "Senadores monitorados" },
  { value: "2015–2026", label: "Cobertura de emendas" },
  { value: "90%+", label: "Match parlamentar" },
];

const MODULOS = [
  {
    rota: "/ranking",
    titulo: "Ranking de Emendas",
    desc: "Parlamentares ordenados pelo valor total empenhado. Detalhe por ano com link para cada emenda individual.",
    badge: "2015–2026",
  },
  {
    rota: "/amendments",
    titulo: "Emendas Parlamentares",
    desc: "Base completa de emendas individuais, de bancada, de comissão e RP9 — com filtros por ano, tipo e UF.",
    badge: "10.199 emendas 25/26",
  },
  {
    rota: "/expenses",
    titulo: "Despesas CEAP — Câmara",
    desc: "Ranking de deputados por gastos da Cota para Exercício da Atividade Parlamentar, com detalhamento por categoria.",
    badge: "2023–2025",
  },
  {
    rota: "/senate-expenses",
    titulo: "CEAPS — Senado",
    desc: "Despesas reembolsadas por senadores com detalhamento por fornecedor e tipo de gasto.",
    badge: "2019–2026",
  },
  {
    rota: "/voting",
    titulo: "Votações Plenárias",
    desc: "Registro de votações da 57ª Legislatura com posição de cada deputado e ranking de presença.",
    badge: "2023–atual",
  },
  {
    rota: "/risco",
    titulo: "Score de Risco (G5)",
    desc: "Score composto por 5 dimensões: CEAP, presença, produção legislativa, financiamento e RP9.",
    badge: "Acesso pago",
  },
  {
    rota: "/rp9",
    titulo: "Orçamento Secreto (RP9)",
    desc: "Emendas do Relator-Geral declaradas inconstitucionais pelo STF em novembro de 2021.",
    badge: "2019–2022",
  },
  {
    rota: "/funding",
    titulo: "Financiamento Eleitoral",
    desc: "Receitas de campanha dos deputados e senadores eleitos em 2018 e 2022, cruzadas com doadores sancionados.",
    badge: "TSE 2018 e 2022",
  },
];

export default function DemoPage() {
  return (
    <>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem 2.5rem" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))", fontFamily: "var(--font-sans)" }}>
              Inteligência do Congresso Nacional
            </span>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
          </div>

          <h1 style={{ fontSize: "2.25rem", fontWeight: 700, margin: "0 0 1rem", fontFamily: "var(--font-display)", letterSpacing: "-0.02em", maxWidth: "640px", lineHeight: 1.2 }}>
            Dados públicos do Congresso,<br />organizados para quem investiga
          </h1>

          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", maxWidth: "540px", lineHeight: 1.65, marginBottom: "2rem" }}>
            Emendas parlamentares, despesas de gabinete, votações e financiamento eleitoral —
            tudo em um único lugar, atualizado e pronto para a reportagem.
          </p>

          {/* Stats */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", marginBottom: "2.5rem" }}>
            {STATS.map((s) => (
              <div key={s.label}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.625rem", fontWeight: 700, color: "hsl(var(--text-headline))", letterSpacing: "-0.02em" }}>
                  {s.value}
                </div>
                <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "0.125rem" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link
              href="/cadastro"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                borderRadius: "2px",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                letterSpacing: "0.01em",
              }}
            >
              Criar conta gratuita
            </Link>
            <Link
              href="/planos"
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid hsl(var(--border))",
                backgroundColor: "hsl(var(--surface))",
                color: "hsl(var(--text-body))",
                borderRadius: "2px",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ver planos e preços
            </Link>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <div className="container" style={{ padding: "2.5rem 1.5rem 4rem" }}>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
          <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
          <h2 style={{ fontSize: "1.125rem", margin: 0, fontFamily: "var(--font-sans)" }}>O que você encontra aqui</h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))", marginBottom: "3rem" }}>
          {MODULOS.map((m) => (
            <Link
              key={m.rota}
              href={m.rota}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className="bloomberg-card" style={{ borderRadius: 0, border: "none", height: "100%", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))", margin: 0, fontFamily: "var(--font-sans)" }}>
                    {m.titulo}
                  </h3>
                  <span className="badge-neutral" style={{ flexShrink: 0, marginLeft: "0.5rem" }}>{m.badge}</span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.55, margin: "0 0 0.75rem" }}>
                  {m.desc}
                </p>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", fontWeight: 500 }}>
                  Explorar →
                </span>
              </div>
            </Link>
          ))}
        </div>

        {/* Para redações */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", margin: "0 0 1rem 0" }}>
            Para redações e equipes
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {[
              { titulo: "Acesso individual", desc: "R$ 29/mês — para o jornalista ou pesquisador independente. Todos os dados, exportação CSV.", badge: "Individual" },
              { titulo: "Acesso institucional", desc: "Contrato anual — até 10 usuários, API REST, alertas semanais e briefings customizados.", badge: "Institucional" },
              { titulo: "Conta gratuita", desc: "Top 10 do Score de Risco e listagem de Frentes Parlamentares. Sem compromisso.", badge: "Gratuito" },
            ].map((p) => (
              <div key={p.titulo} style={{ padding: "1rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>{p.titulo}</div>
                  <span className="badge-neutral">{p.badge}</span>
                </div>
                <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link href="/cadastro" style={{ padding: "0.625rem 1.25rem", backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", borderRadius: "2px", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              Criar conta gratuita
            </Link>
            <Link href="/planos" style={{ padding: "0.625rem 1.25rem", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--text-body))", borderRadius: "2px", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              Comparar planos
            </Link>
            <a href="mailto:contato@thebrinsider.com?subject=Acesso%20Institucional%20%E2%80%94%20Transparência%20Federal" style={{ padding: "0.625rem 1.25rem", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", color: "hsl(var(--text-body))", borderRadius: "2px", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
              Falar sobre acesso institucional
            </a>
          </div>
        </div>

        <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", textAlign: "center" }}>
          thebrinsider.com · Dados de fontes públicas e oficiais · Atualizado em maio/2026
        </p>

      </div>
    </>
  );
}
