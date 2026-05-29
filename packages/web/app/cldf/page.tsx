import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "The BR Insider — Distrito Federal (CLDF)",
  description:
    "Atividade legislativa da Câmara Legislativa do Distrito Federal: 24 deputados distritais e proposições via portal de dados abertos CKAN. Nó estadual do observatório The BR Insider.",
  alternates: {
    canonical: "https://cldf.thebrinsider.com/",
  },
  openGraph: {
    title: "The BR Insider — CLDF",
    description:
      "Deputados distritais e proposições da Câmara Legislativa do Distrito Federal, via dados abertos.",
    url: "https://cldf.thebrinsider.com/",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

export const dynamic = "force-dynamic";

export default function CldfLandingPage() {
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
              Nó estadual · CLDF
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              margin: "0 0 1.25rem",
              lineHeight: 1.1,
            }}
          >
            Câmara Legislativa <br />
            <span style={{ color: "hsl(var(--accent))" }}>do Distrito Federal</span>
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
            Atividade legislativa dos{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>24 deputados distritais</strong>{" "}
            de Brasília — proposições e composição da casa, a partir do portal de
            dados abertos <strong style={{ color: "hsl(var(--text-headline))" }}>CKAN</strong> da CLDF.
            A capital federal é, ao mesmo tempo, estado e município: a CLDF acumula
            competências de Assembleia e de Câmara Municipal.
          </p>
        </div>
      </section>

      {/* ── KPIs ───────────────────────────────────────────────────────── */}
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
            <Kpi label="Deputados distritais" value="24" sub="Mandato vigente" />
            <Kpi label="Proposições" value="1991–2020" sub="Base histórica de dados abertos" />
            <Kpi label="Fonte" value="CKAN" sub="dados.cl.df.gov.br · API padrão" />
            <Kpi label="Votações" value="n/d" sub="Não publicadas em dados abertos" />
          </div>
        </div>
      </section>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
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
            A CLDF é a casa legislativa de Brasília — sede do poder federal. Por
            sua natureza híbrida (Distrito Federal não se divide em municípios),
            legisla sobre temas estaduais e municipais ao mesmo tempo, o que torna
            sua agenda legislativa singular entre as 27 unidades da federação.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
            O portal de dados abertos da CLDF roda em{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>CKAN</strong>, a
            plataforma padrão de dados abertos governamentais, com API estável e
            documentada. A composição da casa é atualizada mensalmente; as
            proposições estão disponíveis em série histórica por ano.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            <strong style={{ color: "hsl(var(--text-headline))" }}>Limite conhecido:</strong>{" "}
            o dataset público de proposições no CKAN vai até 2020. As proposições
            recentes vivem no portal de propostas legislativas da CLDF
            (ple.cl.df.gov.br), cuja API ainda será mapeada. Votações nominais não
            são publicadas em dados abertos. Cobrimos hoje o que a casa disponibiliza
            de forma aberta e estável — sem inventar o que não existe.
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
              titulo="CLDF — Relação nominal de deputados"
              descricao="CSV mensal com deputados distritais e servidores. Filtramos por cargo DEPUTADO DISTRITAL e mandato vigente → 24 parlamentares."
              url="https://dados.cl.df.gov.br/dataset/relacao-nominal-de-deputados-e-servidores"
              label="dataset/relacao-nominal"
            />
            <Fonte
              titulo="CLDF — Proposições"
              descricao="JSON por ano (1991–2020) com tipo, número, ementa, data de leitura e autores. API CKAN padrão."
              url="https://dados.cl.df.gov.br/dataset/proposicoes"
              label="dataset/proposicoes"
            />
            <Fonte
              titulo="CLDF — Portal de Dados Abertos (CKAN)"
              descricao="28 datasets ao todo (proposições, normas, contratos, despesas e mais). API em /api/3/action."
              url="https://dados.cl.df.gov.br/"
              label="dados.cl.df.gov.br"
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
            <RoadmapItem status="done" label="Mapeamento da API CKAN da CLDF (deputados + proposições)" />
            <RoadmapItem status="done" label="Conector implementado no pipeline de atividade legislativa" />
            <RoadmapItem status="done" label="24 deputados distritais ingeridos (schema ale_*)" />
            <RoadmapItem status="done" label="Proposições históricas (CKAN 1991–2020)" />
            <RoadmapItem status="done" label="Subdomínio cldf.thebrinsider.com" />
            <RoadmapItem status="next" label="Proposições recentes via portal PLE (ple.cl.df.gov.br)" />
            <RoadmapItem status="next" label="Votações — depende de publicação pela CLDF" />
          </ul>
        </div>
      </div>
    </>
  );
}

// ── primitivos ───────────────────────────────────────────────────────────────

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
