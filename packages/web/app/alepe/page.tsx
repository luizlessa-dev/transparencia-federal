import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "The BR Insider — Pernambuco (ALEPE)",
  description:
    "Verba indenizatória dos 49 deputados estaduais de Pernambuco, nota a nota, com CNPJ do fornecedor — desde janeiro de 2015. Nó estadual do observatório The BR Insider.",
  alternates: {
    canonical: "https://alepe.thebrinsider.com/",
  },
  openGraph: {
    title: "The BR Insider — ALEPE",
    description:
      "Nota a nota, CNPJ a CNPJ: 11 anos de despesas dos deputados estaduais de Pernambuco.",
    url: "https://alepe.thebrinsider.com/",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

export const dynamic = "force-dynamic";

export default function AlepeLandingPage() {
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
              Nó estadual · ALEPE
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
            <span style={{ color: "hsl(var(--accent))" }}>de Pernambuco</span>
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
            Verba indenizatória dos{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>49 deputados estaduais</strong>{" "}
            de Pernambuco, nota a nota, com CNPJ do fornecedor e data da despesa.
            API pública disponível desde{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>janeiro de 2015</strong>{" "}
            — 11 anos de histórico.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
            <a
              href="/ranking"
              style={{
                fontSize: "0.875rem",
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Ranking de gastos →
            </a>
            <a
              href="/cruzamento"
              style={{
                fontSize: "0.875rem",
                color: "hsl(var(--primary))",
                textDecoration: "underline",
              }}
            >
              Cruzamento ALEPE × Câmara × ALESP →
            </a>
          </div>
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
            <Kpi label="Deputados" value="163" sub="49 ativos + 114 históricos" />
            <Kpi label="Histórico" value="11 anos" sub="jan/2015 → mês corrente" />
            <Kpi label="Notas fiscais" value="27.875" sub="R$ 157,6 mi em verbas" />
            <Kpi label="Categorias" value="15 rubricas" sub="Jurídico, publicidade, telecom e mais" />
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
            Pernambuco é o maior estado do Nordeste por PIB e população, com uma
            assembleia de 49 deputados que movimenta cerca de R$ 30 milhões/ano
            em verbas de gabinete. A ALEPE publica os dados via{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              API PHP acessível sem autenticação
            </strong>
            , com granularidade de nota fiscal — CNPJ, empresa, data e valor
            por item de despesa.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: "0 0 0.75rem" }}>
            A granularidade da ALEPE é{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              superior à da ALESP
            </strong>
            : além do CNPJ do fornecedor e da categoria, publica também{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              a data exata de cada nota
            </strong>
            . O histórico cobre 11 anos (2015–2026), atravessando três
            legislaturas pernambucanas.
          </p>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.65, margin: 0 }}>
            O nó cruza fornecedores ALEPE com a base federal — os mesmos CNPJs
            aparecem em CEAP da Câmara, emendas parlamentares e contratos
            federais. Pernambuco tem delegação expressiva no Congresso Nacional:
            cruzar as duas esferas revela conexões entre gastos estaduais e
            federais de parlamentares com duplo mandato histórico.
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
              titulo="ALEPE — Lista de Deputados"
              descricao="JSON com 163 deputados históricos (leg=-16) ou 49 da legislatura atual (leg=17). Inclui id, nome, partido e e-mail."
              url="https://www.alepe.pe.gov.br/servicos/transparencia/dep/deputados.php?leg=17"
              label="dep/deputados.php"
            />
            <Fonte
              titulo="ALEPE — Meses Disponíveis"
              descricao="JSON com os meses que têm verba registrada por deputado/ano. Sem autenticação."
              url="https://www.alepe.pe.gov.br/servicos/transparencia/adm/verbaindenizatoria-dep-meses.php?dep=4508&ano=2025"
              label="adm/verbaindenizatoria-dep-meses.php"
            />
            <Fonte
              titulo="ALEPE — Notas da Verba"
              descricao="JSON com os itens de despesa por documento (rubrica, CNPJ, empresa, data, valor). Um GET por docid. Valor em BRL — sem centavos em docs 2019+, com vírgula decimal em docs 2015–2018."
              url="https://www.alepe.pe.gov.br/servicos/transparencia/adm/verbaindenizatorianotas.php?docid=6616"
              label="adm/verbaindenizatorianotas.php"
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
            <RoadmapItem status="done" label="Mapeamento completo da API ALEPE (4 endpoints, sem auth)" />
            <RoadmapItem status="done" label="Pacote ingestao-alepe implementado (job-deputados + job-despesas)" />
            <RoadmapItem status="done" label="Migration SQL — ALEPE seed em casas" />
            <RoadmapItem status="done" label="Site config + subdomínio alepe.thebrinsider.com" />
            <RoadmapItem status="done" label="Carga histórica 2015–2026 (163 deputados, 27.875 notas, R$ 157,6 mi)" />
            <RoadmapItem status="done" label="Workflow GHA para cron mensal (dia 5 de cada mês)" />
            <RoadmapItem status="done" label="Ranking público de gastos por deputado" />
            <RoadmapItem status="done" label="Detalhe por deputado: notas, fornecedores, evolução mensal" />
            <RoadmapItem status="done" label="Cruzamento ALEPE × Câmara × ALESP — 121 CNPJs, R$ 90,7 mi cruzados" />
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
