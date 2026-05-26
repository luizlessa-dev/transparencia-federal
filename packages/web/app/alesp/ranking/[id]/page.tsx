/**
 * Detalhe de despesas de gabinete por deputado — ALESP.
 * Rota: alesp.thebrinsider.com/ranking/<matricula>
 *
 * Diferenças vs ALMG:
 *   - matricula (TEXT) em vez de id_almg (INT)
 *   - sem coluna `data_emissao` (ALESP não publica)
 *   - sem coluna `num_documento` (idem)
 *   - sem distinção `valor_bruto` × `valor_reembolso` — só `valor`
 *   - inclui deputados "fantasma" (legislaturas anteriores) marcados como ativo=false
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

// ── Tipos ──────────────────────────────────────────────────────────────────

type Despesa = {
  id: string;
  ano: number;
  mes: number;
  categoria: string;
  cod_categoria: string | null;
  fornecedor: string | null;
  cnpj_cpf: string;
  valor: number;
};

type Deputado = {
  matricula: string;
  nome: string;
  partido: string | null;
  tag_localizacao: string | null;
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
  const sb = getSupabase();
  const { data } = await sb
    .from("alesp_deputados")
    .select("nome,partido,ativo")
    .eq("matricula", id)
    .maybeSingle();

  const nome = data?.nome ?? "Deputado";
  const partido = data?.partido ?? "";
  const status = data?.ativo === false ? " (ex-deputado)" : "";
  return {
    title: `${nome} (${partido})${status} — Despesas de Gabinete | ALESP`,
    description: `Despesas, fornecedores e evolução mensal das despesas de gabinete de ${nome}, deputado(a) estadual de SP.`,
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

const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DeputadoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matricula = decodeURIComponent(id).trim();
  if (!matricula) notFound();

  const sb = getSupabase();

  // Info do deputado — paralelo com paginação das despesas
  const [{ data: depData, error: depErr }] = await Promise.all([
    sb
      .from("alesp_deputados")
      .select("matricula,nome,partido,tag_localizacao,ativo,legislatura")
      .eq("matricula", matricula)
      .maybeSingle(),
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

  // Busca paginada das despesas (deputados de longa data podem ter milhares)
  const rows: Despesa[] = [];
  const pageSize = 1000;
  let offset = 0;
  let despErr: string | null = null;

  for (;;) {
    const { data, error } = await sb
      .from("alesp_despesas_gabinete")
      .select("id,ano,mes,categoria,cod_categoria,fornecedor,cnpj_cpf,valor")
      .eq("matricula", matricula)
      .order("ano", { ascending: false })
      .order("mes", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (error) {
      despErr = error.message;
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as Despesa[]));
    if (data.length < pageSize) break;
    offset += pageSize;
  }

  if (despErr) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar despesas: {despErr}
        </p>
      </div>
    );
  }

  const dep = depData as Deputado;

  // ── Agregações ─────────────────────────────────────────────────────────

  const totalGasto = rows.reduce((s, r) => s + (Number(r.valor) || 0), 0);
  const totalDespesas = rows.length;

  // Por categoria
  const catMap = new Map<string, { total: number; despesas: number }>();
  for (const r of rows) {
    const e = catMap.get(r.categoria) ?? { total: 0, despesas: 0 };
    e.total += Number(r.valor) || 0;
    e.despesas += 1;
    catMap.set(r.categoria, e);
  }
  const porCategoria = Array.from(catMap.entries())
    .map(([cat, v]) => ({ cat, ...v }))
    .sort((a, b) => b.total - a.total);

  // Por fornecedor (cnpj não vazio)
  const fornMap = new Map<string, { nome: string; total: number; despesas: number }>();
  for (const r of rows) {
    if (!r.cnpj_cpf) continue;
    const key = r.cnpj_cpf;
    const e = fornMap.get(key) ?? { nome: r.fornecedor ?? "", total: 0, despesas: 0 };
    if (r.fornecedor && !e.nome) e.nome = r.fornecedor;
    e.total += Number(r.valor) || 0;
    e.despesas += 1;
    fornMap.set(key, e);
  }
  const topFornecedores = Array.from(fornMap.entries())
    .map(([cnpj, v]) => ({ cnpj, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  const qtdFornecedores = fornMap.size;

  // Por mês — só os últimos 36 meses pra não estourar a tabela
  const mesMap = new Map<string, { ano: number; mes: number; total: number; despesas: number }>();
  for (const r of rows) {
    const key = `${r.ano}-${String(r.mes).padStart(2, "0")}`;
    const e = mesMap.get(key) ?? { ano: r.ano, mes: r.mes, total: 0, despesas: 0 };
    e.total += Number(r.valor) || 0;
    e.despesas += 1;
    mesMap.set(key, e);
  }
  const porMes = Array.from(mesMap.values())
    .sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes))
    .slice(-36);

  const maxMesTotal = Math.max(...porMes.map((m) => m.total), 1);

  const periodoCobertura = (() => {
    if (rows.length === 0) return "—";
    const ordenados = [...rows].sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];
    return `${MES_ABREV[primeiro.mes - 1]}/${primeiro.ano} – ${MES_ABREV[ultimo.mes - 1]}/${ultimo.ano}`;
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
              ALESP
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

          {dep.tag_localizacao && (
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0.375rem 0 0" }}>
              {dep.tag_localizacao}
            </p>
          )}
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0.25rem 0 0" }}>
            Matrícula {dep.matricula} · Despesas de gabinete · {periodoCobertura}
            {dep.legislatura && ` · ${dep.legislatura}ª legislatura`}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "960px" }}>

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total gasto" value={fmtBRL(totalGasto)} />
          <Kpi label="Despesas" value={fmtNum(totalDespesas)} />
          <Kpi label="Fornecedores" value={fmtNum(qtdFornecedores)} />
          <Kpi label="Categorias" value={String(porCategoria.length)} />
        </div>

        {rows.length === 0 ? (
          <div className="bloomberg-card" style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ color: "hsl(var(--text-caption))", margin: 0 }}>
              Sem despesas de gabinete registradas pra este deputado.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem", marginBottom: "1.25rem" }}>

              {/* ── Por categoria ────────────────────────────────────────────── */}
              <div className="bloomberg-card">
                <h3 style={sectionTitle}>Por categoria</h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Categoria</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Despesas</th>
                      <th style={{ textAlign: "right" }}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoria.map(({ cat, total, despesas }) => (
                      <tr key={cat}>
                        <td style={{ fontSize: "0.8125rem" }}>{cat}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                          {fmtBRL(total)}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.8125rem" }}>
                          {despesas}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                          {totalGasto > 0 ? ((total / totalGasto) * 100).toFixed(1) : "0"}%
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
                      <th style={{ textAlign: "right" }}>Despesas</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {porMes.map(({ ano, mes, total, despesas }) => {
                      const pct = maxMesTotal > 0 ? (total / maxMesTotal) * 100 : 0;
                      return (
                        <tr key={`${ano}-${mes}`}>
                          <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                            {MES_ABREV[mes - 1]}/{String(ano).slice(2)}
                          </td>
                          <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.8125rem" }}>
                            {fmtBRL(total)}
                          </td>
                          <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                            {despesas}
                          </td>
                          <td style={{ width: "4rem", paddingLeft: "0.5rem" }}>
                            <div style={{ height: "4px", borderRadius: "2px", backgroundColor: "hsl(var(--border))" }}>
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
                      <th style={{ textAlign: "right" }}>Despesas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFornecedores.map(({ cnpj, nome, total, despesas }, idx) => (
                      <tr key={cnpj}>
                        <td style={{ color: "hsl(var(--text-caption))", fontSize: "0.75rem", textAlign: "center" }}>
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
                        <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmtBRL(total)}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.8125rem" }}>
                          {despesas}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Despesas ─────────────────────────────────────────────── */}
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
                <h3 style={{ ...sectionTitle, margin: 0 }}>
                  Despesas{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    ({fmtNum(totalDespesas)} registros · ordenado por mês descendente)
                  </span>
                </h3>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ width: "100%", minWidth: "720px" }}>
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th>Fornecedor</th>
                      <th>CNPJ/CPF</th>
                      <th>Categoria</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 1000).map((r) => (
                      <tr key={r.id}>
                        <td
                          style={{
                            fontSize: "0.75rem",
                            fontFamily: "var(--font-mono)",
                            color: "hsl(var(--text-caption))",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {MES_ABREV[r.mes - 1]}/{String(r.ano).slice(2)}
                        </td>
                        <td style={{ fontSize: "0.8125rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                        <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                {rows.length > 1000 && (
                  <div
                    style={{
                      padding: "0.75rem 1.25rem",
                      borderTop: "1px solid hsl(var(--border))",
                      fontSize: "0.75rem",
                      color: "hsl(var(--text-caption))",
                      textAlign: "center",
                    }}
                  >
                    Exibindo as 1.000 despesas mais recentes de {fmtNum(rows.length)}. Os totais e
                    rankings acima consideram todas as despesas.
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
          Fonte: ALESP — Portal de Dados Abertos (despesas_gabinetes.xml). Granularidade: mês × CNPJ
          (a ALESP não publica data exata nem número de documento fiscal). CNPJ formatado a partir
          do dado bruto. Valores em R$ nominais.
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
