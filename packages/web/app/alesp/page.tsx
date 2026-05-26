import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The BR Insider — São Paulo (ALESP)",
  description:
    "611 mil despesas de gabinete dos deputados estaduais de São Paulo desde 2015. 94 deputados em exercício + 285 ex-deputados catalogados. Cruzamento com dados federais. Nó estadual do observatório The BR Insider.",
  alternates: {
    canonical: "https://alesp.thebrinsider.com/",
  },
  openGraph: {
    title: "The BR Insider — ALESP",
    description:
      "611 mil despesas com CNPJ de fornecedor — 11 anos de histórico atravessando 3 legislaturas paulistas.",
    url: "https://alesp.thebrinsider.com/",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

export const dynamic = "force-dynamic"; // layout precisa de headers() pra resolver host do subdomínio

export default function AlespLandingPage() {
  return (
    <>
      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "4rem 1.5rem 3rem", maxWidth: "880px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--accent))" }} />
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "hsl(var(--accent))",
                fontFamily: "var(--font-sans)",
              }}
            >
              Nó estadual · Em construção
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              margin: "0 0 1.25rem",
              lineHeight: 1.1,
            }}
          >
            Assembleia Legislativa <br />
            <span style={{ color: "hsl(var(--accent))" }}>de São Paulo</span>
          </h1>

          <p
            style={{
              fontSize: "1.0625rem",
              lineHeight: 1.6,
              color: "hsl(var(--text-body))",
              maxWidth: "640px",
              margin: "0 0 1rem",
            }}
          >
            <strong style={{ color: "hsl(var(--text-headline))" }}>611.485 despesas</strong>{" "}
            de gabinete dos deputados estaduais de São Paulo, com CNPJ do
            fornecedor e categoria — desde janeiro de 2015, atravessando três
            legislaturas paulistas. 94 deputados em exercício e 285
            ex-deputados estão catalogados.
          </p>

          <p
            style={{
              fontSize: "0.875rem",
              lineHeight: 1.6,
              color: "hsl(var(--text-caption))",
              maxWidth: "640px",
              margin: 0,
            }}
          >
            Segundo nó estadual da plataforma{" "}
            <a
              href="https://www.thebrinsider.com"
              style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
            >
              The BR Insider
            </a>
            . Lançamento previsto: julho de 2026.
          </p>
        </div>
      </section>

      {/* ── KPIs do escopo ─────────────────────────────────────────────── */}
      <section style={{ backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem", maxWidth: "880px" }}>
          <h2
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "hsl(var(--text-caption))",
              margin: "0 0 1rem 0",
            }}
          >
            O que está sendo coberto
          </h2>
          <div className="bloomberg-kpi-grid">
            <Kpi label="Deputados catalogados" value="379" sub="94 em exercício + 285 ex-deputados" />
            <Kpi label="Histórico" value="11 anos" sub="jan/2015 → mês corrente · 3 legislaturas" />
            <Kpi label="Despesas catalogadas" value="611.485" sub="100% do XML público da ALESP" />
            <Kpi label="Granularidade" value="Mês × CNPJ" sub="Sem nº doc nem data exata na fonte" />
          </div>
        </div>
      </section>

      {/* ── Cards explicativos ─────────────────────────────────────────── */}
      <div className="container" style={{ padding: "2rem 1.5rem 4rem", maxWidth: "880px" }}>
        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h3
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "hsl(var(--text-caption))",
              margin: "0 0 0.875rem 0",
            }}
          >
            Por que esse nó importa
          </h3>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "hsl(var(--text-body))",
              lineHeight: 1.65,
              margin: "0 0 0.75rem",
            }}
          >
            A ALESP é uma exceção entre as assembleias estaduais brasileiras: publica{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              dados abertos formais em XML
            </strong>
            , atualizados diariamente, sem autenticação e sem rate limit. As{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>611.485</strong>{" "}
            despesas históricas vêm num único arquivo de 170 MB —{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              não há janela rolante, não há scraping
            </strong>
            .
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
            A granularidade é menor que na ALMG: a ALESP publica{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              valor + CNPJ + fornecedor + categoria por mês
            </strong>
            , mas não o número do documento fiscal nem a data exata. Despesas
            atravessam três legislaturas paulistas — a base inclui{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              285 ex-deputados
            </strong>{" "}
            cujos mandatos terminaram antes de 2023, marcados como históricos,
            ao lado dos 94 deputados em exercício hoje.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            O nó cruza os fornecedores ALESP com a base federal — mesmos CNPJs
            aparecem em CEAP da Câmara, emendas pagas e contratos federais.
            Onze anos é tempo suficiente pra mapear redes de fornecedores
            estáveis que atravessam mandatos e esferas, e mais de duas
            centenas de ex-parlamentares pra cruzar com trajetórias políticas
            atuais.
          </p>
        </div>

        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h3
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "hsl(var(--text-caption))",
              margin: "0 0 0.875rem 0",
            }}
          >
            Fontes
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <Fonte
              titulo="ALESP — Portal de Dados Abertos"
              descricao="Catálogo público com 26 datasets em XML. Lista deputados, despesas, comissões, proposições, normas. Atualização diária."
              url="https://www.al.sp.gov.br/dados-abertos/"
              label="al.sp.gov.br/dados-abertos"
            />
            <Fonte
              titulo="deputados.xml"
              descricao="Lista dos 94 deputados em exercício na legislatura atual. Inclui matrícula (chave de junção), partido, contato, biografia."
              url="https://www.al.sp.gov.br/repositorioDados/deputados/deputados.xml"
              label="deputados.xml (300 KB)"
            />
            <Fonte
              titulo="despesas_gabinetes.xml"
              descricao="Histórico completo de despesas de gabinete desde jan/2015 — 611.485 registros em 170 MB. Lido via streaming SAX após download local (download em ~75s, processamento em ~6 min)."
              url="https://www.al.sp.gov.br/repositorioDados/deputados/despesas_gabinetes.xml"
              label="despesas_gabinetes.xml (170 MB)"
            />
            <Fonte
              titulo="Votações nominais (futuro)"
              descricao="Em avaliação técnica — fonte ainda a mapear no portal."
              url={null}
              label={null}
            />
          </div>
        </div>

        <div className="bloomberg-card">
          <h3
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "hsl(var(--text-caption))",
              margin: "0 0 0.875rem 0",
            }}
          >
            Quando fica pronto
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
            }}
          >
            <RoadmapItem status="done" label="Schema canônico publicado (parlamentares_estaduais + gastos_parlamentares)" />
            <RoadmapItem status="done" label="Parser XML streaming validado (94 deputados + 611k despesas)" />
            <RoadmapItem status="done" label="Backfill de parlamentares históricos (legislaturas anteriores)" />
            <RoadmapItem status="wip"  label="Listagem pública de deputados e ranking de gastos" />
            <RoadmapItem status="next" label="Detalhe por deputado: despesas, fornecedores recorrentes, cruzamento federal" />
            <RoadmapItem status="next" label="Cron diário automático (GitHub Actions)" />
            <RoadmapItem status="next" label="Cruzamento ALESP × ALMG × Câmara — fornecedores em comum" />
          </ul>
        </div>
      </div>
    </>
  );
}

