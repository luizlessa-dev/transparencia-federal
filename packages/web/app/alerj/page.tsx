/**
 * ALERJ — página de bloqueio.
 *
 * Rota: alerj.transparenciafederal.org/ → /alerj
 *
 * A ALERJ não publica dados abertos formais de gastos de gabinete com
 * granularidade de fornecedor/CNPJ — só lista de assessores nomeados (PDF) e
 * subsídios agregados (HTML). Esta página documenta o bloqueio em paralelo a
 * um pedido formal de LAI.
 */
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Transparência Federal — Rio de Janeiro (ALERJ)",
  description:
    "A ALERJ não publica dados abertos de despesas dos deputados com CNPJ do fornecedor. Mapeamento do bloqueio e pedido formal de LAI em curso. Nó editorial da plataforma Transparência Federal.",
  alternates: {
    canonical: "https://alerj.transparenciafederal.org/",
  },
  openGraph: {
    title: "Transparência Federal — ALERJ bloqueia",
    description:
      "A única assembleia entre SP, MG e RJ sem dados abertos de despesas com fornecedor. LAI em curso.",
    url: "https://alerj.transparenciafederal.org/",
    siteName: "Transparência Federal",
    type: "website",
    locale: "pt_BR",
  },
};

export const dynamic = "force-dynamic"; // layout precisa de headers() pra resolver host do subdomínio

export default function AlerjLandingPage() {
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
            <div
              style={{
                height: "2px",
                width: "2rem",
                backgroundColor: "hsl(var(--badge-danger-fg))",
              }}
            />
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                color: "hsl(var(--badge-danger-fg))",
                fontFamily: "var(--font-sans)",
              }}
            >
              Nó editorial · Acesso bloqueado
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
            <span style={{ color: "hsl(var(--badge-danger-fg))" }}>
              do Rio de Janeiro
            </span>
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
            A ALERJ é a única, entre as três maiores assembleias estaduais do
            país, que <strong>não publica</strong> os gastos dos deputados com
            fornecedor e CNPJ. O sistema interno existe — DOCIGP, regulado pelo
            Ato N/MD nº 641/2019 — mas é fechado por autenticação.
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
            Nó editorial da plataforma{" "}
            <a
              href="https://www.transparenciafederal.com"
              style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
            >
              Transparência Federal
            </a>
            . Esta página documenta o que falta e o pedido formal de LAI em curso.
          </p>
        </div>
      </section>

      {/* ── Comparativo ALMG × ALESP × ALERJ ───────────────────────────── */}
      <section style={{ backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem", maxWidth: "880px" }}>
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
            O que cada assembleia publica
          </h2>

          <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ textAlign: "center" }}>ALMG (MG)</th>
                  <th style={{ textAlign: "center" }}>ALESP (SP)</th>
                  <th
                    style={{
                      textAlign: "center",
                      color: "hsl(var(--badge-danger-fg))",
                    }}
                  >
                    ALERJ (RJ)
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompRow item="Portal de dados abertos formal" almg="parcial" alesp="sim" alerj="nao" />
                <CompRow item="API ou XML público de despesas" almg="parcial" alesp="sim" alerj="nao" />
                <CompRow item="Valor da despesa por mês × deputado" almg="sim" alesp="sim" alerj="nao" />
                <CompRow item="Nome do fornecedor" almg="sim" alesp="sim" alerj="nao" />
                <CompRow item="CNPJ do fornecedor" almg="sim" alesp="sim" alerj="nao" />
                <CompRow item="Categoria da despesa" almg="sim" alesp="sim" alerj="nao" />
                <CompRow item="Histórico (anos cobertos)" almg="15 meses" alesp="11 anos" alerj="—" />
                <CompRow item="Sistema com dado granular" almg="público" alesp="público" alerj="DOCIGP (login)" />
                <CompRow item="Lista de assessores e salários" almg="sim" alesp="sim" alerj="sim (PDF)" />
                <CompRow item="Subsídio do deputado" almg="sim" alesp="sim" alerj="sim (HTML)" />
                <CompRow item="Diárias e viagens" almg="sim" alesp="sim" alerj="sim (HTML)" />
              </tbody>
            </table>
          </div>

          <p
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginTop: "0.875rem",
              lineHeight: 1.6,
            }}
          >
            "Parcial" na ALMG: o CSV "oficial" tem as colunas críticas vazias —
            o dado real só está disponível por HTML scraping de uma janela
            rolante de ~15 meses. "Não" na ALERJ: a rubrica equivalente à
            verba indenizatória não existe formalmente; existe um sistema
            paralelo (DOCIGP) com despesas detalhadas, mas é autenticado.
          </p>
        </div>
      </section>

      {/* ── Cards explicativos ─────────────────────────────────────────── */}
      <div className="container" style={{ padding: "2rem 1.5rem 4rem", maxWidth: "880px" }}>
        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h3 style={sectionTitle}>O que existe — e o que não dá pra fazer com isso</h3>
          <p style={paragraph}>
            O Portal de Transparência da ALERJ publica relatórios em HTML com{" "}
            <strong>lista de assessores nomeados</strong> (cargos e
            vencimentos),{" "}
            <strong>subsídios dos deputados</strong> em valores agregados,{" "}
            <strong>diárias autorizadas</strong>, contratos da Casa,{" "}
            <strong>execução orçamentária geral</strong> e pagamentos. É um conjunto
            válido pra fiscalizar a folha — mas{" "}
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              não permite responder a pergunta básica
            </strong>{" "}
            que os portais da ALMG e da ALESP respondem:{" "}
            <em>"em quem o deputado X gastou dinheiro público este ano?"</em>
          </p>
          <p style={paragraph}>
            A rubrica "verba indenizatória" — equivalente ao CEAP federal — não
            existe formalmente na ALERJ. Foi extinta após o esquema de 2017. Em
            seu lugar entrou o DOCIGP (Descentralização Orçamentária de Custeio
            Individualizado para Gabinete Parlamentar), regulado pelo{" "}
            <strong>Ato N/MD nº 641/2019</strong>. Esse sistema acompanha os
            gastos por gabinete em detalhe — mas{" "}
            <strong>está atrás de login</strong>, acessível apenas a servidores
            e parlamentares.
          </p>
        </div>

        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h3 style={sectionTitle}>O pedido formal — LAI em curso</h3>
          <p style={paragraph}>
            Em paralelo a esta página, foi protocolado um pedido formal de Lei
            de Acesso à Informação requerendo a publicação dos dados do DOCIGP
            em formato aberto (CSV ou XML mensal), com granularidade compatível
            com a oferecida pela ALMG e pela ALESP — deputado, mês, fornecedor,
            CNPJ, categoria, valor.
          </p>
          <p style={{ ...paragraph, margin: 0 }}>
            <Link
              href="/lai"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "underline",
                fontWeight: 600,
              }}
            >
              → Ler o pedido completo e acompanhar o status
            </Link>
          </p>
        </div>

        <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
          <h3 style={sectionTitle}>Histórico de acesso à informação</h3>
          <p style={paragraph}>
            Em fevereiro de 2025, o ICL Notícias publicou reportagem detalhando
            o descumprimento sistemático da Lei de Acesso à Informação pela
            ALERJ — pedidos sem resposta, dados desatualizados, ausência de
            transparência ativa em rubricas relevantes.{" "}
            <a
              href="https://iclnoticias.com.br/contra-a-lei-alerj-transparencia-dados-publicos/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}
            >
              Leia a reportagem original →
            </a>
          </p>
          <p style={{ ...paragraph, margin: 0 }}>
            Esta página existe pra dar continuidade a essa cobrança. A cada
            resposta — ou silêncio — da ALERJ, o registro é atualizado aqui e na{" "}
            <em>Bastidores BR</em>, a newsletter editorial da plataforma.
          </p>
        </div>

        <div className="bloomberg-card">
          <h3 style={sectionTitle}>Fontes consultadas</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <Fonte
              titulo="Portal de Transparência da ALERJ"
              descricao="Relatórios em HTML por seção. Sem catálogo de dados abertos, sem CSV/JSON/XML público, sem API."
              url="https://transparencia.alerj.rj.gov.br/"
              label="transparencia.alerj.rj.gov.br"
            />
            <Fonte
              titulo="DOCIGP — sistema de descentralização orçamentária"
              descricao="Onde o dado granular de gastos por gabinete existe — mas atrás de login. Regulado pelo Ato N/MD nº 641/2019."
              url="https://docigp.alerj.rj.gov.br/"
              label="docigp.alerj.rj.gov.br (login)"
            />
            <Fonte
              titulo="Alô ALERJ — canal oficial de LAI"
              descricao="Onde o pedido formal foi protocolado. Prazo legal: 20 dias úteis, prorrogável por mais 10."
              url="https://www.aloalerj.rj.gov.br/"
              label="aloalerj.rj.gov.br"
            />
          </div>
        </div>
      </div>
    </>
  );
}

