"use client";

import { Fragment, useState } from "react";
import type { CeapsSenadoNota } from "~/services/ceaps-senado";

interface Props {
  notas: CeapsSenadoNota[];
  /** Quantidade máxima a renderizar (default 500). */
  limit?: number;
}

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v);
}

function fmtCNPJ(cnpj: string | null): string {
  if (!cnpj) return "—";
  const d = cnpj.replace(/\D/g, "");
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  return cnpj;
}

function fmtData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function NotasSenadoTable({ notas, limit = 500 }: Props) {
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const visiveis = notas.slice(0, limit);

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="bloomberg-table" style={{ width: "100%", minWidth: "960px" }}>
        <thead>
          <tr>
            <th style={{ width: "1.5rem" }} />
            <th>Data</th>
            <th>Fornecedor</th>
            <th>CNPJ/CPF</th>
            <th>Doc</th>
            <th>Categoria</th>
            <th>Detalhamento</th>
            <th style={{ textAlign: "right" }}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {visiveis.map((n) => {
            const aberta = abertaId === n.id;
            return (
              <Fragment key={n.id}>
                <tr
                  onClick={() => setAbertaId(aberta ? null : n.id)}
                  style={{
                    cursor: "pointer",
                    backgroundColor: aberta ? "hsl(var(--surface))" : undefined,
                  }}
                  title={aberta ? "Clique pra fechar" : "Clique pra ver detalhe"}
                >
                  <td
                    style={{
                      textAlign: "center",
                      color: "hsl(var(--primary))",
                      fontFamily: "var(--font-mono)",
                      fontSize: "0.75rem",
                      transition: "transform 0.15s",
                    }}
                    aria-hidden="true"
                  >
                    {aberta ? "▾" : "▸"}
                  </td>
                  <td style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                    {fmtData(n.data)}
                  </td>
                  <td style={{ fontSize: "0.8125rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.fornecedor || "—"}
                  </td>
                  <td style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", whiteSpace: "nowrap" }}>
                    {fmtCNPJ(n.cnpj_cpf)}
                  </td>
                  <td style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>
                    {n.documento || "—"}
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.tipo_despesa || "—"}
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.detalhamento || <span style={{ color: "hsl(var(--text-caption))", fontStyle: "italic" }}>sem detalhamento</span>}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {fmtBRL(n.valor_reembolsado)}
                  </td>
                </tr>

                {aberta && (
                  <tr style={{ backgroundColor: "hsl(var(--surface))" }}>
                    <td />
                    <td colSpan={7} style={{ padding: "1rem 1.25rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem 1.5rem", marginBottom: "0.75rem" }}>
                        {[
                          { label: "Fornecedor", value: n.fornecedor || "—" },
                          { label: "CNPJ / CPF", value: fmtCNPJ(n.cnpj_cpf), mono: true },
                          { label: "Categoria", value: n.tipo_despesa || "—" },
                          { label: "Nº documento", value: n.documento || "—", mono: true },
                          { label: "Código (chave)", value: n.cod_documento, mono: true },
                          { label: "Data de emissão", value: fmtData(n.data), mono: true },
                          { label: "Ano / Mês de competência", value: `${n.ano}${n.mes ? ` / ${String(n.mes).padStart(2, "0")}` : ""}`, mono: true },
                          { label: "Valor reembolsado", value: fmtBRL(n.valor_reembolsado), mono: true, strong: true },
                        ].map((row) => (
                          <div key={row.label}>
                            <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "hsl(var(--text-caption))", marginBottom: "0.25rem" }}>
                              {row.label}
                            </div>
                            <div
                              style={{
                                fontSize: "0.8125rem",
                                color: row.strong ? "hsl(var(--text-headline))" : "hsl(var(--text-body))",
                                fontFamily: row.mono ? "var(--font-mono)" : "var(--font-sans)",
                                fontWeight: row.strong ? 700 : 400,
                                wordBreak: "break-word",
                              }}
                            >
                              {row.value}
                            </div>
                          </div>
                        ))}
                      </div>

                      {n.detalhamento && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.875rem 1rem",
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderLeft: "3px solid hsl(var(--primary))",
                            borderRadius: "2px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: "0.625rem",
                              fontWeight: 600,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              color: "hsl(var(--text-caption))",
                              marginBottom: "0.375rem",
                            }}
                          >
                            Detalhamento completo
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.8125rem",
                              lineHeight: 1.55,
                              color: "hsl(var(--text-body))",
                              whiteSpace: "pre-line",
                            }}
                          >
                            {n.detalhamento}
                          </p>
                        </div>
                      )}

                      <p
                        style={{
                          marginTop: "0.75rem",
                          marginBottom: 0,
                          fontSize: "0.6875rem",
                          color: "hsl(var(--text-caption))",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        Fonte: Senado Federal — CSV CEAPS {n.ano}. O Senado não publica
                        URL direta do PDF da nota; use o portal{" "}
                        <a
                          href="https://www6g.senado.leg.br/transparencia/sf/sftransparencia/contas/index.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "hsl(var(--primary))" }}
                        >
                          senado.leg.br/transparencia
                        </a>{" "}
                        e procure pelo código {n.cod_documento} se quiser conferir o comprovante.
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
