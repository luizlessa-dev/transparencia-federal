import { notFound } from "next/navigation";
import Link from "next/link";
import { getProposicao } from "~/services/proposicoes";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function BadgeTipo({ sigla }: { sigla: string }) {
  const cls =
    sigla === "PL"
      ? "badge-success"
      : sigla === "PEC"
      ? "badge-danger"
      : sigla === "RIC"
      ? "badge-warn"
      : "badge-neutral";
  return <span className={cls}>{sigla}</span>;
}

function tipoLongo(sigla: string): string {
  const mapa: Record<string, string> = {
    PL: "Projeto de Lei",
    PEC: "Proposta de Emenda à Constituição",
    PLP: "Projeto de Lei Complementar",
    PDC: "Projeto de Decreto Legislativo",
    REQ: "Requerimento",
    RIC: "Requerimento de Informação",
    DOC: "Documento",
    MSC: "Mensagem",
    INC: "Indicação",
    RCP: "Requerimento de CPI",
    PRC: "Projeto de Resolução",
    PFC: "Proposta de Fiscalização e Controle",
  };
  return mapa[sigla] ?? sigla;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const propId = parseInt(id, 10);
  if (isNaN(propId)) return { title: "Proposição não encontrada — The BR Insider" };
  const prop = await getProposicao(propId);
  if (!prop) return { title: "Proposição não encontrada — The BR Insider" };
  const label = prop.numero && prop.ano ? `${prop.sigla_tipo} ${prop.numero}/${prop.ano}` : prop.sigla_tipo;
  const autor = prop.autor ? ` — ${prop.autor.nome}` : "";
  return {
    title: `${label}${autor} — The BR Insider`,
    description: prop.ementa
      ? prop.ementa.length > 160
        ? prop.ementa.slice(0, 157) + "…"
        : prop.ementa
      : `Detalhes da proposição ${label}`,
  };
}

export default async function ProposicaoPage({ params }: Props) {
  const { id } = await params;
  const propId = parseInt(id, 10);
  if (isNaN(propId)) notFound();

  const prop = await getProposicao(propId);
  if (!prop) notFound();

  const label =
    prop.numero != null && prop.ano != null
      ? `${prop.sigla_tipo} ${prop.numero}/${prop.ano}`
      : prop.sigla_tipo;

  const urlCamara = `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${prop.id}`;

  return (
    <>
      {/* Cabeçalho */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Link href="/proposicoes" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              ← Produção Legislativa
            </Link>
            {prop.autor && (
              <>
                <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
                <Link
                  href={`/proposicoes/deputado/${prop.autor.deputado_id}`}
                  style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
                >
                  {prop.autor.nome}
                </Link>
              </>
            )}
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>{label}</span>
          </p>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "16rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                <div
                  style={{
                    height: "2rem",
                    width: "3px",
                    flexShrink: 0,
                    backgroundColor: "hsl(var(--primary))",
                  }}
                />
                <h1 style={{ fontSize: "1.5rem", margin: 0, fontFamily: "var(--font-mono)" }}>{label}</h1>
                <BadgeTipo sigla={prop.sigla_tipo} />
              </div>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "hsl(var(--text-caption))",
                  margin: 0,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {tipoLongo(prop.sigla_tipo)} · Apresentação em {fmtData(prop.data_apresentacao)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>
        {/* Ementa */}
        <section style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "hsl(var(--text-caption))",
              marginBottom: "0.75rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            Ementa
          </h2>
          <div
            style={{
              padding: "1.25rem 1.5rem",
              border: "1px solid hsl(var(--border))",
              borderRadius: "2px",
              backgroundColor: "hsl(var(--card))",
              borderLeft: "3px solid hsl(var(--primary))",
            }}
          >
            <p
              style={{
                fontSize: "0.9375rem",
                lineHeight: 1.7,
                color: "hsl(var(--text-body))",
                margin: 0,
                whiteSpace: "pre-line",
              }}
            >
              {prop.ementa || (
                <span style={{ color: "hsl(var(--text-caption))", fontStyle: "italic" }}>
                  Sem ementa cadastrada.
                </span>
              )}
            </p>
          </div>
        </section>

        {/* Metadados */}
        <section style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "hsl(var(--text-caption))",
              marginBottom: "0.75rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            Detalhes
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1px",
              backgroundColor: "hsl(var(--border))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "2px",
            }}
          >
            {[
              { label: "Tipo", value: `${prop.sigla_tipo} — ${tipoLongo(prop.sigla_tipo)}` },
              { label: "Número/Ano", value: prop.numero && prop.ano ? `${prop.numero}/${prop.ano}` : "—" },
              { label: "Apresentação", value: fmtData(prop.data_apresentacao) },
              { label: "ID Câmara", value: String(prop.id) },
            ].map((row) => (
              <div
                key={row.label}
                style={{
                  padding: "0.875rem 1rem",
                  backgroundColor: "hsl(var(--card))",
                }}
              >
                <div
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "hsl(var(--text-caption))",
                    marginBottom: "0.25rem",
                  }}
                >
                  {row.label}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.875rem",
                    color: "hsl(var(--text-headline))",
                  }}
                >
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Autor */}
        {prop.autor && (
          <section style={{ marginBottom: "2rem" }}>
            <h2
              style={{
                fontSize: "0.6875rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "hsl(var(--text-caption))",
                marginBottom: "0.75rem",
                fontFamily: "var(--font-sans)",
              }}
            >
              Autor
            </h2>
            <Link
              href={`/proposicoes/deputado/${prop.autor.deputado_id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem 1.25rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                backgroundColor: "hsl(var(--card))",
                textDecoration: "none",
                transition: "background-color 0.15s",
              }}
            >
              {prop.autor.url_foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prop.autor.url_foto}
                  alt={prop.autor.nome}
                  width={48}
                  height={48}
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    objectFit: "cover",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    backgroundColor: "hsl(var(--muted))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.125rem",
                    fontWeight: 600,
                    color: "hsl(var(--text-caption))",
                  }}
                >
                  {prop.autor.nome.charAt(0)}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 600,
                    color: "hsl(var(--text-headline))",
                  }}
                >
                  {prop.autor.nome}
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "hsl(var(--text-caption))",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {prop.autor.sigla_partido} · {prop.autor.sigla_uf}
                </div>
              </div>
              <span style={{ fontSize: "0.8125rem", color: "hsl(var(--primary))", fontWeight: 600 }}>
                Ver todas as proposições →
              </span>
            </Link>
          </section>
        )}

        {/* Link externo */}
        <section>
          <h2
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "hsl(var(--text-caption))",
              marginBottom: "0.75rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            Fonte oficial
          </h2>
          <a
            href={urlCamara}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.75rem 1.125rem",
              border: "1px solid hsl(var(--border))",
              borderRadius: "2px",
              backgroundColor: "hsl(var(--card))",
              color: "hsl(var(--text-headline))",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ficha completa no portal da Câmara dos Deputados ↗
          </a>
          <p
            style={{
              marginTop: "0.625rem",
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              fontFamily: "var(--font-sans)",
            }}
          >
            Inclui tramitação completa, relatórios, votações, pareceres e documentos anexos.
          </p>
        </section>
      </div>
    </>
  );
}
