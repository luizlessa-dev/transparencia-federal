import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getFundacaoDetalhe,
  getRepassesMensais,
  getRepassesIndividuais,
  getNFsParaFundacao,
  getAlertasFundacao,
} from "~/services/fundacoes-detalhe";
import { GerarPautaButton } from "~/components/GerarPautaButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ cnpj: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { cnpj } = await params;
  const f = await getFundacaoDetalhe(cnpj);
  if (!f) return { title: "Fundação não encontrada — The BR Insider" };
  return {
    title: `${f.nome_popular ?? f.razao_social} (${f.partido_sigla}) — Fundações Partidárias | The BR Insider`,
    description: `Repasses, alertas e notas fiscais de ${f.nome_popular ?? f.razao_social}, fundação do ${f.partido_sigla}. Dados do TSE e Receita Federal.`,
    alternates: { canonical: `/fundacoes/${cnpj}` },
  };
}

function fmtBRL(v: number | null): string {
  if (!v) return "—";
  if (v >= 1e6) return `R$ ${(v / 1e6).toFixed(1)} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toFixed(0)} mil`;
  return `R$ ${v.toLocaleString("pt-BR")}`;
}

function fmtBRLFull(v: number | null): string {
  if (!v) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(v);
}

function fmtData(v: string | null): string {
  if (!v) return "—";
  try { return new Date(v + "T00:00:00").toLocaleDateString("pt-BR"); } catch { return v; }
}

function fmtMes(v: string): string {
  const [ano, mes] = v.split("-");
  const nomes = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  return `${nomes[parseInt(mes, 10) - 1]}/${ano}`;
}

function AlertaBadge({ label, ativo }: { label: string; ativo: boolean }) {
  if (!ativo) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.25rem",
      padding: "0.25rem 0.625rem", borderRadius: "2px", fontSize: "0.75rem", fontWeight: 600,
      backgroundColor: "hsl(var(--danger))", color: "white",
    }}>
      ⚠️ {label}
    </span>
  );
}

