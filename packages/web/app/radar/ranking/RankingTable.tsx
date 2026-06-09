"use client";

import { useState } from "react";
import Link from "next/link";
import type { RankAutoridade } from "~/lib/radar-fab";

const ACCENT = "hsl(350 73% 44%)";

type SortKey = "voos" | "custo_estimado" | "fds_pct" | "internacionais" | "a_disposicao" | "noturnos";

function brl(n: number): string {
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)} mi`;
  return `R$ ${(n / 1000).toFixed(0)} mil`;
}

export function RankingTable({ dados }: { dados: RankAutoridade[] }) {
  const [sort, setSort] = useState<SortKey>("voos");
  const [busca, setBusca] = useState("");

  const filtrado = dados
    .filter(r => r.autoridade.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => b[sort] - a[sort]);

  const COLS: { key: SortKey; label: string }[] = [
    { key: "voos", label: "Voos" },
    { key: "custo_estimado", label: "Custo est." },
    { key: "fds_pct", label: "FDS %" },
    { key: "noturnos", label: "Noturnos" },
    { key: "internacionais", label: "Intl" },
    { key: "a_disposicao", label: "À disp." },
  ];

  const th = (key: SortKey, label: string) => (
    <th
      key={key}
      onClick={() => setSort(key)}
      style={{
        textAlign: "right", cursor: "pointer", userSelect: "none",
        color: sort === key ? ACCENT : "hsl(var(--text-caption))",
        whiteSpace: "nowrap",
      }}
    >
      {label} {sort === key ? "▾" : ""}
    </th>
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Filtrar autoridade…"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        style={{
          width: "100%", maxWidth: "20rem", marginBottom: "1rem",
          padding: "0.5rem 0.75rem", fontSize: "0.875rem",
          border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))",
          color: "hsl(var(--text-body))", borderRadius: "2px",
        }}
      />
      <div style={{ overflowX: "auto" }}>
        <table className="bloomberg-table">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>#</th>
              <th style={{ textAlign: "left" }}>Autoridade</th>
              {COLS.map(c => th(c.key, c.label))}
              <th style={{ textAlign: "left" }}>Top destino</th>
            </tr>
          </thead>
          <tbody>
            {filtrado.map((r, i) => (
              <tr key={r.autoridade}>
                <td style={{ color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                <td style={{ fontWeight: 500, maxWidth: "18rem" }}>
                  {r.slug
                    ? <Link href={`/autoridade/${r.slug}`} style={{ color: "hsl(var(--text-headline))", textDecoration: "none", borderBottom: `1px dotted ${ACCENT}` }}>{r.autoridade}</Link>
                    : r.autoridade}
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{r.voos}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{brl(r.custo_estimado)}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: r.fds_pct >= 25 ? ACCENT : undefined }}>{r.fds_pct}%</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.noturnos}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{r.internacionais}</td>
                <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: r.a_disposicao > 0 ? ACCENT : "hsl(var(--text-caption))" }}>{r.a_disposicao || "—"}</td>
                <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                  {r.top_destinos[0] ? `${r.top_destinos[0].destino} (${r.top_destinos[0].n})` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.75rem" }}>
        Clique no cabeçalho de uma coluna para reordenar · {filtrado.length} autoridades
      </p>
    </div>
  );
}