// ── primitives ───────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "hsl(var(--text-caption))",
  margin: "0 0 0.875rem 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "hsl(var(--text-body))",
  lineHeight: 1.65,
  margin: "0 0 0.75rem",
};

function CompRow({
  item,
  almg,
  alesp,
  alerj,
}: {
  item: string;
  almg: string;
  alesp: string;
  alerj: string;
}) {
  return (
    <tr>
      <td style={{ fontSize: "0.8125rem" }}>{item}</td>
      <td style={{ textAlign: "center" }}>
        <StatusCell value={almg} />
      </td>
      <td style={{ textAlign: "center" }}>
        <StatusCell value={alesp} />
      </td>
      <td style={{ textAlign: "center" }}>
        <StatusCell value={alerj} />
      </td>
    </tr>
  );
}

function StatusCell({ value }: { value: string }) {
  if (value === "sim") {
    return (
      <span className="badge-success" style={{ fontSize: "0.6875rem" }}>
        sim
      </span>
    );
  }
  if (value === "nao") {
    return (
      <span className="badge-danger" style={{ fontSize: "0.6875rem" }}>
        não
      </span>
    );
  }
  if (value === "parcial") {
    return (
      <span className="badge-warn" style={{ fontSize: "0.6875rem" }}>
        parcial
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: "0.75rem",
        color: "hsl(var(--text-body))",
        fontFamily: "var(--font-sans)",
      }}
    >
      {value}
    </span>
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
  url: string;
  label: string;
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
      </div>
    </div>
  );
}