export default async function FundacaoDetalhePage({ params }: Props) {
  const { cnpj } = await params;
  const cnpjLimpo = cnpj.replace(/\D/g, "");

  const [fundacao, mensal, individuais, nfs, alertas] = await Promise.all([
    getFundacaoDetalhe(cnpjLimpo),
    getRepassesMensais(cnpjLimpo),
    getRepassesIndividuais(cnpjLimpo),
    getNFsParaFundacao(cnpjLimpo),
    getAlertasFundacao(cnpjLimpo),
  ]);

  if (!fundacao) notFound();

  const totalRepassado = individuais.reduce((s, r) => s + Number(r.vr_pagamento ?? 0), 0);
  const maxMensal = Math.max(...mensal.map(m => m.total_repassado), 1);

  return (
    <>
      {/* ── BREADCRUMB ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 0" }}>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption, var(--foreground)))" }}>
            <Link href="/fundacoes" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              ← Fundações Partidárias
            </Link>
          </p>
        </div>
      </div>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <span className="badge-neutral" style={{ marginBottom: "0.5rem", display: "inline-block" }}>
                {fundacao.partido_sigla}
              </span>
              <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", marginBottom: "0.25rem", lineHeight: 1.2 }}>
                {fundacao.nome_popular ?? fundacao.razao_social}
              </h1>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>
                CNPJ {cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")} · {fundacao.municipio}, {fundacao.uf}
              </p>
            </div>
            <GerarPautaButton cnpj={cnpjLimpo} nomeFundacao={fundacao.nome_popular ?? fundacao.razao_social ?? ""} />
          </div>

          {/* Alertas ativos */}
          {alertas && alertas.score_alertas > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <AlertaBadge label="Sede compartilhada" ativo={alertas.alerta_sede_compartilhada} />
              <AlertaBadge label={`Aluguel circular ${fmtBRL(alertas.valor_aluguel_anual)}/ano`} ativo={alertas.alerta_aluguel_circular} />
              <AlertaBadge label={`Concentração Q4 ${alertas.pct_q4.toFixed(0)}%`} ativo={alertas.alerta_concentracao_q4} />
              <AlertaBadge label="Natureza jurídica atípica" ativo={alertas.alerta_natureza_juridica_suspeita} />
            </div>
          )}

          {/* KPIs */}
          <div className="bloomberg-kpi-grid">
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Total recebido 2024</span>
              <span className="bloomberg-kpi-value">{fmtBRL(totalRepassado)}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Repasses</span>
              <span className="bloomberg-kpi-value">{individuais.length}</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Meses ativos</span>
              <span className="bloomberg-kpi-value">{mensal.length}/12</span>
            </div>
            <div className="bloomberg-kpi">
              <span className="bloomberg-kpi-label">Score de alertas</span>
              <span className="bloomberg-kpi-value" style={{ color: alertas && alertas.score_alertas >= 2 ? "hsl(var(--danger))" : alertas?.score_alertas === 1 ? "hsl(var(--warning))" : undefined }}>
                {alertas?.score_alertas ?? 0}/4
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingTop: "2rem", paddingBottom: "3rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>

        {/* ── COLUNA ESQUERDA ─────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Perfil */}
          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
              Perfil
            </h2>
            <dl style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 1rem" }}>
              {[
                ["Presidente", fundacao.presidente_nome ?? "—"],
                ["No cargo desde", fmtData(fundacao.presidente_desde)],
                ["Fundada em", fmtData(fundacao.data_abertura)],
                ["Capital social", fmtBRLFull(fundacao.capital_social)],
                ["Natureza jurídica", fundacao.natureza_juridica ?? "—"],
                ["Logradouro", [fundacao.logradouro, fundacao.numero, fundacao.complemento].filter(Boolean).join(", ") || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "hsl(var(--text-caption, var(--foreground)))", marginBottom: "0.125rem" }}>
                    {label}
                  </dt>
                  <dd style={{ fontSize: "0.875rem", color: "hsl(var(--foreground))" }}>{value}</dd>
                </div>
              ))}
            </dl>
            {(fundacao.mesmo_endereco_partido || fundacao.mesmo_telefone_partido) && (
              <div style={{ marginTop: "1rem", padding: "0.75rem", backgroundColor: "hsl(var(--surface))", borderLeft: "3px solid hsl(var(--danger))", fontSize: "0.8125rem" }}>
                {fundacao.mesmo_endereco_partido && <p>📍 Mesmo endereço e sala do partido.</p>}
                {fundacao.mesmo_telefone_partido && <p>📞 Mesmo telefone do partido.</p>}
              </div>
            )}
          </section>

          {/* Timeline mensal */}
          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
              Repasses mensais 2024
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {mensal.length === 0 && <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>Nenhum repasse registrado.</p>}
              {mensal.map(m => {
                const pct = Math.round((m.total_repassado / maxMensal) * 100);
                const isQ4 = parseInt(m.mes.slice(5, 7), 10) >= 10;
                return (
                  <div key={m.mes} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.75rem", width: "52px", flexShrink: 0, color: "hsl(var(--text-caption, var(--foreground)))", fontFamily: "var(--font-mono)" }}>
                      {fmtMes(m.mes)}
                    </span>
                    <div style={{ flex: 1, height: "14px", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: isQ4 ? "hsl(var(--danger))" : "hsl(var(--primary))", borderRadius: "2px", opacity: 0.85 }} />
                    </div>
                    <span style={{ fontSize: "0.75rem", width: "64px", textAlign: "right", flexShrink: 0, fontFamily: "var(--font-mono)" }}>
                      {fmtBRL(m.total_repassado)}
                    </span>
                  </div>
                );
              })}
              {mensal.some(m => parseInt(m.mes.slice(5,7), 10) >= 10) && (
                <p style={{ fontSize: "0.6875rem", color: "hsl(var(--danger))", marginTop: "0.25rem" }}>
                  Barras vermelhas = Q4 (out–dez)
                </p>
              )}
            </div>
          </section>

        </div>

        {/* ── COLUNA DIREITA ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Notas fiscais (repasses com PDF) */}
          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
              Notas fiscais dos repasses
            </h2>
            {nfs.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>
                Nenhuma NF vinculada (ingestão pode estar em andamento).
              </p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ fontSize: "0.8125rem" }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Tipo</th>
                      <th style={{ textAlign: "right" }}>Valor</th>
                      <th>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nfs.slice(0, 30).map(nf => (
                      <tr key={`${nf.sq_despesa}-${nf.nr_documento}`}>
                        <td style={{ fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{fmtData(nf.dt_pagamento)}</td>
                        <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {(nf.ds_tipo_despesa ?? "—").replace("APLICACAO DE RECURSO", "Aplicação").replace("FUNDAÇÃO PARTIDÁRIA", "Fund. Partidária").slice(0, 40)}
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{fmtBRLFull(nf.vr_documento)}</td>
                        <td>
                          {nf.url_pdf ? (
                            <a href={nf.url_pdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", textDecoration: "none" }}>
                              📄 PDF
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {nfs.length > 30 && (
                  <p style={{ fontSize: "0.75rem", textAlign: "center", padding: "0.5rem", color: "hsl(var(--text-caption, var(--foreground)))" }}>
                    Exibindo 30 de {nfs.length} NFs
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Repasses individuais */}
          <section>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
              Repasses individuais
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table className="bloomberg-table" style={{ fontSize: "0.8125rem" }}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th style={{ textAlign: "right" }}>Valor</th>
                    <th>Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {individuais.map(r => (
                    <tr key={r.sq_despesa}>
                      <td style={{ fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{fmtData(r.dt_pagamento)}</td>
                      <td>
                        <span className={r.tipo_repasse === "aluguel" ? "badge-warn" : r.tipo_repasse === "fundacao_partidaria" ? "badge-neutral" : "badge-neutral"} style={{ fontSize: "0.6875rem" }}>
                          {r.tipo_repasse === "fundacao_partidaria" ? "Fund." : r.tipo_repasse === "aluguel" ? "Aluguel" : r.tipo_repasse}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {fmtBRLFull(r.vr_pagamento)}
                      </td>
                      <td style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption, var(--foreground)))" }}>
                        {r.ds_fonte_despesa ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>

      {/* Nota de transparência */}
      <div className="container" style={{ paddingBottom: "2rem" }}>
        <div style={{ padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
          <strong>Sobre os dados:</strong> Repasses obtidos do dataset <em>Prestação de Contas Anual Partidária 2024</em> (TSE Dados Abertos). Endereço e QSA da Receita Federal via BrasilAPI. PDFs linkados ao sistema spcadownload.tse.jus.br do TSE. As fundações partidárias <strong>não prestam contas individuais</strong> no sistema público — apenas os repasses recebidos do partido são rastreáveis por esta via.
        </div>
      </div>
    </>
  );
}
