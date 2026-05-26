import Link from "next/link";
import { getSancionados, getTotalSancionados } from "~/services/sancionados";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    q?: string;
    tipo?: string;
    status?: string;
    page?: string;
  }>;
}

const PER_PAGE = 50;

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function fmtData(s: string | null) {
  if (!s) return "—";
  const [ano, mes, dia] = s.split("-");
  return `${dia}/${mes}/${ano}`;
}

function fmtCpfCnpj(s: string) {
  if (s.length === 11) {
    return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (s.length === 14) {
    return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return s;
}

function buildUrl(base: Record<string, string | undefined>, override: Record<string, string | undefined>) {
  const merged = { ...base, ...override };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/sancionados${qs ? `?${qs}` : ""}`;
}

export function generateMetadata() {
  return {
    title: "Empresas e Pessoas Sancionadas — The BR Insider",
    description:
      "Consulte o cadastro CEIS e CNEP: empresas e pessoas físicas impedidas ou punidas de contratar com o governo federal.",
  };
}

export default async function SancionadosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const tipo = sp.tipo ?? "todos";
  const apenasAtivos = sp.status === "vigente";
  const page = Math.max(1, Number(sp.page ?? 1));

  const currentParams: Record<string, string | undefined> = {
    q: q || undefined,
    tipo: tipo !== "todos" ? tipo : undefined,
    status: apenasAtivos ? "vigente" : undefined,
  };

  const [{ data, total }, stats] = await Promise.all([
    getSancionados(page, PER_PAGE, { q, tipo, apenasAtivos }),
    getTotalSancionados(),
  ]);

  const totalPages = Math.ceil(total / PER_PAGE);

  const atualizadoEm = stats.atualizadoEm
    ? new Date(stats.atualizadoEm).toLocaleDateString("pt-BR")
    : null;

  return (
    <>
      {/* Cabeçalho */}
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
              Empresas e Pessoas Sancionadas
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
            CEIS + CNEP — Portal da Transparência ·{" "}
            {fmtN(stats.total)} registros · {fmtN(stats.ativos)} vigentes
            {atualizadoEm && ` · Atualizado em ${atualizadoEm}`}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>
        {/* Formulário de busca e filtros */}
        <form
          method="get"
          action="/sancionados"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            alignItems: "flex-end",
            marginBottom: "1.5rem",
          }}
        >
          {/* Campo de busca */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "1 1 240px" }}>
            <label
              htmlFor="q"
              style={{
                fontSize: "0.6875rem",
                color: "hsl(var(--text-caption))",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Buscar por nome ou CPF/CNPJ
            </label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={q}
              placeholder="Ex: 12345678000190 ou Empresa XYZ"
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontFamily: "var(--font-mono)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                backgroundColor: "hsl(var(--surface))",
                color: "hsl(var(--text-body))",
                outline: "none",
                width: "100%",
              }}
            />
          </div>

          {/* Filtro por tipo */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label
              htmlFor="tipo"
              style={{
                fontSize: "0.6875rem",
                color: "hsl(var(--text-caption))",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              defaultValue={tipo}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                backgroundColor: "hsl(var(--surface))",
                color: "hsl(var(--text-body))",
              }}
            >
              <option value="todos">Todos</option>
              <option value="ceis">CEIS</option>
              <option value="cnep">CNEP</option>
            </select>
          </div>

          {/* Filtro por status */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label
              htmlFor="status"
              style={{
                fontSize: "0.6875rem",
                color: "hsl(var(--text-caption))",
                fontFamily: "var(--font-sans)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={apenasAtivos ? "vigente" : "todos"}
              style={{
                padding: "0.5rem 0.75rem",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                backgroundColor: "hsl(var(--surface))",
                color: "hsl(var(--text-body))",
              }}
            >
              <option value="todos">Todos</option>
              <option value="vigente">Apenas vigentes</option>
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.875rem",
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              border: "none",
              borderRadius: "2px",
              cursor: "pointer",
            }}
          >
            Buscar
          </button>

          {(q || tipo !== "todos" || apenasAtivos) && (
            <Link
              href="/sancionados"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontFamily: "var(--font-sans)",
                color: "hsl(var(--text-caption))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                textDecoration: "none",
                backgroundColor: "hsl(var(--surface))",
              }}
            >
              Limpar
            </Link>
          )}
        </form>

        {/* Contador de resultados */}
        <p
          style={{
            fontSize: "0.8125rem",
            color: "hsl(var(--text-caption))",
            fontFamily: "var(--font-sans)",
            marginBottom: "0.75rem",
          }}
        >
          {fmtN(total)} resultado{total !== 1 ? "s" : ""}
          {q && ` para "${q}"`}
          {page > 1 && ` — página ${page} de ${totalPages}`}
        </p>

        {/* Tabela */}
        {data.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "hsl(var(--text-caption))",
              fontFamily: "var(--font-sans)",
              border: "1px solid hsl(var(--border))",
              borderRadius: "2px",
            }}
          >
            Nenhum registro encontrado.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table" style={{ width: "100%", fontSize: "0.8125rem" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", width: "22%" }}>Nome</th>
                  <th style={{ textAlign: "left", width: "14%" }}>CPF/CNPJ</th>
                  <th style={{ textAlign: "left", width: "6%" }}>Tipo</th>
                  <th style={{ textAlign: "left", width: "22%" }}>Sanção</th>
                  <th style={{ textAlign: "left", width: "9%" }}>Início</th>
                  <th style={{ textAlign: "left", width: "9%" }}>Fim</th>
                  <th style={{ textAlign: "left", width: "12%" }}>Órgão</th>
                  <th style={{ textAlign: "center", width: "6%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td
                      style={{
                        fontFamily: "var(--font-sans)",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={row.nome ?? "—"}
                    >
                      {row.nome ?? <span style={{ color: "hsl(var(--text-caption))" }}>—</span>}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {fmtCpfCnpj(row.cpf_cnpj)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.4rem",
                          borderRadius: "2px",
                          backgroundColor:
                            row.tipo_registro === "CEIS"
                              ? "hsl(var(--surface))"
                              : "hsl(var(--surface))",
                          border: "1px solid hsl(var(--border))",
                          color: "hsl(var(--text-body))",
                        }}
                      >
                        {row.tipo_registro}
                      </span>
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-sans)",
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "0.75rem",
                        color: "hsl(var(--text-body))",
                      }}
                      title={row.tipo_sancao ?? "—"}
                    >
                      {row.tipo_sancao ?? <span style={{ color: "hsl(var(--text-caption))" }}>—</span>}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {fmtData(row.data_inicio)}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "0.75rem",
                        whiteSpace: "nowrap",
                        color: !row.data_fim ? "hsl(var(--text-caption))" : "inherit",
                      }}
                    >
                      {row.data_fim ? fmtData(row.data_fim) : "Indeterminado"}
                    </td>
                    <td
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "0.75rem",
                        maxWidth: "120px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={
                        row.orgao_nome && row.orgao_uf
                          ? `${row.orgao_nome} (${row.orgao_uf})`
                          : row.orgao_nome ?? "—"
                      }
                    >
                      {row.orgao_uf ? (
                        <span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "0.6875rem",
                              fontWeight: 600,
                              marginRight: "0.25rem",
                              color: "hsl(var(--text-caption))",
                            }}
                          >
                            {row.orgao_uf}
                          </span>
                          {row.orgao_nome ?? "—"}
                        </span>
                      ) : (
                        row.orgao_nome ?? <span style={{ color: "hsl(var(--text-caption))" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span className={row.ativo ? "badge-danger" : "badge-neutral"}>
                        {row.ativo ? "Vigente" : "Encerrado"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "center",
              justifyContent: "center",
              marginTop: "2rem",
              flexWrap: "wrap",
            }}
          >
            {page > 1 && (
              <Link
                href={buildUrl(currentParams, { page: String(page - 1) })}
                style={{
                  padding: "0.375rem 0.875rem",
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  textDecoration: "none",
                  color: "hsl(var(--text-body))",
                  backgroundColor: "hsl(var(--surface))",
                }}
              >
                ← Anterior
              </Link>
            )}

            <span
              style={{
                fontSize: "0.8125rem",
                fontFamily: "var(--font-sans)",
                color: "hsl(var(--text-caption))",
                padding: "0.375rem 0.5rem",
              }}
            >
              {page} / {totalPages}
            </span>

            {page < totalPages && (
              <Link
                href={buildUrl(currentParams, { page: String(page + 1) })}
                style={{
                  padding: "0.375rem 0.875rem",
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-mono)",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  textDecoration: "none",
                  color: "hsl(var(--text-body))",
                  backgroundColor: "hsl(var(--surface))",
                }}
              >
                Próxima →
              </Link>
            )}
          </div>
        )}

        {/* Nota explicativa */}
        <div
          style={{
            marginTop: "3rem",
            padding: "1rem 1.25rem",
            borderLeft: "3px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--surface))",
          }}
        >
          <p
            style={{
              fontSize: "0.8125rem",
              color: "hsl(var(--text-caption))",
              fontFamily: "var(--font-sans)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            <strong>CEIS</strong> — Cadastro de Empresas Inidôneas e Suspensas: empresas e pessoas
            físicas impedidas de participar de licitações ou celebrar contratos com a administração
            pública federal.{" "}
            <strong>CNEP</strong> — Cadastro Nacional de Empresas Punidas: empresas punidas com base
            na Lei Anticorrupção (Lei 12.846/2013). Fonte: Portal da Transparência do Governo Federal.
          </p>
        </div>
      </div>
    </>
  );
}
