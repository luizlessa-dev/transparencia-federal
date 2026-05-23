"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface Parlamentar {
  id: string;
  nome: string;
  nome_parlamentar: string;
  partido: string;
  uf: string;
  foto_url: string | null;
  casa_legislativa: string;
  ativo: boolean;
}

interface Props {
  parlamentares: Parlamentar[];
}

type Casa = "todos" | "camara" | "senado";

function normalizar(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function ParlamentaresGrid({ parlamentares }: Props) {
  const [busca, setBusca] = useState("");
  const [partido, setPartido] = useState<string | null>(null);
  const [uf, setUf] = useState<string | null>(null);
  const [casa, setCasa] = useState<Casa>("todos");

  // Universo de chips (calculado uma vez)
  const partidos = useMemo(() => {
    const set = new Set<string>();
    for (const p of parlamentares) if (p.partido) set.add(p.partido);
    return Array.from(set).sort();
  }, [parlamentares]);

  const ufs = useMemo(() => {
    const set = new Set<string>();
    for (const p of parlamentares) if (p.uf) set.add(p.uf);
    return Array.from(set).sort();
  }, [parlamentares]);

  // Filtragem
  const filtrados = useMemo(() => {
    const q = normalizar(busca.trim());
    return parlamentares.filter((p) => {
      if (partido && p.partido !== partido) return false;
      if (uf && p.uf !== uf) return false;
      if (casa !== "todos" && p.casa_legislativa !== casa) return false;
      if (q) {
        const nome = normalizar(p.nome_parlamentar || "");
        const nomeCivil = normalizar(p.nome || "");
        if (!nome.includes(q) && !nomeCivil.includes(q)) return false;
      }
      return true;
    });
  }, [parlamentares, busca, partido, uf, casa]);

  const limparTudo = () => {
    setBusca("");
    setPartido(null);
    setUf(null);
    setCasa("todos");
  };

  const temFiltro = !!busca || !!partido || !!uf || casa !== "todos";

  return (
    <div>
      {/* Barra de busca */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 0.75rem",
          backgroundColor: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "2px",
          marginBottom: "1rem",
        }}
      >
        <span style={{ fontSize: "1rem", color: "hsl(var(--text-caption))" }} aria-hidden="true">
          🔎
        </span>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome (ex.: Erika Hilton, Bolsonaro, Lula)"
          aria-label="Buscar parlamentar por nome"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "0.9375rem",
            color: "hsl(var(--text-headline))",
            padding: "0.5rem 0",
          }}
        />
        {temFiltro && (
          <button
            onClick={limparTudo}
            style={{
              background: "transparent",
              border: "1px solid hsl(var(--border))",
              borderRadius: "2px",
              padding: "0.25rem 0.625rem",
              fontSize: "0.75rem",
              cursor: "pointer",
              color: "hsl(var(--text-body))",
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Toggle Casa */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", fontWeight: 600 }}>
          Casa:
        </span>
        {(
          [
            { v: "todos", label: "Todos" },
            { v: "camara", label: "Câmara" },
            { v: "senado", label: "Senado" },
          ] as { v: Casa; label: string }[]
        ).map((opt) => {
          const ativo = casa === opt.v;
          return (
            <button
              key={opt.v}
              onClick={() => setCasa(opt.v)}
              style={{
                padding: "0.3rem 0.75rem",
                fontSize: "0.8125rem",
                fontWeight: ativo ? 600 : 500,
                borderRadius: "2px",
                border: "1px solid",
                borderColor: ativo ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: ativo ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: ativo ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Chips Partido */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", fontWeight: 600, paddingTop: "0.3rem" }}>
          Partido:
        </span>
        {partidos.map((sigla) => {
          const ativo = partido === sigla;
          return (
            <button
              key={sigla}
              onClick={() => setPartido(ativo ? null : sigla)}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: ativo ? 700 : 500,
                borderRadius: "2px",
                border: "1px solid",
                borderColor: ativo ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: ativo ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: ativo ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
                cursor: "pointer",
              }}
            >
              {sigla}
            </button>
          );
        })}
      </div>

      {/* Chips UF */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.6875rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", fontWeight: 600, paddingTop: "0.3rem" }}>
          UF:
        </span>
        {ufs.map((sigla) => {
          const ativo = uf === sigla;
          return (
            <button
              key={sigla}
              onClick={() => setUf(ativo ? null : sigla)}
              style={{
                padding: "0.25rem 0.5rem",
                fontSize: "0.75rem",
                fontWeight: ativo ? 700 : 500,
                borderRadius: "2px",
                border: "1px solid",
                borderColor: ativo ? "hsl(var(--primary))" : "hsl(var(--border))",
                backgroundColor: ativo ? "hsl(var(--primary))" : "hsl(var(--card))",
                color: ativo ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
                cursor: "pointer",
              }}
            >
              {sigla}
            </button>
          );
        })}
      </div>

      {/* Contador */}
      <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
        Mostrando <strong style={{ color: "hsl(var(--text-headline))" }}>{filtrados.length.toLocaleString("pt-BR")}</strong> de {parlamentares.length.toLocaleString("pt-BR")} parlamentares ativos.
      </p>

      {/* Grid de cards */}
      {filtrados.length === 0 ? (
        <div
          style={{
            padding: "2.5rem 1rem",
            textAlign: "center",
            border: "1px dashed hsl(var(--border))",
            borderRadius: "2px",
            color: "hsl(var(--text-caption))",
          }}
        >
          <p style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>Nenhum parlamentar encontrado com esses filtros.</p>
          <button
            onClick={limparTudo}
            style={{
              background: "transparent",
              border: "none",
              color: "hsl(var(--primary))",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1px",
            backgroundColor: "hsl(var(--border))",
          }}
        >
          {filtrados.map((p) => {
            const nome = p.nome_parlamentar || p.nome;
            return (
              <Link
                key={p.id}
                href={`/ranking/${p.id}`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                  padding: "0.875rem 1rem",
                  backgroundColor: "hsl(var(--card))",
                  textDecoration: "none",
                  transition: "background-color 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                  {p.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.foto_url}
                      alt={nome}
                      width={40}
                      height={40}
                      loading="lazy"
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "1px solid hsl(var(--border))",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        backgroundColor: "hsl(var(--muted))",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        color: "hsl(var(--text-caption))",
                      }}
                    >
                      {nome.charAt(0)}
                    </div>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "hsl(var(--text-headline))",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {nome}
                    </div>
                    <div
                      style={{
                        fontSize: "0.6875rem",
                        color: "hsl(var(--text-caption))",
                        fontFamily: "var(--font-sans)",
                      }}
                    >
                      {p.partido} · {p.uf}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.6875rem",
                    color: "hsl(var(--text-caption))",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {p.casa_legislativa === "senado" ? "Senado" : "Câmara"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
