"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Esta página é client-side para o botão "copiar"
// A análise é buscada via fetch no cliente pra não precisar de route handler separado

const REPO_RAW = "https://raw.githubusercontent.com/luizlessa-dev/voos-oficiais/main";

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function formatMes(mes: string) {
  const [ano, m] = mes.split("-");
  return `${MESES_PT[parseInt(m) - 1]} ${ano}`;
}

// Extrai as seções de análise relevantes para newsletter
function extrairNewsletter(md: string, mes: string): string {
  const titulo = formatMes(mes);
  const linhas = md.split("\n");

  // Extrai sumário e top autoridades
  const secoes: string[] = [];
  let secaoAtual: string[] = [];
  let capturando = false;
  let contagemSecoes = 0;
  const secoesDesejadas = ["Sumário", "Top 10", "Voos em fim de semana", "Sequências"];

  for (const linha of linhas) {
    if (linha.startsWith("## ")) {
      if (secaoAtual.length > 0 && capturando) {
        secoes.push(secaoAtual.join("\n"));
        secaoAtual = [];
        contagemSecoes++;
        if (contagemSecoes >= 3) break;
      }
      capturando = secoesDesejadas.some(s => linha.includes(s));
      if (capturando) secaoAtual = [linha];
    } else if (capturando) {
      secaoAtual.push(linha);
    }
  }
  if (secaoAtual.length > 0 && capturando) secoes.push(secaoAtual.join("\n"));

  const corpo = secoes.join("\n\n");

  return `# Radar FAB — ${titulo}

> Monitoramento de voos de autoridades em aeronaves da Força Aérea Brasileira.
> Fonte: GABAER (FABdadosabertos/GABAER) · Decreto nº 10.267/2020

${corpo}

---
*Análise automática Radar FAB · transparenciafederal.org/radar*
*Dados: GABAER/COMAER · Base aberta desde 2020*`;
}

export default function NewsletterPage() {
  const [analises, setAnalises]   = useState<Array<{ mes: string; titulo: string }>>([]);
  const [mesSel, setMesSel]       = useState<string>("");
  const [conteudo, setConteudo]   = useState<string>("");
  const [loading, setLoading]     = useState(false);
  const [copiado, setCopiado]     = useState(false);

  // Busca lista de análises
  useEffect(() => {
    fetch("https://api.github.com/repos/luizlessa-dev/voos-oficiais/contents/dados/analises", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then(r => r.json())
      .then((items: Array<{ name: string }>) => {
        const lista = items
          .filter(it => /^\d{4}-\d{2}\.md$/.test(it.name))
          .map(it => ({ mes: it.name.replace(".md", ""), titulo: formatMes(it.name.replace(".md", "")) }))
          .sort((a, b) => b.mes.localeCompare(a.mes));
        setAnalises(lista);
        if (lista.length > 0) setMesSel(lista[0].mes);
      })
      .catch(() => {});
  }, []);

  // Busca análise selecionada
  useEffect(() => {
    if (!mesSel) return;
    setLoading(true);
    setConteudo("");
    fetch(`${REPO_RAW}/dados/analises/${mesSel}.md`)
      .then(r => r.text())
      .then(md => {
        setConteudo(extrairNewsletter(md, mesSel));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [mesSel]);

  const copiar = async () => {
    await navigator.clipboard.writeText(conteudo);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Newsletter</span>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: "hsl(350 73% 44%)" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(350 73% 44%)" }}>
              Fase 3 · Newsletter
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", marginBottom: "0.5rem" }}>
            Edição da Newsletter
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))" }}>
            Rascunho gerado automaticamente a partir da análise mensal. Selecione o mês, revise e cole no Beehiiv.
          </p>
        </div>

        {/* Seletor de mês */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            padding: "1rem 1.25rem",
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--card))",
            borderRadius: "2px",
            marginBottom: "1.5rem",
          }}
        >
          <label style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-caption))", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Edição:
          </label>
          <select
            value={mesSel}
            onChange={e => setMesSel(e.target.value)}
            style={{
              flex: 1,
              padding: "0.5rem 0.75rem",
              fontSize: "0.875rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
              color: "hsl(var(--text-body))",
              borderRadius: "2px",
            }}
          >
            {analises.map(a => (
              <option key={a.mes} value={a.mes}>{a.titulo}</option>
            ))}
          </select>

          <button
            onClick={copiar}
            disabled={!conteudo || loading}
            style={{
              padding: "0.5rem 1.25rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              backgroundColor: copiado ? "hsl(120 40% 40%)" : "hsl(350 73% 44%)",
              color: "#fff",
              border: "none",
              borderRadius: "2px",
              cursor: conteudo ? "pointer" : "not-allowed",
              opacity: !conteudo || loading ? 0.6 : 1,
              transition: "background-color 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {copiado ? "✓ Copiado!" : "Copiar texto"}
          </button>
        </div>

        {/* Preview */}
        <div
          style={{
            border: "1px solid hsl(var(--border))",
            backgroundColor: "hsl(var(--card))",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          {/* Barra do preview */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.75rem 1.25rem",
              borderBottom: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--surface))",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Rascunho · Markdown
            </span>
            <span style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>
              Cole no campo de texto do Beehiiv
            </span>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.875rem" }}>
              Carregando análise…
            </div>
          ) : conteudo ? (
            <pre
              style={{
                margin: 0,
                padding: "1.5rem",
                fontSize: "0.8125rem",
                lineHeight: 1.7,
                color: "hsl(var(--text-body))",
                fontFamily: "var(--font-mono)",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                maxHeight: "32rem",
                overflowY: "auto",
              }}
            >
              {conteudo}
            </pre>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.875rem" }}>
              Selecione um mês para gerar o rascunho.
            </div>
          )}
        </div>

        {/* Dicas */}
        <div
          style={{
            marginTop: "1.5rem",
            padding: "1.25rem",
            backgroundColor: "hsl(var(--surface))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "2px",
          }}
        >
          <div style={{ fontSize: "0.8125rem", fontWeight: 700, marginBottom: "0.75rem", color: "hsl(var(--text-headline))" }}>
            Fluxo de publicação
          </div>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {[
              "GitHub Actions detecta CSV novo no GABAER → análise gerada automaticamente",
              "Issue aberta no repo com o sumário do mês",
              "Revisar a análise completa na página do mês",
              "Copiar este rascunho → colar no Beehiiv → ajustar lead editorial",
              "Publicar edição + agendar social",
            ].map((step, i) => (
              <li key={i} style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </>
  );
}
