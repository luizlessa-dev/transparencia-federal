import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCeapsSenador,
  getCeapsSenadorHistorico,
  getCeapsSenadoNotas,
  ANOS_CEAPS_SENADO,
  type CeapsSenadoNota,
} from "~/services/ceaps-senado";
import { NotasSenadoTable } from "./NotasSenadoTable";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ano?: string; categoria?: string }>;
}

function fmtBRL(v: number | null | undefined) {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function fmtCNPJ(cnpj: string | null): string {
  if (!cnpj) return "—";
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return cnpj;
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const sectionTitle: React.CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "hsl(var(--text-caption))",
  margin: "0 0 0.875rem 0",
};

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
      {sub && <div className="bloomberg-kpi-sub">{sub}</div>}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const senadorNorm = decodeURIComponent(id);
  return {
    title: `${senadorNorm} — CEAPS Senado — The BR Insider`,
    description: `Notas fiscais, fornecedores e categorias da Cota para Exercício da Atividade Parlamentar dos Senadores (CEAPS) de ${senadorNorm}.`,
  };
}

export default async function SenateExpensesSenadorPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const senadorNorm = decodeURIComponent(id);
  const anoFiltro = ANOS_CEAPS_SENADO.includes(Number(sp.ano)) ? Number(sp.ano) : undefined;
  const catFiltro = sp.categoria ? sp.categoria : undefined;

  // Histórico do ranking + agregado do ano atual (se filtrado) + notas detalhadas
  const [historico, todasNotas, senadorRanking] = await Promise.all([
    getCeapsSenadorHistorico(senadorNorm),
    getCeapsSenadoNotas(senadorNorm, 3000).catch(() => [] as CeapsSenadoNota[]),
    anoFiltro ? getCeapsSenador(senadorNorm, anoFiltro) : null,
  ]);

  if (todasNotas.length === 0 && historico.length === 0) notFound();

  const nomeExibido = todasNotas[0]?.senador ?? historico[0]?.senador ?? senadorNorm;

  // Aplica filtros
  const notas = todasNotas.filter((n) => {
    if (anoFiltro && n.ano !== anoFiltro) return false;
    if (catFiltro && n.tipo_despesa !== catFiltro) return false;
    return true;
  });

  // ── Agregações ────────────────────────────────────────────────
  const totalReembolsado = notas.reduce((s, n) => s + (Number(n.valor_reembolsado) || 0), 0);
  const totalNotas = notas.length;

  // Por categoria
  const catMap = new Map<string, { total: number; qtd: number }>();
  for (const n of notas) {
    const k = n.tipo_despesa || "Sem categoria";
    const cur = catMap.get(k) ?? { total: 0, qtd: 0 };
    cur.total += Number(n.valor_reembolsado) || 0;
    cur.qtd++;
    catMap.set(k, cur);
  }
  const porCategoria = Array.from(catMap.entries())
    .map(([cat, v]) => ({ cat, ...v }))
    .sort((a, b) => b.total - a.total);

  // Por fornecedor (top 20)
  const fornMap = new Map<string, { nome: string; total: number; qtd: number }>();
  for (const n of notas) {
    if (!n.cnpj_cpf) continue;
    const key = n.cnpj_cpf;
    const cur = fornMap.get(key) ?? { nome: n.fornecedor ?? "", total: 0, qtd: 0 };
    if (n.fornecedor && !cur.nome) cur.nome = n.fornecedor;
    cur.total += Number(n.valor_reembolsado) || 0;
    cur.qtd++;
    fornMap.set(key, cur);
  }
  const topFornecedores = Array.from(fornMap.entries())
    .map(([cnpj, v]) => ({ cnpj, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // Por mês
  const mesMap = new Map<string, { ano: number; mes: number; total: number; qtd: number }>();
  for (const n of notas) {
    if (!n.mes) continue;
    const key = `${n.ano}-${String(n.mes).padStart(2, "0")}`;
    const cur = mesMap.get(key) ?? { ano: n.ano, mes: n.mes, total: 0, qtd: 0 };
    cur.total += Number(n.valor_reembolsado) || 0;
    cur.qtd++;
    mesMap.set(key, cur);
  }
  const porMes = Array.from(mesMap.values()).sort(
    (a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes)
  );
  const maxMesTotal = Math.max(...porMes.map((m) => m.total), 1);

  const anosDisp = Array.from(new Set(todasNotas.map((n) => n.ano))).sort((a, b) => b - a);
  const qtdFornecedores = fornMap.size;
  const qtdCategorias = catMap.size;

  function buildUrl(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (sp.ano) params.set("ano", sp.ano);
    if (sp.categoria) params.set("categoria", sp.categoria);
    for (const [k, v] of Object.entries(overrides)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return `/senate-expenses/${id}${s ? "?" + s : ""}`;
  }

  const chipStyle = (active: boolean) => ({
    fontSize: "0.75rem",
    padding: "0.25rem 0.625rem",
    borderRadius: "2px",
    textDecoration: "none" as const,
    fontFamily: "var(--font-sans)",
    backgroundColor: active ? "hsl(var(--primary))" : "hsl(var(--surface))",
    color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
    border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
    fontWeight: active ? 700 : 500,
  });

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1080px" }}>
          <p
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              fontFamily: "var(--font-sans)",
            }}
          >
            <Link href="/senate-expenses" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              CEAPS Senado
            </Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span>{nomeExibido}</span>
          </p>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>{nomeExibido}</h1>
            <span className="badge-neutral" style={{ fontSize: "0.75rem" }}>
              Senador(a)
            </span>
            {anoFiltro && senadorRanking?.posicao != null && (
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                #{senadorRanking.posicao} em {anoFiltro}
              </span>
            )}
          </div>

          <p
            style={{
              fontSize: "0.8125rem",
              color: "hsl(var(--text-caption))",
              margin: "0.375rem 0 0",
              fontFamily: "var(--font-sans)",
            }}
          >
            Senado Federal · Cota para Exercício da Atividade Parlamentar dos Senadores (CEAPS)
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1080px" }}>
        {/* Filtros */}
        {anosDisp.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
              Ano:
            </span>
            <Link href={buildUrl({ ano: undefined })} style={chipStyle(!anoFiltro)}>
              Todos
            </Link>
            {anosDisp.map((a) => (
              <Link key={a} href={buildUrl({ ano: String(a) })} style={chipStyle(anoFiltro === a)}>
                {a}
              </Link>
            ))}
          </div>
        )}
        {catFiltro && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
              Categoria:
            </span>
            <Link href={buildUrl({ categoria: undefined })} style={chipStyle(true)}>
              ✕ {catFiltro}
            </Link>
          </div>
        )}

        {/* KPIs */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi
            label="Total reembolsado"
            value={fmtBRL(totalReembolsado)}
            sub={anoFiltro ? `ano ${anoFiltro}` : "todos os anos"}
          />
          <Kpi
            label="Notas fiscais"
            value={fmtN(totalNotas)}
            sub={anoFiltro ? `média ${fmtBRL(totalReembolsado / 12)}/mês` : `de ${anosDisp.length} anos`}
          />
          <Kpi label="Fornecedores" value={fmtN(qtdFornecedores)} sub="CNPJ/CPF únicos" />
          <Kpi label="Categorias" value={String(qtdCategorias)} sub="tipos de despesa" />
        </div>

        {totalNotas === 0 ? (
          <div
            style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              border: "1px dashed hsl(var(--border))",
              borderRadius: "2px",
              color: "hsl(var(--text-caption))",
            }}
          >
            <p style={{ fontSize: "0.9375rem" }}>
              {anoFiltro || catFiltro
                ? "Nenhuma nota encontrada para os filtros selecionados."
                : "Sem notas fiscais registradas para este senador."}
            </p>
            {(anoFiltro || catFiltro) && (
              <Link href={`/senate-expenses/${id}`} style={{ fontSize: "0.875rem", color: "hsl(var(--primary))", marginTop: "0.75rem", display: "inline-block" }}>
                Limpar filtros
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Por categoria + Por mês */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
                marginBottom: "1.25rem",
              }}
            >
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
                    {porCategoria.slice(0, 10).map(({ cat, total, qtd }) => (
                      <tr key={cat}>
                        <td style={{ fontSize: "0.75rem", maxWidth: "240px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={cat}>
                          <Link
                            href={buildUrl({ categoria: catFiltro === cat ? undefined : cat })}
                            style={{
                              color: catFiltro === cat ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                              textDecoration: "none",
                              fontWeight: catFiltro === cat ? 700 : 400,
                            }}
                          >
                            {cat}
                          </Link>
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.8125rem" }}>
                          {fmtBRL(total)}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                          {qtd}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                          {totalReembolsado > 0 ? ((total / totalReembolsado) * 100).toFixed(1) : "0"}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bloomberg-card">
                <h3 style={sectionTitle}>Evolução mensal</h3>
                {porMes.length === 0 ? (
                  <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>Sem datas registradas.</p>
                ) : (
                  <table className="bloomberg-table" style={{ width: "100%" }}>
                    <thead>
                      <tr>
                        <th>Mês</th>
                        <th style={{ textAlign: "right" }}>Total</th>
                        <th style={{ textAlign: "right" }}>Notas</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {porMes.slice(-12).map(({ ano, mes, total, qtd }) => {
                        const pct = maxMesTotal > 0 ? (total / maxMesTotal) * 100 : 0;
                        return (
                          <tr key={`${ano}-${mes}`}>
                            <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                              {MES_ABREV[mes - 1]}/{String(ano).slice(2)}
                            </td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.8125rem" }}>
                              {fmtBRL(total)}
                            </td>
                            <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                              {qtd}
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
                )}
              </div>
            </div>

            {/* Top fornecedores */}
            {topFornecedores.length > 0 && (
              <div className="bloomberg-card" style={{ marginBottom: "1.25rem" }}>
                <h3 style={sectionTitle}>
                  Top fornecedores{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    (por total reembolsado)
                  </span>
                </h3>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                      <th>Fornecedor</th>
                      <th>CNPJ/CPF</th>
                      <th style={{ textAlign: "right" }}>Total</th>
                      <th style={{ textAlign: "right" }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFornecedores.map(({ cnpj, nome, total, qtd }, idx) => (
                      <tr key={cnpj}>
                        <td style={{ color: "hsl(var(--text-caption))", fontSize: "0.75rem", textAlign: "center" }}>
                          {idx + 1}
                        </td>
                        <td style={{ fontSize: "0.8125rem" }}>{nome || "—"}</td>
                        <td style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
                          {fmtCNPJ(cnpj)}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}>
                          {fmtBRL(total)}
                        </td>
                        <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.8125rem" }}>
                          {qtd}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabela detalhada de notas (expansíveis) */}
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
                <h3 style={{ ...sectionTitle, margin: 0 }}>
                  Notas fiscais{" "}
                  <span style={{ fontWeight: 400, color: "hsl(var(--text-caption))" }}>
                    ({fmtN(totalNotas)} registros · clique em uma linha pra abrir o detalhe)
                  </span>
                </h3>
              </div>
              <NotasSenadoTable notas={notas} limit={500} />
              {totalNotas > 500 && (
                <p
                  style={{
                    padding: "0.75rem 1.25rem",
                    fontSize: "0.75rem",
                    color: "hsl(var(--text-caption))",
                    borderTop: "1px solid hsl(var(--border))",
                    textAlign: "center",
                  }}
                >
                  Exibindo 500 de {fmtN(totalNotas)} notas. Use os filtros de ano/categoria para refinar.
                </p>
              )}
            </div>
          </>
        )}

        {/* Histórico anual de posição/total */}
        {historico.length > 0 && (
          <div className="bloomberg-card" style={{ marginTop: "1.25rem" }}>
            <h3 style={sectionTitle}>Histórico anual</h3>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Ano</th>
                  <th style={{ textAlign: "right" }}>Posição</th>
                  <th style={{ textAlign: "right" }}>Total reembolsado</th>
                  <th style={{ textAlign: "right" }}>Documentos</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((h) => {
                  const isActive = anoFiltro === h.ano;
                  return (
                    <tr key={h.ano} style={isActive ? { background: "hsl(var(--surface))" } : undefined}>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                        <Link
                          href={buildUrl({ ano: isActive ? undefined : String(h.ano) })}
                          style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--text-body))", fontWeight: isActive ? 700 : 500, textDecoration: "none" }}
                        >
                          {h.ano}
                        </Link>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        #{h.posicao ?? "—"}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.8125rem" }}>
                        {fmtBRL(h.total_reembolsado)}
                      </td>
                      <td style={{ textAlign: "right", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                        {fmtN(h.total_documentos)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          Fonte: Senado Federal — Portal da Transparência (CSV anual da CEAPS).
          Notas referem-se a despesas reembolsadas pela Cota para Exercício da
          Atividade Parlamentar dos Senadores. Limite mensal: R$ 45.612.
          Valores em R$ nominais.
        </p>
      </div>
    </>
  );
}
