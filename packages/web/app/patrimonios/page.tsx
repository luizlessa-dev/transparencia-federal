import Link from "next/link";
import { getTseBensRanking, ANOS_ELEITORAIS } from "~/services/tse";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    ano?: string;
    cargo?: string;
    uf?: string;
    partido?: string;
    page?: string;
  }>;
}

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function buildUrl(
  base: Record<string, string | undefined>,
  override: Record<string, string | undefined>
) {
  const merged = { ...base, ...override };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/patrimonios${qs ? `?${qs}` : ""}`;
}

function cargoLabel(cd: number) {
  return cd === 5 ? "Senador" : cd === 6 ? "Dep. Federal" : "Outro";
}

export function generateMetadata() {
  return {
    title: "Patrimônio Declarado — Transparência Federal",
    description:
      "Ranking de patrimônio declarado por candidatos a deputado federal e senador nas eleições de 2022 e 2018. Dados da declaração de bens do TSE.",
  };
}

export default async function PatrimoniosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ano = ANOS_ELEITORAIS.includes(Number(sp.ano)) ? Number(sp.ano) : 2022;
  const cargo = sp.cargo ?? "";
  const uf = sp.uf ?? "";
  const partido = sp.partido ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));
  const PER_PAGE = 50;

  const currentParams: Record<string, string | undefined> = {
    ano: String(ano),
    cargo: cargo || undefined,
    uf: uf || undefined,
    partido: partido || undefined,
  };

  const { data, total } = await getTseBensRanking(ano, page, PER_PAGE, {
    cargo: cargo || undefined,
    uf: uf || undefined,
    partido: partido || undefined,
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      {/* Header */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "0.5rem",
            }}
          >
            <div
              style={{
                height: "2rem",
                width: "3px",
                flexShrink: 0,
                backgroundColor: "hsl(var(--primary))",
              }}
            />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>
              Patrimônio Declarado
            </h1>
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-caption))",
              marginLeft: "calc(3px + 0.75rem)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {fmtN(total)} candidatos · eleições {ano} · declaração de bens ao TSE
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* Filtros */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1.25rem",
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            backgroundColor: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "2px",
          }}
        >
          {/* Ano */}
          <div>
            <div
              style={{
                fontSize: "0.625rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "hsl(var(--text-caption))",
                marginBottom: "0.375rem",
              }}
            >
              Eleição
            </div>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {ANOS_ELEITORAIS.map((a) => (
                <Link
                  key={a}
                  href={buildUrl(currentParams, { ano: String(a), page: "1" })}
                  style={{
                    padding: "0.3rem 0.625rem",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: a === ano ? 600 : 400,
                    color:
                      a === ano
                        ? "hsl(var(--primary-foreground))"
                        : "hsl(var(--text-body))",
                    backgroundColor:
                      a === ano ? "hsl(var(--primary))" : "transparent",
                    border: `1px solid ${a === ano ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                    borderRadius: "2px",
                    textDecoration: "none",
                  }}
                >
                  {a}
                </Link>
              ))}
            </div>
          </div>

          {/* Cargo */}
          <div>
            <div
              style={{
                fontSize: "0.625rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "hsl(var(--text-caption))",
                marginBottom: "0.375rem",
              }}
            >
              Cargo
            </div>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {[
                { label: "Todos", value: "" },
                { label: "Deputado Federal", value: "deputado" },
                { label: "Senador", value: "senador" },
              ].map((c) => {
                const active = cargo === c.value;
                return (
                  <Link
                    key={c.value || "todos"}
                    href={buildUrl(currentParams, {
                      cargo: c.value || undefined,
                      page: "1",
                    })}
                    style={{
                      padding: "0.3rem 0.625rem",
                      fontSize: "0.75rem",
                      fontWeight: active ? 600 : 400,
                      color: active
                        ? "hsl(var(--primary-foreground))"
                        : "hsl(var(--text-body))",
                      backgroundColor: active
                        ? "hsl(var(--primary))"
                        : "transparent",
                      border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                      borderRadius: "2px",
                      textDecoration: "none",
                    }}
                  >
                    {c.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* UF */}
          <div>
            <div
              style={{
                fontSize: "0.625rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "hsl(var(--text-caption))",
                marginBottom: "0.375rem",
              }}
            >
              UF{" "}
              {uf && (
                <span style={{ color: "hsl(var(--primary))" }}>({uf})</span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.375rem",
                flexWrap: "wrap",
              }}
            >
              {uf ? (
                <Link
                  href={buildUrl(currentParams, { uf: undefined, page: "1" })}
                  style={{
                    padding: "0.3rem 0.625rem",
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    color: "hsl(var(--primary-foreground))",
                    backgroundColor: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary))",
                    borderRadius: "2px",
                    textDecoration: "none",
                  }}
                >
                  {uf} ×
                </Link>
              ) : (
                UFS.map((u) => (
                  <Link
                    key={u}
                    href={buildUrl(currentParams, { uf: u, page: "1" })}
                    style={{
                      padding: "0.3rem 0.5rem",
                      fontSize: "0.6875rem",
                      fontFamily: "var(--font-mono)",
                      color: "hsl(var(--text-body))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "2px",
                      textDecoration: "none",
                    }}
                  >
                    {u}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div style={{ overflowX: "auto" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>#</th>
                <th>Candidato</th>
                <th>Cargo</th>
                <th>UF</th>
                <th>Partido</th>
                <th style={{ textAlign: "right" }}>Bens (qtd)</th>
                <th style={{ textAlign: "right" }}>Patrimônio</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      padding: "3rem",
                      color: "hsl(var(--text-caption))",
                    }}
                  >
                    Nenhum candidato encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                data.map((cand, i) => (
                  <tr key={cand.sq_candidato}>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        color: "hsl(var(--text-caption))",
                        fontSize: "0.75rem",
                      }}
                    >
                      {(page - 1) * PER_PAGE + i + 1}
                    </td>
                    <td>
                      <Link
                        href={
                          "/funding/" +
                          encodeURIComponent(cand.sq_candidato) +
                          "?ano=" +
                          cand.ano_eleicao
                        }
                        style={{
                          fontWeight: 600,
                          color: "hsl(var(--primary))",
                          fontSize: "0.8125rem",
                          textDecoration: "none",
                        }}
                      >
                        {cand.nm_candidato}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={
                          cand.cd_cargo === 5 ? "badge-warn" : "badge-success"
                        }
                      >
                        {cargoLabel(cand.cd_cargo)}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        color: "hsl(var(--text-caption))",
                      }}
                    >
                      {cand.sg_uf || "—"}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        color: "hsl(var(--text-body))",
                      }}
                    >
                      {cand.sg_partido ?? "—"}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.8125rem",
                        color: "hsl(var(--text-caption))",
                      }}
                    >
                      {fmtN(cand.total_bens)}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "hsl(var(--text-headline))",
                        fontSize: "0.875rem",
                      }}
                    >
                      {fmtBRL(cand.total_patrimonio)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              marginTop: "2rem",
            }}
          >
            {page > 1 && (
              <Link
                href={buildUrl(currentParams, { page: String(page - 1) })}
                style={{
                  padding: "0.4rem 0.875rem",
                  fontSize: "0.8125rem",
                  backgroundColor: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  textDecoration: "none",
                  color: "hsl(var(--text-body))",
                  fontFamily: "var(--font-mono)",
                }}
              >
                ← Anterior
              </Link>
            )}
            <span
              style={{
                fontSize: "0.75rem",
                color: "hsl(var(--text-caption))",
                fontFamily: "var(--font-mono)",
                padding: "0 0.5rem",
              }}
            >
              {fmtN((page - 1) * PER_PAGE + 1)}–
              {fmtN(Math.min(page * PER_PAGE, total))} de {fmtN(total)}
            </span>
            {page < totalPages && (
              <Link
                href={buildUrl(currentParams, { page: String(page + 1) })}
                style={{
                  padding: "0.4rem 0.875rem",
                  fontSize: "0.8125rem",
                  backgroundColor: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  textDecoration: "none",
                  color: "hsl(var(--text-body))",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Próxima →
              </Link>
            )}
          </div>
        )}

        {/* Nota metodológica */}
        <div
          style={{
            marginTop: "2.5rem",
            padding: "1rem 1.25rem",
            backgroundColor: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "2px",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              color: "hsl(var(--text-body))",
              margin: 0,
              fontFamily: "var(--font-sans)",
            }}
          >
            <strong style={{ color: "hsl(var(--text-headline))" }}>
              Metodologia:
            </strong>{" "}
            Dados de declaração de bens do TSE (bem_candidato_{ano}.zip).
            Inclui todos os bens declarados por candidatos a deputado federal
            (CD_CARGO=6) e senador (CD_CARGO=5). Patrimônio = soma dos valores
            declarados em todos os itens. Valores nominais, sem correção
            inflacionária.
          </p>
        </div>
      </div>
    </>
  );
}
