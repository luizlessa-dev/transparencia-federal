/**
 * Obras do DER-MG — Executivo de Minas Gerais.
 * Lidera por obras paradas (dias_paralisados > 0); recorte de empresa sancionada.
 * Rota: /mg/obras
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Obras do Estado de Minas Gerais — paradas e fornecedores | The BR Insider",
  description:
    "Contratos de obras do DER-MG: obras paralisadas, percentual de execução e cruzamento com empresas sancionadas. Dados do Portal de Transparência de MG.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/obras" },
  openGraph: { title: "Obras do Estado de Minas Gerais — paradas e fornecedores | The BR Insider", description: "Contratos de obras do DER-MG: obras paralisadas, percentual de execução e cruzamento com empresas sancionadas. Dados do Portal de Transparência de MG.", url: "https://www.thebrinsider.com/mg/obras", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Obras do Estado de Minas Gerais — paradas e fornecedores | The BR Insider", description: "Contratos de obras do DER-MG: obras paralisadas, percentual de execução e cruzamento com empresas sancionadas. Dados do Portal de Transparência de MG." },
};

const FREE_LIMIT = 20;

type Obra = {
  contrato: string | null;
  objeto: string | null;
  empresa: string | null;
  orgao: string | null;
  situacao: string | null;
  municipios: string | null;
  dias_paralisados: number | null;
  valor_total: number | null;
  total_medido: number | null;
  percentual_execucao: number | null;
  cnpj_norm: string | null;
};
type Sanc = {
  empresa: string | null; orgao: string | null; valor_total: number | null;
  situacao: string | null; dias_paralisados: number | null; conduta: string | null; condenada: boolean | null;
};
type Recorte = "paradas" | "sancionadas";

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtPct = (v: number | null) => (v == null ? "—" : `${Math.round(Number(v) * 100)}%`);
const truncar = (s: string | null, n: number) => (!s ? "—" : s.length > n ? s.slice(0, n).trimEnd() + "…" : s);

export default async function MgObrasPage({ searchParams }: { searchParams: Promise<{ recorte?: string }> }) {
  const sp = await searchParams;
  const recorte = (sp.recorte === "sancionadas" ? "sancionadas" : "paradas") as Recorte;

  const user = await getUser();
  const pago = user ? await hasPaidAccess(user.id) : false;

  const sb = getSupabase();
  const [{ data: obrasData }, { data: sancData }] = await Promise.all([
    sb.from("mg_obras").select("contrato,objeto,empresa,orgao,situacao,municipios,dias_paralisados,valor_total,total_medido,percentual_execucao,cnpj_norm"),
    sb.from("mg_obras_sancionadas").select("empresa,orgao,valor_total,situacao,dias_paralisados,conduta,condenada"),
  ]);

  const obras = (obrasData ?? []) as Obra[];
  const sancionadas = ((sancData ?? []) as Sanc[]).filter((r) => r.condenada === true);
  const paradas = obras.filter((o) => (o.dias_paralisados ?? 0) > 0).sort((a, b) => (Number(b.valor_total) || 0) - (Number(a.valor_total) || 0));
  const valorParado = paradas.reduce((s, o) => s + (Number(o.valor_total) || 0), 0);

  const linhasParadas = pago ? paradas : paradas.slice(0, FREE_LIMIT);
  // Aba "empresa sancionada" = conteúdo pago (a contagem fica no KPI público).
  const sancVisiveis = pago ? sancionadas : [];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Obras</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Obras do Estado — DER-MG</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "660px" }}>
            Contratos de obras do Departamento de Estradas de Rodagem. Foco em obras
            <strong> paralisadas</strong> e em fornecedores com sanção da Lei Anticorrupção.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Obras (contratos)" value={fmtNum(obras.length)} />
          <Kpi label="Obras paralisadas" value={fmtNum(paradas.length)} />
          <Kpi label="Valor em obras paradas" value={fmtBRL(valorParado)} />
          <Kpi label="De empresa condenada" value={fmtNum(sancionadas.length)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {([["paradas", "Paralisadas"], ["sancionadas", "Empresa sancionada"]] as [Recorte, string][]).map(([r, label]) => (
            <Link key={r} href={r === "paradas" ? "/mg/obras" : `/mg/obras?recorte=${r}`}
              style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
                color: recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none" }}>
              {label}
            </Link>
          ))}
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              {recorte === "paradas" ? (
                <tr><th>Empresa</th><th>Obra / Município</th><th style={{ textAlign: "right" }}>Valor</th><th style={{ textAlign: "right" }}>Dias parados</th><th style={{ textAlign: "right" }}>Execução</th></tr>
              ) : (
                <tr><th>Empresa</th><th>Órgão</th><th style={{ textAlign: "right" }}>Valor</th><th>Punição</th></tr>
              )}
            </thead>
            <tbody>
              {recorte === "paradas" && linhasParadas.map((o, i) => (
                <tr key={`${o.contrato}-${i}`}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{o.empresa ?? "—"}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                    <div>{truncar(o.objeto, 70)}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{o.municipios}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(o.valor_total)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--badge-danger-fg))", fontWeight: 600 }}>{fmtNum(o.dias_paralisados ?? 0)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-body))" }}>{fmtPct(o.percentual_execucao)}</td>
                </tr>
              ))}
              {recorte === "sancionadas" && sancVisiveis.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{s.empresa ?? "—"}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>{s.orgao ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(s.valor_total)}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>{s.conduta ?? "—"}</td>
                </tr>
              ))}
              {((recorte === "paradas" && paradas.length === 0) || (recorte === "sancionadas" && pago && sancionadas.length === 0)) && (
                <tr><td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum registro neste recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {recorte === "paradas" && !pago && paradas.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso titulo={`Veja todas as ${fmtNum(paradas.length)} obras paralisadas`} descricao={`Mostrando as ${FREE_LIMIT} de maior valor.`} next="/mg/obras" />
          </div>
        )}

        {recorte === "sancionadas" && !pago && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              tipo="pago"
              titulo="Obras de empresas condenadas (plano pago)"
              descricao={`${fmtNum(sancionadas.length)} obra(s) de empresa(s) condenada(s) pela Lei Anticorrupção. Assine para ver as empresas, os órgãos contratantes, os valores e a conduta apurada.`}
              next="/mg/obras?recorte=sancionadas"
            />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Portal de Transparência de MG, contratos de obras do DER-MG.
          “Paralisada” = contrato com dias paralisados &gt; 0. “Execução” = percentual medido sobre o
          contrato. O recorte “empresa sancionada” cruza o CNPJ do contratado com a lista de empresas
          condenadas pela Lei Anticorrupção (CGE-MG), excluindo arquivados. Dados públicos (CC-BY-4.0).
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