// ── primitives ───────────────────────────────────────────────────────────

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
      <div
        style={{
          fontSize: "0.6875rem",
          color: "hsl(var(--text-caption))",
          fontFamily: "var(--font-sans)",
          marginTop: "0.25rem",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function Fonte({
  titulo,
  descricao,
  url,
  label,
}: {
  titulo: string;
  descricao: string;
  url: string | null;
  label: string | null;
}) {
  return (
    <div style={{ paddingLeft: "0.875rem", borderLeft: "2px solid hsl(var(--border))" }}>
      <div
        style={{
          fontSize: "0.8125rem",
          fontWeight: 600,
          color: "hsl(var(--text-headline))",
          marginBottom: "0.25rem",
        }}
      >
        {titulo}
      </div>
      <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
        {descricao}
        {url && label && (
          <>
            {" — "}
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "hsl(var(--primary))",
                fontFamily: "var(--font-mono)",
                fontSize: "0.75rem",
              }}
            >
              {label}
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function RoadmapItem({ status, label }: { status: "done" | "wip" | "next"; label: string }) {
  const cls =
    status === "done" ? "badge-success" : status === "wip" ? "badge-warn" : "badge-neutral";
  const txt = status === "done" ? "Pronto" : status === "wip" ? "Em curso" : "Próximo";
  return (
    <li style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span className={cls} style={{ minWidth: "5.5rem", textAlign: "center" }}>
        {txt}
      </span>
      <span>{label}</span>
    </li>
  );
}
