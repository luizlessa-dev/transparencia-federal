"use client";

/**
 * Caixa de pesquisa em linguagem natural.
 * Backend: /api/ask (proxy server-side) → edge function ask/ no Supabase.
 *
 * Estilo segue o padrão da home: inline styles + CSS variables (hsl(var(--primary)) etc.).
 *
 * URL compartilhável:
 *   - Aceita ?q=pergunta na URL e roda automaticamente ao carregar.
 *   - Botão "Compartilhar" copia URL do tipo /?q=pergunta-codificada.
 *   - Como o cache do backend é por hash da pergunta normalizada, perguntas
 *     iguais via link viral retornam instantaneamente.
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface AskResponse {
  ok: boolean;
  pergunta?: string;
  resposta?: string;
  resultado?: Record<string, unknown>[];
  sql?: string;
  cache_hit?: boolean;
  latencia_ms?: number;
  erro?: string;
}

interface CategoriaSugestao {
  titulo: string;
  perguntas: string[];
}

const CATEGORIAS: CategoriaSugestao[] = [
  {
    titulo: "Gastos parlamentares",
    perguntas: [
      "Qual deputado mais gastou em passagens aéreas?",
      "Top 10 deputados que mais gastaram com combustível",
      "Qual partido gastou mais com divulgação parlamentar em 2024?",
      "Quem mais gastou com locação de veículos automotores?",
    ],
  },
  {
    titulo: "Emendas e orçamento secreto",
    perguntas: [
      "Quais empresas que receberam emendas de relator estão sancionadas?",
      "Qual estado mais recebeu emendas Pix?",
      "Top 10 beneficiários de emendas RP-9 por valor pago",
      "Qual órgão executor recebeu mais emendas de relator?",
      "Quanto foi pago via Restos a Pagar de emendas em 2024?",
    ],
  },
  {
    titulo: "Doações eleitorais",
    perguntas: [
      "Quem doou pra campanha de Lucas Gonzalez em 2022?",
      "Top 10 maiores doadores de campanha em 2022",
      "Quais doadores de campanha aparecem na lista CEIS?",
      "Quanto Salim Mattar doou em campanhas eleitorais?",
    ],
  },
  {
    titulo: "Patrimônio e perfil",
    perguntas: [
      "Quem é o parlamentar com maior patrimônio declarado?",
      "Quais deputados declararam aeronave no patrimônio?",
      "Top 10 deputados com maior score de risco G5",
      "Quanto patrimônio Ciro Nogueira declarou em 2018?",
    ],
  },
  {
    titulo: "Sancionados e contratos",
    perguntas: [
      "Quantas empresas sancionadas tem contrato federal?",
      "Top 10 empresas em contratos federais por valor",
      "Quais empresas sancionadas pela Codevasf têm contrato federal?",
      "Quantos contratos a XCMG Brasil tem com o governo?",
    ],
  },
];

// 5 sugestões em destaque (uma por categoria) usadas como bloco inicial
const SUGESTOES = [
  "Qual deputado mais gastou em passagens aéreas?",
  "Quais empresas que receberam emendas de relator estão sancionadas?",
  "Quem doou pra campanha de Lucas Gonzalez em 2022?",
  "Quem é o parlamentar com maior patrimônio declarado?",
  "Quais empresas sancionadas têm contrato federal?",
];

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000) return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
    return String(v);
  }
  return String(v);
}

function fmtNum(v: number): string {
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1) + "bi";
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + "mi";
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + "k";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

/**
 * Decide se o resultado é "graficável": tem 2-15 linhas, 1+ coluna texto pra label e
 * 1+ coluna numérica com valores > 0. Retorna {labelCol, valueCol} ou null.
 */
function detectChartFields(rows: Record<string, unknown>[]): { labelCol: string; valueCol: string } | null {
  if (!rows || rows.length < 2 || rows.length > 15) return null;
  const cols = Object.keys(rows[0] ?? {});
  if (cols.length < 2) return null;

  // procura a ÚLTIMA coluna numérica como valor (geralmente é o agregado: sum, count, total)
  let valueCol: string | null = null;
  for (let i = cols.length - 1; i >= 0; i--) {
    const c = cols[i];
    const nums = rows.map((r) => Number(r[c])).filter((n) => Number.isFinite(n) && n !== 0);
    if (nums.length >= Math.ceil(rows.length * 0.6)) {
      valueCol = c;
      break;
    }
  }
  if (!valueCol) return null;

  // procura a PRIMEIRA coluna não-numérica como label (geralmente é nome/UF/partido)
  let labelCol: string | null = null;
  for (const c of cols) {
    if (c === valueCol) continue;
    const isText = rows.some((r) => {
      const v = r[c];
      return typeof v === "string" && v.length > 0;
    });
    if (isText) {
      labelCol = c;
      break;
    }
  }
  if (!labelCol) return null;

  return { labelCol, valueCol };
}

