import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Transparência Federal — Minas Gerais (ALMG)",
  description:
    "Verba indenizatória, votações e tramitações dos 77 deputados da Assembleia Legislativa de Minas Gerais. Nó estadual do observatório Transparência Federal.",
  alternates: {
    canonical: "https://almg.transparenciafederal.org/",
  },
  openGraph: {
    title: "Transparência Federal — ALMG",
    description:
      "Nota a nota, fornecedor a fornecedor: gastos dos 77 deputados estaduais de Minas Gerais.",
    url: "https://almg.transparenciafederal.org/",
    siteName: "Transparência Federal",
    type: "website",
    locale: "pt_BR",
  },
};

export const dynamic = "force-dynamic"; // layout precisa de headers() pra resolver host do subdomínio

export default function AlmgLandingPage() {
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
            <span style={{ color: "hsl(var(--accent))" }}>de Minas Gerais</span>
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
            Nota a nota, fornecedor a fornecedor: os gastos dos 77 deputados
            estaduais de Minas Gerais. O portal da ALMG disponibiliza os últimos
            15 meses via HTML — fev/2025 em diante, atualizado mensalmente.
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
            Primeiro nó estadual da plataforma{" "}
            <a
              href="https://www.transparenciafederal.com"
              style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
            >
              Transparência Federal
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
            <Kpi label="Deputados" value="77" sub="20ª legislatura" />
            <Kpi label="Histórico" value="15 meses" sub="fev/2025 → abr/2026" />
            <Kpi label="Granularidade" value="Nota fiscal" sub="CNPJ + valor + data" />
            <Kpi label="Categorias" value="9" sub="Combustível, divulgação, locação, consultoria e mais" />
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
            A ALMG publica um CSV "oficial" de verba indenizatória — mas as
            colunas críticas (valor, fornecedor, CNPJ, data da nota) estão{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              vazias em 100% dos registros
            </strong>
            , desde 2019 até hoje. O dado real existe apenas na página HTML
            renderizada no servidor, com uma janela rolante de{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              ~15 meses disponíveis
            </strong>{" "}
            por vez — atualmente fev/2025 a abr/2026.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            Este nó raspa essa página nota a nota e disponibiliza os dados num
            formato cruzável com a base federal — mesmos fornecedores, mesmos
            CNPJs, mesmos doadores em contratos públicos de escalas diferentes.
            A cada mês, o período mais antigo some do portal; capturamos antes
            que isso aconteça.
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
              titulo="ALMG — Dados Abertos (API REST)"
              descricao="Lista de deputados, contratos, proposições e comissões. Limite: 1 req/s."
              url="https://dadosabertos.almg.gov.br"
              label="dadosabertos.almg.gov.br"
            />
            <Fonte
              titulo="ALMG — Portal Transparência (HTML)"
              descricao="Verba indenizatória nota a nota. Filtragem via POST `periodo=MMYYYY`."
              url="https://www.almg.gov.br/transparencia/prestacao-de-contas/deputados/verba-indenizatoria/"
              label="almg.gov.br/transparencia"
            />
            <Fonte
              titulo="Diário do Legislativo MG (futuro)"
              descricao="Votações nominais em plenário. Em avaliação técnica."
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
            <RoadmapItem status="done" label="Schema canônico publicado" />
            <RoadmapItem status="done" label="Parser HTML validado em múltiplos meses" />
            <RoadmapItem status="done" label="31.387 notas ingeridas (fev/2025–abr/2026)" />
            <RoadmapItem status="done" label={<><a href="/ranking" style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}>Ranking público de gastos</a> por deputado</>} />
            <RoadmapItem status="done" label={<><a href="/ranking/1099" style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}>Detalhe por deputado</a>: notas, fornecedores recorrentes, evolução mensal</>} />
            <RoadmapItem status="done" label="Cron mensal automático (GitHub Actions) — dia 5 de cada mês" />
            <RoadmapItem status="next" label="Cruzamento federal: mesmos CNPJs entre verba ALMG e fornecedores de emendas/CEAP" />
            <RoadmapItem status="next" label="Votações nominais (Diário do Legislativo MG — em avaliação técnica)" />
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

function RoadmapItem({ status, label }: { status: "done" | "wip" | "next"; label: React.ReactNode }) {
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
