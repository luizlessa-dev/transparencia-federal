/**
 * Detalhe de verba indenizatória por deputado — ALEPE.
 * Rota: alepe.thebrinsider.com/ranking/<id_alepe>
 *
 * Diferenças vs ALESP (vantagens da ALEPE):
 *   - `data_emissao` disponível — ALEPE publica a data exata de cada nota
 *   - `cod_categoria` disponível — rubrica 1–15
 *   - `cnpj_cpf` garantido — API ALEPE sempre retorna CNPJ/CPF
 *   - id é INTEGER (id_alepe), não TEXT (matricula)
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAlepeDeputado, getAlEpeDespesasDeputado } from "~/services/assembleias";

export const dynamic = "force-dynamic";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Nota = {
  id: string;
  ano: number;
  mes: number;
  cod_categoria: string | null;
  categoria: string;
  fornecedor: string | null;
  cnpj_cpf: string;
  data_emissao: string | null;
  valor: number;
};

type Deputado = {
  id_alepe: number;
  nome: string;
  partido: string | null;
  ativo: boolean;
  legislatura: number | null;
};

// ── Metadata dinâmica ──────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) return { title: "Deputado — ALEPE" };

  const { data } = await getAlepeDeputado(id);

  const nome = data?.nome ?? "Deputado";
  const partido = data?.partido ?? "";
  const status = data?.ativo === false ? " (ex-deputado)" : "";
  return {
    title: `${nome} (${partido})${status} — Verba Indenizatória | ALEPE`,
    description: `Notas fiscais, fornecedores e evolução mensal da verba indenizatória de ${nome}, deputado(a) estadual de Pernambuco.`,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtBRL(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtNum(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

function fmtCNPJ(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return cnpj || "—";
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MES_ABREV = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

// ── Page ───────────────────────────────────────────────────────────────────

export default async function AlepeDeputadoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  // Info do deputado + notas em paralelo
  const [{ data: depData, error: depErr }, { data: notasData, error: notasErr }] =
    await Promise.all([
      getAlepeDeputado(String(idNum)),
      getAlEpeDespesasDeputado(String(idNum)),
    ]);

  if (depErr) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar deputado: {depErr.message}
        </p>
      </div>
    );
  }
  if (!depData) notFound();

  if (notasErr) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar notas: {notasErr.message}
        </p>
      </div>
    );
  }

  const notas = (notasData ?? []) as Nota[];

  const dep = depData as Deputado;

  // ── Agregações ─────────────────────────────────────────────────────────

  const totalReembolsado = notas.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const totalNotas = notas.length;

  // Por categoria
  const catMap = new Map<string, { total: number; notas: number }>();
  for (const r of notas) {
    const e = catMap.get(r.categoria) ?? { total: 0, notas: 0 };
    e.total += Number(r.valor) || 0;
    e.notas += 1;
    catMap.set(r.categoria, e);
  }
  const porCategoria = Array.from(catMap.entries())
    .map(([cat, v]) => ({ cat, ...v }))
    .sort((a, b) => b.total - a.total);

  // Por fornecedor
  const fornMap = new Map<string, { nome: string; total: number; notas: number }>();
  for (const r of notas) {
    if (!r.cnpj_cpf) continue;
    const key = r.cnpj_cpf;
    const e = fornMap.get(key) ?? { nome: r.fornecedor ?? "", total: 0, notas: 0 };
    if (r.fornecedor && !e.nome) e.nome = r.fornecedor;
    e.total += Number(r.valor) || 0;
    e.notas += 1;
    fornMap.set(key, e);
  }
  const topFornecedores = Array.from(fornMap.entries())
    .map(([cnpj, v]) => ({ cnpj, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);
  const qtdFornecedores = fornMap.size;

  // Por mês — últimos 36
  const mesMap = new Map<string, { ano: number; mes: number; total: number; notas: number }>();
  for (const r of notas) {
    const key = `${r.ano}-${String(r.mes).padStart(2, "0")}`;
    const e = mesMap.get(key) ?? { ano: r.ano, mes: r.mes, total: 0, notas: 0 };
    e.total += Number(r.valor) || 0;
    e.notas += 1;
    mesMap.set(key, e);
  }
  const porMes = Array.from(mesMap.values())
    .sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes))
    .slice(-36);
  const maxMesTotal = Math.max(...porMes.map((m) => m.total), 1);

  const periodoCobertura = (() => {
    if (notas.length === 0) return "—";
    const sorted = [...notas].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return `${MES_ABREV[first.mes - 1]}/${first.ano} – ${MES_ABREV[last.mes - 1]}/${last.ano}`;
  })();

  return (
    <>
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "960px" }}>
          {/* Breadcrumb */}
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Link href="/" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              ALEPE
            </Link>
            <span>/</span>
            <Link href="/ranking" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Ranking
            </Link>
            <span>/</span>
            <span>{dep.nome}</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
              {dep.nome}
            </h1>
            {dep.partido && (
              <span className="badge-neutral" style={{ fontSize: "0.75rem" }}>
                {dep.partido}
              </span>
            )}
            {!dep.ativo && (
              <span className="badge-warn" style={{ fontSize: "0.75rem" }}>
                ex-deputado
              </span>
            )}
          </div>

          <p
            style={{
              fontSize: "0.8125rem",
              color: "hsl(var(--text-caption))",
              margin: "0.375rem 0 0",
            }}
          >
            ID ALEPE {dep.id_alepe} · Verba indenizatória · {periodoCobertura}
            {dep.legislatura && ` · ${dep.legislatura}ª legislatura`}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "960px" }}>

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total reembolsado" value={fmtBRL(totalReembolsado)} />
          <Kpi label="Notas fiscais" value={fmtNum(totalNotas)} />
          <Kpi label="Fornecedores" value={fmtNum(qtdFornecedores)} />
          <Kpi label="Categorias" value={String(porCategoria.length)} />
        </div>

        {notas.length === 0 ? (
          <div className="bloomberg-card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "hsl(var(--text-caption))", margin: 0 }}>
              Sem notas de verba indenizatória registradas para este deputado.
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              {/* ── Por categoria ────────────────────────────────────────────── */}
              <div className="bloomberg-card">
                <h3 style={sectionTitle}>Por categoria</h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Notas</th>
                      <th style={{ textAlign: "right" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoria.map(({ cat, total, notas: n }) => (
                      <tr key={cat}>
                        <td style={{ fontSize: "0.8125rem" }}>{cat}</td>
                        <td
                          style={{
                            textAlign: "right",
                            fontVariantNumeric: "tabular-nums",
                            fontWeight: 600,
                          }}
                        >
                          {fmtBRL(total)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "hsl(var(--text-caption))",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {n}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "hsl(var(--text-caption))",
                            fontSize: "0.75rem",
                          }}
                        >
                          {totalReembolsado > 0
                            ? ((total / totalReembolsado) * 100).toFixed(1)
                            : "0"}
                          %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Evolução mensal (últimos 36 meses) ──────────────────────── */}
              <div className="bloomberg-card">
                <h3 style={sectionTitle}>
                  Evolução mensal{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    (últimos 36 meses)
                  </span>
                </h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Notas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {porMes.map(({ ano, mes, total, notas: n }) => {
                      const pct = maxMesTotal > 0 ? (total / maxMesTotal) * 100 : 0;
                      return (
                        <tr key={`${ano}-${mes}`}>
                          <td
                            style={{
                              fontSize: "0.8125rem",
                              color: "hsl(var(--text-caption))",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            {MES_ABREV[mes - 1]}/{String(ano).slice(2)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 600,
                              fontSize: "0.8125rem",
                            }}
                          >
                            {fmtBRL(total)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              color: "hsl(var(--text-caption))",
                              fontSize: "0.75rem",
                            }}
                          >
                            {n}
                          </td>
                          <td style={{ width: "4rem", paddingLeft: "0.5rem" }}>
                            <div
                              style={{
                                height: "4px",
                                borderRadius: "2px",
                                backgroundColor: "hsl(var(--border))",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct.toFixed(1)}%`,
                                  height: "100%",
                                  borderRadius: "2px",
                                  backgroundColor: "hsl(var(--primary))",
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Top fornecedores ──────────────────────────────────────────── */}
            {topFornecedores.length > 0 && (
              <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
                <h3 style={sectionTitle}>
                  Top fornecedores{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    (por total reembolsado · histórico completo)
                  </span>
                </h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Fornecedor</th>
                      <th>CNPJ/CPF</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFornecedores.map(({ cnpj, nome, total, notas: n }, idx) => (
                      <tr key={cnpj}>
                        <td
                          style={{
                            color: "hsl(var(--text-caption))",
                            fontSize: "0.75rem",
                            textAlign: "center",
                          }}
                        >
                          {idx + 1}
                        </td>
                        <td style={{ fontSize: "0.8125rem" }}>{nome || "—"}</td>
                        <td
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                            color: "hsl(var(--text-caption))",
                          }}
                        >
                          {fmtCNPJ(cnpj)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {fmtBRL(total)}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            color: "hsl(var(--text-caption))",
                            fontSize: "0.8125rem",
                          }}
                        >
                          {n}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Notas fiscais ─────────────────────────────────────────────── */}
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
                <h3 style={{ ...sectionTitle, margin: 0 }}>
                  Notas fiscais{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    ({fmtNum(totalNotas)} registros · ordenado por data desc)
                  </span>
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table
                  className="bloomberg-table"
                  style={{ width: "100%", minWidth: "720px" }}
                >
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Fornecedor</th>
                      <th>CNPJ/CPF</th>
                      <th>Categoria</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notas.slice(0, 1000).map((r) => (
                      <tr key={r.id}>
                        <td
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                            color: "hsl(var(--text-caption))",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.data_emissao ? fmtData(r.data_emissao) : `${MES_ABREV[r.mes - 1]}/${r.ano}`}
                        </td>
                        <td
                          style={{
                            fontSize: "0.8125rem",
                            maxWidth: "180px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.fornecedor || "—"}
                        </td>
                        <td
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                            color: "hsl(var(--text-caption))",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.cnpj_cpf ? fmtCNPJ(r.cnpj_cpf) : "—"}
                        </td>
                        <td
                          style={{
                            fontSize: "0.75rem",
                            color: "hsl(var(--text-body))",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.cod_categoria ? `${r.cod_categoria} · ${r.categoria}` : r.categoria}
                        </td>
                        <td
                          style={{
                            textAlign: "right",
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {fmtBRL(r.valor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {notas.length > 1000 && (
                  <div
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderTop: "1px solid hsl(var(--border))",
                      fontSize: "0.75rem",
                      color: "hsl(var(--text-caption))",
                      textAlign: "center",
                    }}
                  >
                    Exibindo as 1.000 notas mais recentes de {fmtNum(notas.length)}. Os totais e
                    rankings acima consideram todas as notas.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1rem",
            lineHeight: 1.6,
          }}
        >
          Fonte: ALEPE — API PHP de transparência (verbaindenizatorianotas.php). Data exata e CNPJ
          disponíveis diretamente na API. Valores em R$ nominais. CNPJ formatado a partir do dado
          bruto.
        </p>
      </div>
    </>
  );
}

// ── Primitivas ─────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "hsl(var(--text-caption))",
  margin: "0 0 0.875rem 0",
};

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
    </div>
  );
}