interface BarChartProps {
  rows: Record<string, unknown>[];
  labelCol: string;
  valueCol: string;
}

function BarChart({ rows, labelCol, valueCol }: BarChartProps) {
  const data = rows.map((r) => ({
    label: String(r[labelCol] ?? ""),
    value: Number(r[valueCol]) || 0,
  }));
  const max = Math.max(...data.map((d) => d.value), 1);
  // Limita label a 35 chars
  const maxLabelLen = Math.max(...data.map((d) => d.label.length));
  const labelWidth = Math.min(220, Math.max(80, maxLabelLen * 6));
  const rowHeight = 22;
  const padding = { top: 8, right: 60, bottom: 8, left: labelWidth + 8 };
  const chartHeight = data.length * rowHeight + padding.top + padding.bottom;
  const chartWidth = 600;
  const barAreaWidth = chartWidth - padding.left - padding.right;

  return (
    <div style={{ overflowX: "auto", padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border))" }}>
      <svg
        width="100%"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        style={{ display: "block", minWidth: 320 }}
        role="img"
        aria-label={`Gráfico comparativo de ${labelCol} por ${valueCol}`}
      >
        {data.map((d, i) => {
          const y = padding.top + i * rowHeight;
          const w = (d.value / max) * barAreaWidth;
          return (
            <g key={i}>
              <text
                x={padding.left - 6}
                y={y + rowHeight / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize="11"
                fill="hsl(var(--foreground))"
              >
                {d.label.length > 38 ? d.label.slice(0, 35) + "..." : d.label}
              </text>
              <rect
                x={padding.left}
                y={y + 3}
                width={Math.max(2, w)}
                height={rowHeight - 6}
                fill="hsl(var(--primary))"
                opacity={0.85}
              />
              <text
                x={padding.left + w + 4}
                y={y + rowHeight / 2}
                textAnchor="start"
                dominantBaseline="central"
                fontSize="11"
                fontWeight="600"
                fill="hsl(var(--foreground))"
              >
                {fmtNum(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
      <p
        style={{
          fontSize: "0.6875rem",
          textAlign: "center",
          marginTop: "0.25rem",
          color: "hsl(var(--muted-foreground, var(--foreground)))",
        }}
      >
        {labelCol} × {valueCol}
      </p>
    </div>
  );
}

export function AskBox() {
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resp, setResp] = useState<AskResponse | null>(null);
  const [mostrarSQL, setMostrarSQL] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [verMaisExemplos, setVerMaisExemplos] = useState(false);
  const searchParams = useSearchParams();
  const autoExecutedRef = useRef(false);

  // ── Detecta ?q=pergunta na URL e executa automaticamente ────────
  useEffect(() => {
    if (autoExecutedRef.current) return;
    const q = searchParams.get("q");
    if (q && q.trim()) {
      autoExecutedRef.current = true;
      perguntar(q.trim());
      // rola pra caixa
      setTimeout(() => {
        document.getElementById("askbox")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function compartilhar() {
    if (!resp?.pergunta) return;
    const url = `${window.location.origin}/?q=${encodeURIComponent(resp.pergunta)}`;
    try {
      // Tenta a Web Share API primeiro (mobile principalmente)
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Transparência Federal",
          text: resp.pergunta,
          url,
        });
        return;
      }
    } catch {
      /* user cancelou ou não suporta — cai pro clipboard */
    }
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2500);
    } catch {
      /* silent */
    }
  }

  async function perguntar(q?: string) {
    const texto = (q ?? pergunta).trim();
    if (!texto || carregando) return;
    setPergunta(texto);
    setCarregando(true);
    setResp(null);
    setMostrarSQL(false);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: texto }),
      });
      const data: AskResponse = await res.json();
      setResp(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResp({ ok: false, pergunta: texto, erro: msg });
    } finally {
      setCarregando(false);
    }
  }

  async function copiar() {
    if (!resp?.resultado) return;
    const text = `${resp.pergunta}\n\n${resp.resposta}\n\nDados:\n${JSON.stringify(
      resp.resultado,
      null,
      2,
    )}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* silent */
    }
  }

  const cols = resp?.resultado?.[0] ? Object.keys(resp.resultado[0]) : [];

  return (
    <section
      id="askbox"
      style={{
        borderBottom: "1px solid hsl(var(--border))",
        backgroundColor: "hsl(var(--surface, var(--muted)))",
      }}
    >
      <div className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          {/* Cabeçalho */}
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  color: "hsl(var(--primary))",
                }}
              >
                Pergunte aos dados
              </span>
              <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
            </div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}>
              Pesquisa em linguagem natural
            </h2>
            <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground, var(--foreground)))" }}>
              Pergunte qualquer coisa sobre orçamento federal, parlamentares ou contratos.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              perguntar();
            }}
            style={{ position: "relative" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "hsl(var(--card, var(--background)))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.125rem",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <input
                type="text"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder='Ex.: "Qual deputado mais gastou em passagens aéreas?"'
                maxLength={500}
                disabled={carregando}
                style={{
                  flex: 1,
                  padding: "1rem 1rem 1rem 1.25rem",
                  background: "transparent",
                  border: "none",
                  fontSize: "0.9375rem",
                  outline: "none",
                  color: "hsl(var(--foreground))",
                }}
              />
              <button
                type="submit"
                disabled={carregando || !pergunta.trim()}
                style={{
                  margin: "0.375rem",
                  padding: "0.625rem 1.25rem",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "white",
                  backgroundColor: "hsl(var(--primary))",
                  border: "none",
                  borderRadius: "0.125rem",
                  cursor: carregando || !pergunta.trim() ? "not-allowed" : "pointer",
                  opacity: carregando || !pergunta.trim() ? 0.4 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {carregando ? "Pensando..." : "Perguntar →"}
              </button>
            </div>
          </form>

          {/* Sugestões (só antes da primeira pergunta) */}
          {!resp && !carregando && (
            <div
              style={{
                marginTop: "1rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground, var(--foreground)))" }}>
                Tente:
              </span>
              {SUGESTOES.map((s) => (
                <button
                  key={s}
                  onClick={() => perguntar(s)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.25rem 0.75rem",
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.125rem",
                    cursor: "pointer",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  {s}
                </button>
              ))}
              <button
                onClick={() => setVerMaisExemplos((v) => !v)}
                style={{
                  fontSize: "0.75rem",
                  padding: "0.25rem 0.75rem",
                  backgroundColor: "transparent",
                  border: "1px dashed hsl(var(--border))",
                  borderRadius: "0.125rem",
                  cursor: "pointer",
                  color: "hsl(var(--primary))",
                  fontWeight: 600,
                }}
              >
                {verMaisExemplos ? "✕ esconder" : "+ mais exemplos"}
              </button>
            </div>
          )}

          {/* Bloco de categorias (expansível) */}
          {!resp && !carregando && verMaisExemplos && (
            <div
              style={{
                marginTop: "1.25rem",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {CATEGORIAS.map((cat) => (
                <div
                  key={cat.titulo}
                  style={{
                    padding: "0.875rem 1rem",
                    backgroundColor: "hsl(var(--card, var(--background)))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.125rem",
                  }}
                >
                  <p
                    style={{
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      color: "hsl(var(--primary))",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {cat.titulo}
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    {cat.perguntas.map((p) => (
                      <li key={p}>
                        <button
                          onClick={() => perguntar(p)}
                          style={{
                            fontSize: "0.8125rem",
                            background: "transparent",
                            border: "none",
                            padding: "0.125rem 0",
                            textAlign: "left",
                            cursor: "pointer",
                            color: "hsl(var(--foreground))",
                            lineHeight: 1.4,
                          }}
                        >
                          → {p}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* Loading */}
          {carregando && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.5rem",
                backgroundColor: "hsl(var(--card, var(--background)))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.125rem",
              }}
            >
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground, var(--foreground)))" }}>
                ⏳ Consultando 75.000 emendas, 22.000 sancionados, 540.000 gastos de gabinete...
              </p>
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ height: "10px", backgroundColor: "hsl(var(--muted))", borderRadius: "2px", width: "100%", opacity: 0.6 }} />
                <div style={{ height: "10px", backgroundColor: "hsl(var(--muted))", borderRadius: "2px", width: "85%", opacity: 0.6 }} />
                <div style={{ height: "10px", backgroundColor: "hsl(var(--muted))", borderRadius: "2px", width: "65%", opacity: 0.6 }} />
              </div>
            </div>
          )}

          {/* Erro */}
          {resp && !resp.ok && (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1rem 1.25rem",
                backgroundColor: "hsl(var(--card, var(--background)))",
                borderLeft: "3px solid hsl(var(--destructive, 0 84% 60%))",
                borderRadius: "0.125rem",
              }}
            >
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: "0.25rem" }}>
                Não consegui responder essa pergunta.
              </p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground, var(--foreground)))" }}>
                {resp.erro}
              </p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground, var(--foreground)))", marginTop: "0.5rem" }}>
                Tente reformular ou usar uma das sugestões.
              </p>
            </div>
          )}

          {/* Resposta sucesso */}
          {resp && resp.ok && resp.resposta && (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Narrativa */}
              <div
                style={{
                  padding: "1.5rem",
                  backgroundColor: "hsl(var(--card, var(--background)))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.125rem",
                  position: "relative",
                  paddingLeft: "1.5rem",
                }}
              >
                <div style={{ position: "absolute", left: 0, top: 0, width: "3px", height: "100%", backgroundColor: "hsl(var(--primary))" }} />
                <p
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    color: "hsl(var(--muted-foreground, var(--foreground)))",
                    marginBottom: "0.75rem",
                  }}
                >
                  Resposta {resp.cache_hit ? "(cache)" : ""}
                </p>
                <div style={{ whiteSpace: "pre-line", lineHeight: 1.6, color: "hsl(var(--foreground))" }}>
                  {resp.resposta}
                </div>
              </div>

              {/* Tabela */}
              {resp.resultado && resp.resultado.length > 0 && (
                <div
                  style={{
                    backgroundColor: "hsl(var(--card, var(--background)))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.125rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "0.5rem 1rem",
                      borderBottom: "1px solid hsl(var(--border))",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "hsl(var(--muted-foreground, var(--foreground)))",
                      }}
                    >
                      Dados ({resp.resultado.length} {resp.resultado.length === 1 ? "linha" : "linhas"})
                    </p>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button
                        onClick={() => setMostrarSQL(!mostrarSQL)}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.625rem",
                          backgroundColor: "transparent",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.125rem",
                          cursor: "pointer",
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        {mostrarSQL ? "✕ SQL" : "⚙ Ver SQL"}
                      </button>
                      <button
                        onClick={copiar}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.625rem",
                          backgroundColor: "transparent",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.125rem",
                          cursor: "pointer",
                          color: "hsl(var(--foreground))",
                        }}
                      >
                        {copiado ? "✓ Copiado" : "📋 Copiar"}
                      </button>
                      <button
                        onClick={compartilhar}
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.25rem 0.625rem",
                          backgroundColor: "transparent",
                          border: "1px solid hsl(var(--primary))",
                          borderRadius: "0.125rem",
                          cursor: "pointer",
                          color: "hsl(var(--primary))",
                          fontWeight: 600,
                        }}
                      >
                        {linkCopiado ? "✓ Link copiado" : "🔗 Compartilhar"}
                      </button>
                    </div>
                  </div>

                  {/* Gráfico inline (se aplicável) */}
                  {(() => {
                    const chartFields = detectChartFields(resp.resultado as Record<string, unknown>[]);
                    if (!chartFields) return null;
                    return (
                      <BarChart
                        rows={resp.resultado as Record<string, unknown>[]}
                        labelCol={chartFields.labelCol}
                        valueCol={chartFields.valueCol}
                      />
                    );
                  })()}

                  {mostrarSQL && resp.sql && (
                    <pre
                      style={{
                        padding: "0.75rem 1rem",
                        fontSize: "0.75rem",
                        overflowX: "auto",
                        borderBottom: "1px solid hsl(var(--border))",
                        fontFamily: "ui-monospace, monospace",
                        backgroundColor: "hsl(var(--muted))",
                        color: "hsl(var(--foreground))",
                        margin: 0,
                      }}
                    >
                      {resp.sql}
                    </pre>
                  )}

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--muted))" }}>
                          {cols.map((c) => (
                            <th
                              key={c}
                              style={{
                                padding: "0.5rem 1rem",
                                textAlign: "left",
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                                color: "hsl(var(--muted-foreground, var(--foreground)))",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.replace(/_/g, " ")}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {resp.resultado.slice(0, 20).map((row, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                            {cols.map((c) => (
                              <td key={c} style={{ padding: "0.5rem 1rem", color: "hsl(var(--foreground))" }}>
                                {fmtCell((row as Record<string, unknown>)[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resp.resultado.length > 20 && (
                      <p
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.75rem",
                          textAlign: "center",
                          borderTop: "1px solid hsl(var(--border))",
                          color: "hsl(var(--muted-foreground, var(--foreground)))",
                        }}
                      >
                        Exibindo 20 de {resp.resultado.length} linhas. Clique em "Copiar" para todas.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <p
                style={{
                  fontSize: "0.6875rem",
                  textAlign: "center",
                  color: "hsl(var(--muted-foreground, var(--foreground)))",
                }}
              >
                {resp.cache_hit ? "⚡ Cache" : "🤖 Gerado por IA + executado em DB read-only"} ·{" "}
                {resp.latencia_ms}ms ·{" "}
                <button
                  onClick={() => setResp(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    textDecoration: "underline",
                    cursor: "pointer",
                    color: "inherit",
                    fontSize: "inherit",
                    padding: 0,
                  }}
                >
                  Nova pergunta
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
