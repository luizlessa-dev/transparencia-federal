import Link from "next/link";
import { getCobertura, getTopParlamentares } from "~/services/ranking";
import { AskBox } from "~/components/AskBox";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Transparência Federal — Emendas, Despesas e Dados do Congresso",
  description:
    "Explore dados públicos sobre emendas parlamentares, despesas de gabinete e votações da Câmara. Transparência para cidadãos, jornalistas, pesquisadores e ONGs.",
  alternates: { canonical: "/" },
};

function fmtMilhar(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("pt-BR");
}

function fmtBRLCompact(valor: number): string {
  if (valor >= 1e9) return `R$ ${(valor / 1e9).toFixed(2)} bi`;
  if (valor >= 1e6) return `R$ ${(valor / 1e6).toFixed(1)} mi`;
  if (valor >= 1e3) return `R$ ${(valor / 1e3).toFixed(0)} mil`;
  return `R$ ${valor.toLocaleString("pt-BR")}`;
}

export default async function HomePage() {
  const [stats, destaques] = await Promise.all([
    getCobertura().catch(() => null),
    getTopParlamentares(2025, 8).catch(() => ({ ano: 2025, data: [] })),
  ]);

  const totalParl = stats?.total_parlamentares ?? 594;
  const totalEmendas = stats ? fmtMilhar(stats.total_registros_financeiro) : "75K";
  const cobertura = stats ? `${stats.taxa_cobertura}%` : "—";
  const periodo =
    stats?.ano_min && stats?.ano_max
      ? stats.ano_min === stats.ano_max
        ? `${stats.ano_min}`
        : `${stats.ano_min}–${stats.ano_max}`
      : "2015–2026";

  return (
    <>
      {/* ── HERO ────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ paddingTop: "4rem", paddingBottom: "4rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "3rem", alignItems: "center" }}>

            {/* Texto */}
            <div style={{ maxWidth: "36rem" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
                <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
                <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--primary))", fontFamily: "var(--font-sans)" }}>
                  Observatório Parlamentar
                </span>
              </div>

              <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 3.75rem)", marginBottom: "1.25rem" }}>
                O poder público<br />
                <em style={{ fontStyle: "normal", color: "hsl(var(--primary))" }}>às claras.</em>
              </h1>

              <p style={{ fontSize: "1.0625rem", lineHeight: 1.7, color: "hsl(var(--text-body))", marginBottom: "2rem", maxWidth: "30rem" }}>
                Dados públicos sobre emendas, gastos e votações de{" "}
                <strong style={{ color: "hsl(var(--text-headline))" }}>
                  {totalParl.toLocaleString("pt-BR")} parlamentares
                </strong>{" "}
                do Congresso Nacional — organizados para jornalistas, analistas e cidadãos.
              </p>

              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <Link
                  href="/ranking"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.75rem 1.25rem", fontSize: "0.875rem", fontWeight: 600,
                    backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))",
                    borderRadius: "2px", textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                >
                  Explorar Ranking →
                </Link>
                <Link
                  href="/about"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.375rem",
                    padding: "0.75rem 1.25rem", fontSize: "0.875rem", fontWeight: 500,
                    border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))",
                    color: "hsl(var(--text-body))", borderRadius: "2px", textDecoration: "none",
                    transition: "background-color 0.15s",
                  }}
                >
                  Como funciona
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── CAIXA DE PESQUISA LIVRE (LLM) ────────────────────────── */}
      <AskBox />

      {/* ── KPI STRIP ───────────────────────────────────────────── */}
      <div className="bloomberg-kpi-grid">
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Registros de Emendas</div>
            <div className="bloomberg-kpi-value">{totalEmendas}</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>{periodo}</div>
          </div>
        </div>
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Parlamentares</div>
            <div className="bloomberg-kpi-value">{totalParl.toLocaleString("pt-BR")}</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>Câmara + Senado</div>
          </div>
        </div>
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Com Autor Identificado</div>
            <div className="bloomberg-kpi-value">{cobertura}</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>emenda–autor</div>
          </div>
        </div>
        <div className="bloomberg-kpi">
          <div>
            <div className="bloomberg-kpi-label">Estados Cobertos</div>
            <div className="bloomberg-kpi-value">27</div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>todas as UFs</div>
          </div>
        </div>
      </div>

      {/* ── PARLAMENTARES EM DESTAQUE ───────────────────────────── */}
      {destaques.data.length > 0 && (
        <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
          <div className="container" style={{ padding: "3rem 1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
                <h2 style={{ fontSize: "1.375rem", margin: 0 }}>Parlamentares em Destaque</h2>
              </div>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
                Top {destaques.data.length} por valor empenhado · {destaques.ano}
              </span>
            </div>

            <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", marginBottom: "1.5rem", maxWidth: "40rem" }}>
              Clique em qualquer parlamentar para abrir o perfil completo com histórico, emendas e ranking por ano.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))" }}>
              {destaques.data.map((entry) => {
                const p = entry.parlamentares;
                const nome = p.nome_parlamentar || p.nome;
                return (
                  <Link
                    key={p.id}
                    href={`/ranking/${p.id}`}
                    style={{
                      display: "block",
                      padding: "1rem 1.25rem",
                      backgroundColor: "hsl(var(--card))",
                      textDecoration: "none",
                      transition: "background-color 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      {p.foto_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.foto_url}
                          alt={nome}
                          width={48}
                          height={48}
                          style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid hsl(var(--border))" }}
                        />
                      ) : (
                        <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "hsl(var(--muted))", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem", fontWeight: 600, color: "hsl(var(--text-caption))" }}>
                          {nome.charAt(0)}
                        </div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {nome}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
                          {p.partido} · {p.uf}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.125rem" }}>
                      Empenhado
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
                      {fmtBRLCompact(entry.valor_total)}
                    </div>
                    <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "hsl(var(--primary))", fontWeight: 600 }}>
                      Ver perfil →
                    </div>
                  </Link>
                );
              })}
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <Link href="/ranking" style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}>
                Ver ranking completo →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── SEÇÕES PRINCIPAIS ───────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h2 style={{ fontSize: "1.375rem", margin: 0 }}>Explore os Dados</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))" }}>

            {[
              {
                emoji: "🏆",
                title: "Ranking de Emendas",
                desc: "Parlamentares ordenados por valor total empenhado. Veja quem empenhou mais, taxa de execução e histórico por ano.",
                href: "/ranking",
                cta: "Ver ranking",
              },
              {
                emoji: "📋",
                title: "Emendas por Deputado",
                desc: "Padrões de gasto e impacto regional de cada deputado federal. Filtre por partido, UF e tipo de emenda.",
                href: "/amendments",
                cta: "Pesquisar emendas",
              },
              {
                emoji: "💰",
                title: "Gastos de Gabinete",
                desc: "Despesas de pessoal, viagens e custeio de gabinetes parlamentares, diretamente do Portal da Transparência.",
                href: "/expenses",
                cta: "Ver despesas",
              },
            ].map((card) => (
              <div
                key={card.href}
                className="bloomberg-card"
                style={{ borderRadius: 0, border: "none" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>{card.emoji}</div>
                <h3 style={{ fontSize: "1rem", marginBottom: "0.5rem", color: "hsl(var(--text-headline))" }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.6, marginBottom: "1.25rem" }}>
                  {card.desc}
                </p>
                <Link
                  href={card.href}
                  style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}
                >
                  {card.cta} →
                </Link>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ── PARA QUEM ───────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h2 style={{ fontSize: "1.375rem", margin: 0 }}>Para Diferentes Públicos</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            {[
              { icon: "👥", role: "Cidadãos", desc: "Fiscalize seus representantes com dados sobre emendas, gastos e impacto regional.", href: "/ranking" },
              { icon: "📰", role: "Jornalistas", desc: "Séries históricas e padrões anômalos para contextualizar investigações.", href: "/ranking" },
              { icon: "🎓", role: "Pesquisadores", desc: "Dados estruturados com metodologia aberta e reproduzível.", href: "/about" },
              { icon: "🤝", role: "ONGs", desc: "Use em campanhas de advocacy e monitoramento de políticas públicas.", href: "/about" },
            ].map((item) => (
              <Link
                key={item.role}
                href={item.href}
                style={{
                  display: "block",
                  padding: "1.25rem",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                  borderRadius: "2px",
                  textDecoration: "none",
                  transition: "border-color 0.15s, background-color 0.15s",
                }}
              >
                <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{item.icon}</div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))", marginBottom: "0.375rem" }}>
                  {item.role}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", lineHeight: 1.5 }}>
                  {item.desc}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOBRE ───────────────────────────────────────────────── */}
      <section>
        <div className="container" style={{ padding: "3rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h2 style={{ fontSize: "1.375rem", margin: 0 }}>Sobre o Projeto</h2>
          </div>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, marginBottom: "1rem", maxWidth: "48rem" }}>
            <strong style={{ color: "hsl(var(--text-headline))" }}>Transparência Federal</strong> reúne e organiza dados públicos
            sobre emendas ao orçamento e despesas do Congresso Nacional, a partir de fontes oficiais:
            Portal da Transparência, API da Câmara dos Deputados e dados do Senado Federal.
          </p>
          <Link href="/about" style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--primary))" }}>
            Saiba mais sobre a metodologia →
          </Link>
        </div>
      </section>
    </>
  );
}
