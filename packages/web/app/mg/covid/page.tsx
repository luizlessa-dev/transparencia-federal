/**
 * Compras emergenciais COVID-19 — Executivo de MG.
 * Lidera por sobrepreço (unitário homologado acima do de referência); recorte
 * de fornecedor sancionado. Rota: /mg/covid
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compras emergenciais da COVID-19 em Minas Gerais | The BR Insider",
  description:
    "Compras de pandemia do governo de MG homologadas acima do preço de referência, por dispensa de licitação, e fornecedores sancionados.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/covid" },
};

const FREE_LIMIT = 20;

type Sob = {
  contratado: string | null; orgao_demandante: string | null; objeto: string | null; item: string | null;
  procedimento: string | null; quantidade: number | null; valor_ref_unit: number | null;
  valor_hom_unit: number | null; valor_homologado: number | null; sobrepreco_pct: number | null;
};
type Sanc = { contratado: string | null; orgao_demandante: string | null; valor_homologado: number | null; conduta: string | null; condenada: boolean | null };
type Recorte = "sobrepreco" | "sancionadas";

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(Number(v));
}
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const truncar = (s: string | null, n: number) => (!s ? "—" : s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

export default async function MgCovidPage({ searchParams }: { searchParams: Promise<{ recorte?: string }> }) {
  const sp = await searchParams;
  const recorte = (sp.recorte === "sancionadas" ? "sancionadas" : "sobrepreco") as Recorte;

  const user = await getUser();
  const pago = user ? await hasPaidAccess(user.id) : false;

  const sb = getSupabase();
  const [totalItens, { data: sobData }, { data: sancData }] = await Promise.all([
    sb.from("mg_covid_compras").select("*", { count: "exact", head: true }),
    sb.from("mg_covid_sobrepreco").select("contratado,orgao_demandante,objeto,item,procedimento,quantidade,valor_ref_unit,valor_hom_unit,valor_homologado,sobrepreco_pct").limit(500),
    sb.from("mg_covid_sancionados").select("contratado,orgao_demandante,valor_homologado,conduta,condenada"),
  ]);

  const sobre = (sobData ?? []) as Sob[];
  const sancionadas = ((sancData ?? []) as Sanc[]).filter((r) => r.condenada === true);
  const maiorPct = sobre.reduce((m, r) => Math.max(m, Number(r.sobrepreco_pct) || 0), 0);
  const base = sobre;
  const visiveis = pago ? base : base.slice(0, FREE_LIMIT);
  // Aba "empresa sancionada" = conteúdo pago (a contagem fica no KPI público).
  const sancVisiveis = pago ? sancionadas : [];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>COVID-19</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Compras emergenciais da COVID-19</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "660px" }}>
            Compras de pandemia, em geral por <strong>dispensa de licitação</strong>, com destaque
            para itens homologados <strong>acima do preço de referência</strong>.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Itens de compra" value={fmtNum(totalItens.count ?? 0)} />
          <Kpi label="Acima da referência" value={fmtNum(sobre.length)} />
          <Kpi label="Maior sobrepreço" value={`${Math.round(maiorPct)}%`} />
          <Kpi label="De empresa condenada" value={fmtNum(sancionadas.length)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {([["sobrepreco", "Sobrepreço"], ["sancionadas", "Empresa sancionada"]] as [Recorte, string][]).map(([r, label]) => (
            <Link key={r} href={r === "sobrepreco" ? "/mg/covid" : `/mg/covid?recorte=${r}`}
              style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
                color: recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            {recorte === "sobrepreco" ? (
              <>
                <thead><tr><th>Fornecedor</th><th>Item / Órgão</th><th style={{ textAlign: "right" }}>Referência</th><th style={{ textAlign: "right" }}>Homologado</th><th style={{ textAlign: "right" }}>Sobrepreço</th></tr></thead>
                <tbody>
                  {visiveis.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{r.contratado ?? "—"}</td>
                      <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}><div>{truncar(r.item, 60)}</div><div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{r.orgao_demandante}</div></td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-caption))" }}>{fmtBRL(r.valor_ref_unit)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{fmtBRL(r.valor_hom_unit)}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "hsl(var(--badge-danger-fg))" }}>+{Math.round(Number(r.sobrepreco_pct) || 0)}%</td>
                    </tr>
                  ))}
                  {base.length === 0 && <tr><td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum item acima da referência.</td></tr>}
                </tbody>
              </>
            ) : (
              <>
                <thead><tr><th>Fornecedor</th><th>Órgão</th><th style={{ textAlign: "right" }}>Homologado</th><th>Punição</th></tr></thead>
                <tbody>
                  {sancVisiveis.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{r.contratado ?? "—"}</td>
                      <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>{r.orgao_demandante ?? "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(r.valor_homologado)}</td>
                      <td style={{ fontSize: "0.72rem", color: "hsl(var(--text-body))" }}>{r.conduta ?? "—"}</td>
                    </tr>
                  ))}
                  {pago && sancionadas.length === 0 && <tr><td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum fornecedor condenado nas compras COVID.</td></tr>}
                </tbody>
              </>
            )}
          </table>
        </div>

        {recorte === "sobrepreco" && !pago && base.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}><ParedeDeAcesso titulo={`Veja todos os ${fmtNum(base.length)} itens com sobrepreço`} descricao={`Mostrando os ${FREE_LIMIT} de maior impacto.`} next="/mg/covid" /></div>
        )}

        {recorte === "sancionadas" && !pago && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              tipo="pago"
              titulo="Fornecedores COVID condenados (plano pago)"
              descricao={`${fmtNum(sancionadas.length)} fornecedor(es) condenado(s) pela Lei Anticorrupção nas compras de pandemia. Assine para ver os nomes, os órgãos, os valores homologados e a conduta apurada.`}
              next="/mg/covid?recorte=sancionadas"
            />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> compras emergenciais de COVID-19 (CGE-MG). “Sobrepreço” = preço
          unitário homologado acima do preço unitário de referência informado no próprio processo.
          Em emergência, comprar acima da referência não é por si só ilegal, mas o padrão e a dispensa
          de licitação merecem escrutínio. O recorte “empresa sancionada” cruza o CNPJ com a lista de
          condenadas pela Lei Anticorrupção. Dados públicos (CC-BY-4.0).
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
