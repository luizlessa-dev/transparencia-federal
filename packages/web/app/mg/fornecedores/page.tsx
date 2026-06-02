/**
 * Raio-X de fornecedores — Estado de MG (scorecard por CNPJ).
 * Agregador-âncora: cruza contratos, compras SIAD, notas fiscais, pagamentos a
 * sancionadas, sobrepreço, sanção (condenada≠arquivada), terceirização e OS,
 * com um score de risco por empresa. Rota: /mg/fornecedores
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgFornecedoresResumo, getMgFornecedoresPerfil } from "~/services/mg";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Raio-X de fornecedores — Governo de MG | The BR Insider",
  description:
    "As empresas que mais faturam com o Estado de Minas Gerais, por CNPJ, com o risco de cada uma: condenação pela Lei Anticorrupção, sobrepreço em licitação e concentração por órgão. Cruzamento de contratos, compras, notas fiscais e pagamentos.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/fornecedores" },
  openGraph: {
    title: "Raio-X de fornecedores — Governo de MG",
    description:
      "Quem mais fatura com o Estado de MG e o risco de cada empresa: condenadas, sobrepreço e concentração por órgão, num só scorecard por CNPJ.",
    url: "https://www.thebrinsider.com/mg/fornecedores",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raio-X de fornecedores — Governo de MG | The BR Insider",
    description:
      "As empresas que mais faturam com MG e o risco de cada uma (condenadas, sobrepreço, concentração).",
  },
};

const FREE_LIMIT = 30;
const TOP = 150;

type Recorte = "faturamento" | "condenadas" | "sobrepreco";
const RECORTE_LABEL: Record<Recorte, string> = {
  faturamento: "Quem mais fatura",
  condenadas: "Condenadas que faturam",
  sobrepreco: "Com sobrepreço",
};

type Row = {
  cnpj_norm: string | null;
  cnpj_fmt: string | null;
  fornecedor: string | null;
  valor_faturado: string | null;
  valor_contratado: string | null;
  valor_compras_siad: string | null;
  valor_notas: string | null;
  valor_pago_sancionado: string | null;
  sobrepreco_itens: number | null;
  sobrepreco_valor: string | null;
  orgao_principal: string | null;
  concentracao_orgao: string | null;
  n_orgaos: number | null;
  condenada: boolean | null;
  processada: boolean | null;
  conduta: string | null;
  decisao: string | null;
  fase: string | null;
  terceirizada: boolean | null;
  organizacao_social: boolean | null;
  risco_score: number | null;
  risco_label: string | null;
};
type Resumo = {
  fornecedores: number;
  condenadas_faturando: number;
  pago_a_condenadas: string;
  com_sobrepreco: number;
  sobrepreco_total: string;
  risco_alto: number;
  maior_faturamento: string;
};

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number) => `${v.toFixed(0)}%`;

function riscoCor(label: string | null): string {
  if (label === "alto") return "hsl(var(--badge-danger-fg))";
  if (label === "medio") return "hsl(var(--accent))";
  return "hsl(var(--text-caption))";
}

export default async function MgFornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ recorte?: string }>;
}) {
  const sp = await searchParams;
  const recorte = (["faturamento", "condenadas", "sobrepreco"].includes(sp.recorte ?? "")
    ? sp.recorte
    : "faturamento") as Recorte;

  const { pago } = await getViewer();

  const [listRes, resumoRes] = await Promise.all([
    getMgFornecedoresPerfil(recorte),
    getMgFornecedoresResumo(),
  ]);

  if (listRes.error) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro ao carregar dados: {listRes.error.message}</p>
      </div>
    );
  }

  const rows = (listRes.data ?? []) as Row[];
  const resumo = resumoRes.data as Resumo | null;
  const visiveis = pago ? rows : rows.slice(0, FREE_LIMIT);

  return (
    <>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span>
            <span>Raio-X de fornecedores</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, lineHeight: 1.2 }}>
            Raio-X de fornecedores do Estado de Minas
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", margin: "0.625rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            As empresas que mais faturam com o Executivo mineiro, por <strong>CNPJ</strong>, cada uma com seu
            risco: cruzamos contratos, compras (SIAD), notas fiscais e pagamentos com a lista de empresas{" "}
            <strong>condenadas</strong> pela Lei Anticorrupção, o <strong>sobrepreço</strong> em licitação e a{" "}
            <strong>concentração por órgão</strong>.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {/* ── Lead ────────────────────────────────────────────────────────── */}
        {resumo && (
          <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
              <strong>{fmtNum(num(resumo.condenadas_faturando))} empresas condenadas</strong> pela Lei
              Anticorrupção (decisão transitada em julgado) seguem faturando com o Estado — juntas,{" "}
              <strong>{fmtCompact(num(resumo.pago_a_condenadas))}</strong> já saíram do caixa em pagamentos.
              Outras <strong>{fmtNum(num(resumo.com_sobrepreco))}</strong> fornecedoras tiveram itens
              homologados acima do preço de referência (sinal de sobrepreço a apurar).
            </p>
          </div>
        )}

        {/* ── KPIs ────────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Fornecedores mapeados" value={fmtNum(num(resumo?.fornecedores))} />
          <Kpi label="Condenadas que faturam" value={fmtNum(num(resumo?.condenadas_faturando))} />
          <Kpi label="Pago a condenadas" value={fmtCompact(num(resumo?.pago_a_condenadas))} />
          <Kpi label="Com sinal de sobrepreço" value={fmtNum(num(resumo?.com_sobrepreco))} />
        </div>

        {/* ── Recortes ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {(["faturamento", "condenadas", "sobrepreco"] as Recorte[]).map((r) => (
            <Link
              key={r}
              href={r === "faturamento" ? "/mg/fornecedores" : `/mg/fornecedores?recorte=${r}`}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                borderRadius: "4px",
                color: recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent",
                textDecoration: "none",
              }}
            >
              {RECORTE_LABEL[r]}
            </Link>
          ))}
        </div>

        {/* ── Tabela ──────────────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                <th>Fornecedor</th>
                <th>Órgão principal</th>
                <th style={{ textAlign: "right" }}>{recorte === "sobrepreco" ? "Sobrepreço" : recorte === "condenadas" ? "Pago" : "Faturado"}</th>
                <th style={{ textAlign: "center", width: "5rem" }}>Risco</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r, i) => {
                const conc = r.concentracao_orgao != null ? num(r.concentracao_orgao) : null;
                const valorCol =
                  recorte === "sobrepreco" ? num(r.sobrepreco_valor) : recorte === "condenadas" ? num(r.valor_pago_sancionado) : num(r.valor_faturado);
                return (
                  <tr key={`${r.cnpj_norm}-${i}`}>
                    <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      <span style={{ fontWeight: 600 }}>{r.fornecedor ?? "—"}</span>
                      <span style={{ display: "inline-flex", gap: "0.25rem", marginLeft: "0.5rem", flexWrap: "wrap" }}>
                        {r.condenada && <span className="badge-danger" style={{ fontSize: "0.625rem" }}>condenada</span>}
                        {!r.condenada && r.processada && <span style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", border: "1px solid hsl(var(--border))", borderRadius: "3px", padding: "0 0.25rem" }}>processada/arquivada</span>}
                        {num(r.sobrepreco_valor) > 0 && <span style={{ fontSize: "0.625rem", color: "hsl(var(--accent))", border: "1px solid hsl(var(--accent) / 0.4)", borderRadius: "3px", padding: "0 0.25rem" }}>sobrepreço</span>}
                        {r.terceirizada && <span style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", border: "1px solid hsl(var(--border))", borderRadius: "3px", padding: "0 0.25rem" }}>terceirizada</span>}
                        {r.organizacao_social && <span style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", border: "1px solid hsl(var(--border))", borderRadius: "3px", padding: "0 0.25rem" }}>org. social</span>}
                      </span>
                      <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>
                        {r.cnpj_fmt ?? r.cnpj_norm}
                        {" · "}contrato {fmtCompact(num(r.valor_contratado))} · SIAD {fmtCompact(num(r.valor_compras_siad))} · notas {fmtCompact(num(r.valor_notas))}
                        {r.condenada && r.conduta ? ` · ${r.conduta.slice(0, 48)}` : ""}
                      </div>
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>
                      {r.orgao_principal ? (
                        <>
                          {r.orgao_principal.slice(0, 32)}
                          {conc != null && (
                            <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>
                              {fmtPct(conc * 100)} do contratado{(r.n_orgaos ?? 0) > 1 ? ` · ${r.n_orgaos} órgãos` : ""}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: "hsl(var(--text-caption))" }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {valorCol > 0 ? fmtBRL(valorCol) : "—"}
                      {recorte === "sobrepreco" && (r.sobrepreco_itens ?? 0) > 0 && (
                        <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", fontWeight: 400 }}>{r.sobrepreco_itens} itens</div>
                      )}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.8125rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: riscoCor(r.risco_label) }}>
                        {r.risco_score ?? 0}
                      </span>
                      {r.risco_label && (
                        <div style={{ fontSize: "0.5625rem", textTransform: "uppercase", letterSpacing: "0.05em", color: riscoCor(r.risco_label) }}>{r.risco_label}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!pago && rows.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              titulo="Veja o scorecard completo dos fornecedores"
              descricao={`Mostrando os ${FREE_LIMIT} primeiros deste recorte. Crie uma conta gratuita para a lista completa, com faturamento, sanção e score de risco de cada empresa.`}
              next="/mg/fornecedores"
            />
          </div>
        )}

        {/* ── Como lemos o score ──────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginTop: "1.5rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
            Como lemos o score de risco (0–100)
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.7 }}>
            <li><strong>Condenada (+50)</strong> — decisão da CGE transitada em julgado pela Lei Anticorrupção. É o único fato duro; arquivadas/absolvidas <strong>não</strong> pontuam.</li>
            <li><strong>Sobrepreço (+15 a +30)</strong> — itens homologados acima do preço de referência do próprio processo. Sinal a apurar: a referência pode estar subestimada e o órgão é o homologador.</li>
            <li><strong>Concentração por órgão (+5 a +15)</strong> — dependência de um único órgão entre os contratos. É contexto, não irregularidade — comum em estatais e fornecedores especializados.</li>
          </ul>
        </div>

        {/* ── Metodologia ─────────────────────────────────────────────────── */}
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Portal de Dados Abertos do Estado de MG (CGE, SEPLAG, SEF), CC-BY-4.0 —
          Portal de Contratos, Compras (SIAD), Notas Fiscais, Despesa por Empenho, Consulta de Licitações e
          base de empresas sancionadas, cruzados por CNPJ (2022–2026).{" "}
          <strong>Faturado</strong> = o maior valor registrado em <em>um</em> dos sistemas (contrato, SIAD ou
          notas), não a soma dos três — eles se sobrepõem e somá-los seria dupla contagem.{" "}
          <strong>Condenada</strong> exclui decisões arquivadas/absolvidas. O <strong>score de risco e o
          sobrepreço são sinais a apurar, não acusação</strong>; só a condenação transitada em julgado é fato
          consolidado. Projeto independente, sem vínculo com o Governo de MG.{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>Correções e direito de resposta</Link>.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value">{value}</div>
    </div>
  );
}
