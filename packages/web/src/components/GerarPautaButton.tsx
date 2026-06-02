"use client";

import { useState } from "react";

interface Props {
  cnpj: string;
  nomeFundacao: string;
}

export function GerarPautaButton({ cnpj, nomeFundacao }: Props) {
  const [estado, setEstado] = useState<"idle" | "carregando" | "pronto" | "erro">("idle");
  const [pauta, setPauta] = useState<string>("");
  const [copiado, setCopiado] = useState(false);
  const [erro, setErro] = useState<string>("");

  async function gerar() {
    setEstado("carregando");
    setPauta("");
    setErro("");
    try {
      const res = await fetch("/api/gerar-pauta-fundacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj, ano: 2024 }),
      });
      const data = await res.json() as { ok: boolean; pauta?: string; erro?: string };
      if (!data.ok) { setErro(data.erro ?? "Erro desconhecido"); setEstado("erro"); return; }
      setPauta(data.pauta ?? "");
      setEstado("pronto");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEstado("erro");
    }
  }

  async function copiar() {
    await navigator.clipboard.writeText(pauta).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div>
      {/* Botão principal */}
      {estado === "idle" && (
        <button
          onClick={gerar}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "0.75rem 1.25rem", fontSize: "0.875rem", fontWeight: 600,
            backgroundColor: "hsl(var(--primary))", color: "white",
            border: "none", borderRadius: "2px", cursor: "pointer",
          }}
        >
          ✍️ Gerar briefing jornalístico
        </button>
      )}

      {/* Carregando */}
      {estado === "carregando" && (
        <div style={{ padding: "1rem 1.25rem", border: "1px solid hsl(var(--border))", borderRadius: "2px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ width: "16px", height: "16px", border: "2px solid hsl(var(--border))", borderTopColor: "hsl(var(--primary))", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>
            Analisando dados de {nomeFundacao}...
          </span>
        </div>
      )}

      {/* Erro */}
      {estado === "erro" && (
        <div style={{ padding: "1rem", borderLeft: "3px solid hsl(var(--danger))", backgroundColor: "hsl(var(--surface))" }}>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.25rem" }}>Erro ao gerar pauta</p>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>{erro}</p>
          <button onClick={gerar} style={{ marginTop: "0.5rem", fontSize: "0.75rem", padding: "0.25rem 0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "2px", cursor: "pointer", background: "transparent" }}>
            Tentar novamente
          </button>
        </div>
      )}

      {/* Pauta gerada */}
      {estado === "pronto" && pauta && (
        <div style={{ border: "1px solid hsl(var(--border))", borderRadius: "2px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--primary))" }}>
                Briefing jornalístico gerado por IA
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={copiar} style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "2px", cursor: "pointer", background: "transparent" }}>
                {copiado ? "✓ Copiado" : "📋 Copiar"}
              </button>
              <button onClick={() => setEstado("idle")} style={{ fontSize: "0.75rem", padding: "0.25rem 0.75rem", border: "1px solid hsl(var(--border))", borderRadius: "2px", cursor: "pointer", background: "transparent" }}>
                ✕ Fechar
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div
            style={{
              padding: "1.5rem",
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: "0.875rem",
              color: "hsl(var(--foreground))",
              maxHeight: "600px",
              overflowY: "auto",
              fontFamily: "var(--font-sans)",
            }}
          >
            {pauta}
          </div>

          {/* Footer */}
          <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))", fontSize: "0.6875rem", color: "hsl(var(--text-caption, var(--foreground)))" }}>
            🤖 Gerado por Claude (Anthropic) · Dados: TSE Dados Abertos + Receita Federal · Verificar antes de publicar
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
