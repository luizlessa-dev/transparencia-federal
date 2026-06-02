"use client";

/**
 * Caixa de pesquisa em linguagem natural — Observatório das Fundações Partidárias.
 * Backend: /api/ask-fundacoes → edge function ask-fundacoes no Supabase.
 */
import { useState } from "react";

interface AskResponse {
  ok: boolean;
  resposta?: string;
  dados?: Record<string, unknown>[];
  sql?: string;
  cache_hit?: boolean;
  erro?: string;
}

const SUGESTOES = [
  "Quais fundações têm sede no mesmo endereço do partido?",
  "Qual fundação mais recebeu em 2024?",
  "Quais fundações pagam aluguel para o próprio partido?",
  "Quanto o PL repassou à sua fundação por mês em 2024?",
  "Quais fundações concentraram mais de 40% dos repasses no fim do ano?",
];

function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return String(v);
}

export function FundacoesAskBox() {
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [resp, setResp] = useState<AskResponse | null>(null);
  const [mostrarSQL, setMostrarSQL] = useState(false);
  const [copiado, setCopiado] = useState(false);

  async function perguntar(q?: string) {
    const texto = (q ?? pergunta).trim();
    if (!texto || carregando) return;
    setPergunta(texto);
    setCarregando(true);
    setResp(null);
    setMostrarSQL(false);
    try {
      const res = await fetch("/api/ask-fundacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: texto }),
      });
      const data: AskResponse = await res.json();
      setResp(data);
    } catch (e) {
      setResp({ ok: false, erro: e instanceof Error ? e.message : String(e) });
    } finally {
      setCarregando(false);
    }
  }

  async function copiar() {
    if (!resp?.dados) return;
    const text = `${pergunta}\n\n${resp.resposta}\n\n${JSON.stringify(resp.dados, null, 2)}`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const cols = resp?.dados?.[0] ? Object.keys(resp.dados[0]) : [];

  return (
    <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface, var(--muted)))" }}>
      <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "2.5rem" }}>
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>

          {/* Cabeçalho */}
          <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(var(--primary))" }}>
                Pergunte aos dados
              </span>
              <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
            </div>
            <h2 style={{ fontSize: "1.375rem", fontWeight: 700, marginBottom: "0.25rem" }}>
              Pesquisa em linguagem natural
            </h2>
            <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>
              Pergunte qualquer coisa sobre as 25 fundações e os R$ 241,5 milhões repassados em 2024.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={(e) => { e.preventDefault(); perguntar(); }} style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem" }}>
              <input
                type="text"
                value={pergunta}
                onChange={(e) => setPergunta(e.target.value)}
                placeholder='Ex.: "Qual fundação mais recebeu em 2024?"'
                maxLength={500}
                disabled={carregando}
                style={{ flex: 1, padding: "0.875rem 1rem 0.875rem 1.25rem", background: "transparent", border: "none", fontSize: "0.9375rem", outline: "none", color: "hsl(var(--foreground))" }}
              />
              <button
                type="submit"
                disabled={carregando || !pergunta.trim()}
                style={{ margin: "0.375rem", padding: "0.625rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, color: "white", backgroundColor: "hsl(var(--primary))", border: "none", borderRadius: "0.125rem", cursor: carregando || !pergunta.trim() ? "not-allowed" : "pointer", opacity: carregando || !pergunta.trim() ? 0.4 : 1, whiteSpace: "nowrap" }}
              >
                {carregando ? "Buscando..." : "Perguntar →"}
              </button>
            </div>
          </form>

          {/* Sugestões */}
          {!resp && !carregando && (
            <div style={{ marginTop: "0.875rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption, var(--foreground)))", alignSelf: "center" }}>Tente:</span>
              {SUGESTOES.map((s) => (
                <button key={s} onClick={() => perguntar(s)} style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem", backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem", cursor: "pointer", color: "hsl(var(--foreground))" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Loading */}
          {carregando && (
            <div style={{ marginTop: "1.5rem", padding: "1.25rem", backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem" }}>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>⏳ Consultando 25 fundações e 394 repasses...</p>
              <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {[100, 80, 60].map((w, i) => (
                  <div key={i} style={{ height: "8px", backgroundColor: "hsl(var(--border))", borderRadius: "2px", width: `${w}%`, opacity: 0.6 }} />
                ))}
              </div>
            </div>
          )}

          {/* Erro */}
          {resp && !resp.ok && (
            <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--background))", borderLeft: "3px solid hsl(var(--danger))", borderRadius: "0.125rem" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>Não consegui responder essa pergunta.</p>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>{resp.erro}</p>
            </div>
          )}

          {/* Resposta */}
          {resp?.ok && resp.resposta && (
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ padding: "1.25rem 1.5rem", backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem", position: "relative" }}>
                <div style={{ position: "absolute", left: 0, top: 0, width: "3px", height: "100%", backgroundColor: "hsl(var(--primary))" }} />
                <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption, var(--foreground)))", marginBottom: "0.75rem" }}>
                  Resposta {resp.cache_hit ? "(cache ⚡)" : ""}
                </p>
                <div style={{ whiteSpace: "pre-line", lineHeight: 1.7, color: "hsl(var(--foreground))" }}>{resp.resposta}</div>
              </div>

              {resp.dados && resp.dados.length > 0 && (
                <div style={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem", overflow: "hidden" }}>
                  <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <p style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption, var(--foreground)))" }}>
                      Dados ({resp.dados.length} {resp.dados.length === 1 ? "linha" : "linhas"})
                    </p>
                    <div style={{ display: "flex", gap: "0.25rem" }}>
                      <button onClick={() => setMostrarSQL(!mostrarSQL)} style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem", cursor: "pointer", color: "hsl(var(--foreground))" }}>
                        {mostrarSQL ? "✕ SQL" : "⚙ Ver SQL"}
                      </button>
                      <button onClick={copiar} style={{ fontSize: "0.75rem", padding: "0.25rem 0.625rem", background: "transparent", border: "1px solid hsl(var(--border))", borderRadius: "0.125rem", cursor: "pointer", color: "hsl(var(--foreground))" }}>
                        {copiado ? "✓ Copiado" : "📋 Copiar"}
                      </button>
                    </div>
                  </div>
                  {mostrarSQL && resp.sql && (
                    <pre style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", overflowX: "auto", borderBottom: "1px solid hsl(var(--border))", fontFamily: "ui-monospace, monospace", backgroundColor: "hsl(var(--surface))", margin: 0 }}>
                      {resp.sql}
                    </pre>
                  )}
                  <div style={{ overflowX: "auto" }}>
                    <table className="bloomberg-table">
                      <thead>
                        <tr>
                          {cols.map((c) => <th key={c}>{c.replace(/_/g, " ")}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {resp.dados.slice(0, 20).map((row, i) => (
                          <tr key={i}>
                            {cols.map((c) => <td key={c}>{fmtCell((row as Record<string, unknown>)[c])}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <p style={{ fontSize: "0.6875rem", textAlign: "center", color: "hsl(var(--text-caption, var(--foreground)))" }}>
                {resp.cache_hit ? "⚡ Cache" : "🤖 IA + DB read-only"} ·{" "}
                <button onClick={() => { setResp(null); setPergunta(""); }} style={{ background: "transparent", border: "none", textDecoration: "underline", cursor: "pointer", color: "inherit", fontSize: "inherit", padding: 0 }}>
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
