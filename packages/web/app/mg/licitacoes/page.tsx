/**
 * Sobrepreço em licitações (fora COVID) — Estado de MG.
 * Itens homologados acima do próprio preço de referência. Sinal de sobrepreço.
 * Órgão = homologador; fornecedor só quando o processo tem 1 fornecedor.
 * Rota: /mg/licitacoes
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgLicitacaoSobrepreco, getMgLicitacaoPorAno, getMgLicitacaoPorOrgao } from "~/services/mg";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sobrepreço em licitações — Estado de MG | The BR Insider",
  description:
    "Itens de licitação do Estado de Minas Gerais homologados acima do próprio preço de referência, entre 2022 e 2026. Ranking por valor e por órgão. Sinal de sobrepreço.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/licitacoes" },
  openGraph: { title: "Sobrepreço em licitações — Estado de MG | The BR Insider", description: "Itens de licitação do Estado de Minas Gerais homologados acima do próprio preço de referência, entre 2022 e 2026. Ranking por valor e por órgão. Sinal de sobrepreço.", url: "https://www.thebrinsider.com/mg/licitacoes", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Sobrepreço em licitações — Estado de MG | The BR Insider", description: "Itens de licitação do Estado de Minas Gerais homologados acima do próprio preço de referência, entre 2022 e 2026. Ranking por valor e por órgão. Sinal de sobrepreço." },
};

const FREE_LIMIT = 30;
const ANOS = [2026, 2025, 2024, 2023, 2022];

type Rel = {
  ano: number | null; orgao: string | null; fornecedor: string | null; item_descricao: string | null;
  numero_processo: string | null; vr_unit_referencia: string | null; vr_unit_homologado: string | null;
  sobrepreco_valor: string | null; sobrepreco_pct: string | null;
};
type Ano = { ano: number; n: number; total: string | null };
type Org = { orgao: string | null; n: number; total: string | null };

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number) => `${fmtNum(Math.round(v))}%`;

export default async function MgLicitacoesPage({ searchParams }: { searchParams: Promise<{ ano?: string }> }) {
  const sp = await searchParams;
  const anoSel = ANOS.includes(Number(sp.ano)) ? Number(sp.ano) : null;

  const { pago } = await getViewer();

  const [porAnoRes, porOrgaoRes, detalheRes] = await Promise.all([
    getMgLicitacaoPorAno(),
    getMgLicitacaoPorOrgao(),
    getMgLicitacaoSobrepreco(anoSel),
  ]);

  if (detalheRes.error) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {detalheRes.error.message}</p></div>);
  }
  const porAno = ((porAnoRes.data ?? []) as Ano[]).slice().sort((a, b) => a.ano - b.ano);
  const porOrgao = (porOrgaoRes.data ?? []) as Org[];
  const detalhe = (detalheRes.data ?? []) as Rel[];

  const totalGeral = porAno.reduce((s, r) => s + num(r.total), 0);
  const nItens = porAno.reduce((s, r) => s + (r.n ?? 0), 0);
  const visiveis = pago ? detalhe : detalhe.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Sobrepreço em licitações</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Sobrepreço em licitações do Estado de MG</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Itens de licitação <strong>homologados acima do próprio preço de referência</strong> do
            processo (2022–2026). A referência é, em regra, o teto estimado — adjudicar acima dela é
            sinal de sobrepreço a investigar. O órgão é o responsável pela homologação.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Sobrepreço total (2022–2026)" value={fmtCompact(totalGeral)} />
          <Kpi label="Itens acima da referência" value={fmtNum(nItens)} />
          <Kpi label="Maior órgão" value={fmtCompact(num(porOrgao[0]?.total))} />
        </div>

        {/* ── por ano ── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {porAno.map((a) => (
            <div key={a.ano} className="bloomberg-card" style={{ padding: "0.625rem 0.875rem", flex: "1 1 120px", minWidth: "110px" }}>
              <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{a.ano}{a.ano === 2026 ? " (parcial)" : ""}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtCompact(num(a.total))}</div>
              <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>{fmtNum(a.n)} itens</div>
            </div>
          ))}
        </div>

        {/* ── top órgãos ── */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Maiores órgãos por sobrepreço</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Órgão homologador</th><th style={{ textAlign: "center" }}>Itens</th><th style={{ textAlign: "right" }}>Sobrepreço</th></tr></thead>
            <tbody>
              {porOrgao.map((o, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{o.orgao ?? "—"}</td>
                  <td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(o.n)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "hsl(var(--badge-danger-fg))" }}>{fmtBRL(num(o.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── recorte por ano + detalhe ── */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Maiores itens com sobrepreço</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <Chip label="Todos" href="/mg/licitacoes" active={anoSel === null} />
          {ANOS.map((a) => <Chip key={a} label={`${a}`} href={`/mg/licitacoes?ano=${a}`} active={anoSel === a} />)}
        </div>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "3rem", textAlign: "center" }}>Ano</th><th>Órgão / Item</th><th>Fornecedor</th><th style={{ textAlign: "right" }}>Ref → Homol. (unit.)</th><th style={{ textAlign: "right" }}>Sobrepreço</th></tr></thead>
            <tbody>
              {visiveis.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{r.ano}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                    <div style={{ fontWeight: 600 }}>{(r.orgao ?? "—")}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{(r.item_descricao ?? "").slice(0, 70)}</div>
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>{r.fornecedor ?? <span style={{ color: "hsl(var(--text-caption))" }}>—</span>}</td>
                  <td style={{ textAlign: "right", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-body))" }}>
                    {fmtBRL(num(r.vr_unit_referencia))} → {fmtBRL(num(r.vr_unit_homologado))}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "hsl(var(--badge-danger-fg))" }}>
                    {fmtBRL(num(r.sobrepreco_valor))}<div style={{ fontSize: "0.625rem", fontWeight: 400, color: "hsl(var(--text-caption))" }}>+{fmtPct(num(r.sobrepreco_pct))}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pago && detalhe.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso titulo="Veja todos os itens com sobrepreço" descricao={`Mostrando os ${FREE_LIMIT} maiores. Crie uma conta gratuita para a lista completa e o filtro por órgão.`} next="/mg/licitacoes" />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> dataset "Consulta de Licitações MG" (sistema de compras estadual),
          itens em que o <em>valor unitário homologado</em> superou o <em>valor unitário de referência</em>
          do processo. Itens com sobrepreço acima de 1000% foram excluídos por indicarem provável erro de
          cadastro do preço de referência. O sobrepreço é um <strong>sinal a apurar</strong>, não prova de
          irregularidade — a referência pode ter sido subestimada, e em algumas modalidades não é teto
          rígido. O órgão é o responsável pela homologação; o fornecedor só é nomeado quando o processo tem
          um único fornecedor. Dados públicos (CC-BY-4.0). Projeto independente, sem vínculo com o Governo de MG.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
function Chip({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link href={href} style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: active ? 700 : 400,
      border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
      color: active ? "hsl(var(--primary))" : "hsl(var(--text-body))", backgroundColor: active ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none" }}>
      {label}
    </Link>
  );
}
