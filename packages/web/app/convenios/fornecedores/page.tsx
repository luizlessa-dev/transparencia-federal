/**
 * Scorecard de fornecedores federais de convênios × sancionados (CEIS/CNEP).
 * Cruza 614k convênios federais com a lista de empresas punidas.
 * Rota: /convenios/fornecedores
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getFornecedoresFederaisLista, getFornecedoresFederaisResumo } from "~/services/convenios";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conveniados sancionados — Governo Federal | The BR Insider",
  description:
    "Empresas e entidades que receberam convênios federais e constam na lista de sancionados (CEIS/CNEP). R$ 998 milhões em repasses a organizações punidas. Cruzamento de 614 mil convênios do Portal da Transparência com base de impedimentos.",
  alternates: { canonical: "https://www.thebrinsider.com/convenios/fornecedores" },
  openGraph: {
    title: "Conveniados sancionados — Governo Federal",
    description:
      "56 organizações sancionadas seguem recebendo convênios federais — R$ 998 milhões em repasses a entidades punidas pelo governo.",
    url: "https://www.thebrinsider.com/convenios/fornecedores",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Conveniados sancionados — Governo Federal | The BR Insider",
    description:
      "56 sancionados ativos recebendo convênios federais. R$ 998 milhões em repasses a entidades punidas.",
  },
};

const FREE_LIMIT = 30;

type Row = {
  cnpj: string | null;
  convenente_nome: string | null;
  qtd_convenios: number | null;
  valor_total: string | null;
  valor_liberado: string | null;
  primeiro_convenio: string | null;
  ultimo_convenio: string | null;
  ufs_distintas: number | null;
  orgaos_distintos: number | null;
  qtd_sancoes: number | null;
  sancoes_ativas: number | null;
  primeira_sancao: string | null;
  is_sancionado: boolean | null;
  is_sancionado_ativo: boolean | null;
};

type Recorte = "faturamento" | "sancionados";

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

const fmtCnpj = (v: string | null) => {
  if (!v || v.length !== 14) return v ?? "—";
  return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
};

const fmtAno = (v: string | null) => v?.slice(0, 4) ?? "—";

export default async function ConveniosFornecedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ recorte?: string }>;
}) {
  const sp = await searchParams;
  const recorte = (["faturamento", "sancionados"].includes(sp.recorte ?? "")
    ? sp.recorte
    : "faturamento") as Recorte;

  const { pago } = await getViewer();

  const [listRes, resumo] = await Promise.all([
    getFornecedoresFederaisLista(recorte),
    getFornecedoresFederaisResumo(),
  ]);

  const rows = (listRes.data ?? []) as Row[];
  const visiveis = pago ? rows : rows.slice(0, FREE_LIMIT);

  return (
    <>
      {/* ── Cabeçalho ──────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div
          className="container"
          style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              display: "flex",
              gap: "0.375rem",
            }}
          >
            <Link
              href="/"
              style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
            >
              Início
            </Link>
            <span>/</span>
            <span>Convênios federais</span>
            <span>/</span>
            <span>Scorecard conveniados</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, lineHeight: 1.2 }}>
            Conveniados sancionados — Governo Federal
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "hsl(var(--text-body))",
              margin: "0.625rem 0 0",
              maxWidth: "700px",
              lineHeight: 1.6,
            }}
          >
            Cruzamos <strong>614 mil convênios federais</strong> do Portal da Transparência com a
            lista de organizações{" "}
            <strong>sancionadas (CEIS/CNEP)</strong> pelo governo federal. O resultado: entidades
            punidas continuam recebendo repasses da União.
          </p>
        </div>
      </section>

      <div
        className="container"
        style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}
      >
        {/* ── Lead ───────────────────────────────────────────────────────────── */}
        <div
          className="bloomberg-card"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            borderLeft: "3px solid hsl(var(--badge-danger-fg))",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.9375rem",
              color: "hsl(var(--text-body))",
              lineHeight: 1.6,
            }}
          >
            <strong>{fmtNum(resumo.sancionadosAtivos)} organizações com sanção ativa</strong>{" "}
            constam ao mesmo tempo na lista de punidos do governo e como recebedoras de convênios
            federais — juntas, acumularam{" "}
            <strong>{fmtCompact(resumo.valorSancionados)}</strong> em repasses. No total,{" "}
            <strong>{fmtNum(resumo.total)}</strong> conveniados distintos foram mapeados, somando{" "}
            <strong>{fmtCompact(resumo.totalConvenios)}</strong> em valores de convênio.
          </p>
        </div>

        {/* ── KPIs ───────────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Conveniados mapeados" value={fmtNum(resumo.total)} />
          <Kpi label="Com sanção ativa" value={fmtNum(resumo.sancionadosAtivos)} />
          <Kpi
            label="Valor convênios com sancionados"
            value={fmtCompact(resumo.valorSancionados)}
          />
          <Kpi label="Total em convênios" value={fmtCompact(resumo.totalConvenios)} />
        </div>

        {/* ── Recortes ───────────────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.25rem",
            flexWrap: "wrap",
          }}
        >
          {(
            [
              ["faturamento", "Maior volume de convênios"],
              ["sancionados", "Sancionados ativos"],
            ] as [Recorte, string][]
          ).map(([r, label]) => (
            <Link
              key={r}
              href={
                r === "faturamento"
                  ? "/convenios/fornecedores"
                  : `/convenios/fornecedores?recorte=${r}`
              }
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                borderRadius: "4px",
                color:
                  recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor:
                  recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent",
                textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* ── Tabela ─────────────────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                <th>Conveniado</th>
                <th style={{ textAlign: "center" }}>Convênios</th>
                <th style={{ textAlign: "right" }}>Valor total</th>
                <th style={{ textAlign: "right" }}>Liberado</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r, i) => (
                <tr key={`${r.cnpj}-${i}`}>
                  <td
                    style={{
                      textAlign: "center",
                      color: "hsl(var(--text-caption))",
                      fontSize: "0.75rem",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1}
                  </td>
                  <td style={{ fontSize: "0.8125rem" }}>
                    <span style={{ fontWeight: 600, color: "hsl(var(--text-headline))" }}>
                      {r.convenente_nome ?? "—"}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        gap: "0.25rem",
                        marginLeft: "0.5rem",
                        flexWrap: "wrap",
                        verticalAlign: "middle",
                      }}
                    >
                      {r.is_sancionado_ativo && (
                        <span className="badge-danger" style={{ fontSize: "0.625rem" }}>
                          sancionado ativo
                        </span>
                      )}
                      {r.is_sancionado && !r.is_sancionado_ativo && (
                        <span
                          style={{
                            fontSize: "0.625rem",
                            color: "hsl(var(--text-caption))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "3px",
                            padding: "0 0.25rem",
                          }}
                        >
                          sancionado (encerrado)
                        </span>
                      )}
                    </span>
                    <div
                      style={{
                        fontSize: "0.625rem",
                        color: "hsl(var(--text-caption))",
                        marginTop: "0.125rem",
                      }}
                    >
                      {fmtCnpj(r.cnpj)}
                      {r.ufs_distintas != null && ` · ${r.ufs_distintas} UF${r.ufs_distintas !== 1 ? "s" : ""}`}
                      {r.orgaos_distintos != null &&
                        ` · ${r.orgaos_distintos} órgão${r.orgaos_distintos !== 1 ? "s" : ""}`}
                      {r.primeiro_convenio &&
                        ` · ${fmtAno(r.primeiro_convenio)}–${fmtAno(r.ultimo_convenio)}`}
                      {r.is_sancionado_ativo && r.primeira_sancao &&
                        ` · sancionado desde ${fmtAno(r.primeira_sancao)}`}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {fmtNum(num(r.qtd_convenios))}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "0.875rem",
                    }}
                  >
                    {num(r.valor_total) > 0 ? fmtBRL(num(r.valor_total)) : "—"}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "0.8125rem",
                      color: "hsl(var(--text-body))",
                    }}
                  >
                    {num(r.valor_liberado) > 0 ? fmtCompact(num(r.valor_liberado)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pago && rows.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              titulo="Veja o scorecard completo dos conveniados"
              descricao={`Mostrando os ${FREE_LIMIT} primeiros. Crie uma conta gratuita para ver todos os ${fmtNum(resumo.total)} conveniados mapeados, incluindo quais estão sancionados e o histórico de repasses.`}
              next="/convenios/fornecedores"
            />
          </div>
        )}

        {/* ── Metodologia ────────────────────────────────────────────────────── */}
        <div
          className="bloomberg-card"
          style={{ padding: "1rem 1.25rem", marginTop: "1.5rem" }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "hsl(var(--text-caption))",
              marginBottom: "0.5rem",
            }}
          >
            Nota metodológica
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1.1rem",
              fontSize: "0.8125rem",
              color: "hsl(var(--text-body))",
              lineHeight: 1.7,
            }}
          >
            <li>
              <strong>Sancionado ativo</strong> — CNPJ consta no CEIS ou CNEP com sanção vigente
              na data de atualização dos dados. Sanções encerradas são sinalizadas separadamente.
            </li>
            <li>
              <strong>Valor total</strong> — soma dos valores firmados nos convênios do Portal da
              Transparência (not o liquidado/pago, que é o "Liberado").
            </li>
            <li>
              <strong>Cruzamento por CNPJ</strong> — o conveniado pode ser município, estado,
              ONG ou empresa. A presença no CEIS/CNEP pode ser de uma unidade específica do ente.
              Verifique o CNPJ exato antes de publicar.
            </li>
          </ul>
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          <strong>Fontes:</strong> Portal da Transparência / CGU — download de convênios (snapshot
          jun/2026, 614 mil registros); CEIS e CNEP via Portal da Transparência. Cruzamento por CNPJ
          (14 dígitos). Atualização mensal. Projeto independente, sem vínculo com o Governo Federal.{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>
            Correções e direito de resposta
          </Link>
          .
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
