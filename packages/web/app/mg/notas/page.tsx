/**
 * Notas fiscais por fornecedor — Estado de MG.
 * Quem mais emitiu nota fiscal pro Estado (2022–2026), com flag de condenação.
 * Rota: /mg/notas
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Notas fiscais por fornecedor — Governo de MG | The BR Insider",
  description:
    "Quem mais emitiu notas fiscais para o Estado de Minas Gerais (2022–2026), por CNPJ, com sinalização de empresas condenadas pela Lei Anticorrupção.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/notas" },
  openGraph: { title: "Notas fiscais por fornecedor — Governo de MG", description: "Quem mais emitiu notas fiscais ao Estado de MG (2022–2026), por CNPJ, com flag de condenadas.", url: "https://www.thebrinsider.com/mg/notas", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

const FREE_LIMIT = 30;
type Row = { cnpj_norm: string | null; nome: string | null; valor_total: string | null; n_notas: number | null };
type Sanc = { cnpj_norm: string | null; decisao: string | null; conduta: string | null };
const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const cond = (d: string | null) => !!d && !/arquiv/i.test(d) && !/absolv/i.test(d);

export default async function MgNotasPage() {
  const { pago } = await getViewer();
  const sb = getSupabase();
  const [resumoRes, topRes, sancRes] = await Promise.all([
    sb.from("mg_notas_resumo").select("total,fornecedores,notas").maybeSingle(),
    sb.from("mg_notas_fornecedor_total").select("cnpj_norm,nome,valor_total,n_notas").order("valor_total", { ascending: false }).limit(150),
    sb.from("mg_empresas_sancionadas").select("cnpj_norm,decisao,conduta"),
  ]);
  if (topRes.error) return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {topRes.error.message}</p></div>);
  const resumo = resumoRes.data as { total: string; fornecedores: number; notas: number } | null;
  const sancMap = new Map<string, Sanc>(); for (const s of (sancRes.data ?? []) as Sanc[]) if (s.cnpj_norm) sancMap.set(s.cnpj_norm, s);
  const top = (topRes.data ?? []) as Row[];
  const visiveis = pago ? top : top.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Notas fiscais</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Quem mais emite nota fiscal pro Estado de MG</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "680px", lineHeight: 1.6 }}>
            Fornecedores por <strong>valor faturado em notas fiscais</strong> recebidas pelo Estado
            (2022–2026), por CNPJ. Empresas <strong>condenadas</strong> pela Lei Anticorrupção vêm marcadas.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Faturado em notas (2022–26)" value={fmtCompact(num(resumo?.total))} />
          <Kpi label="Fornecedores" value={fmtNum(num(resumo?.fornecedores))} />
          <Kpi label="Notas fiscais" value={fmtNum(num(resumo?.notas))} />
        </div>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Fornecedor</th><th style={{ textAlign: "center" }}>Notas</th><th style={{ textAlign: "right" }}>Faturado</th></tr></thead>
            <tbody>
              {visiveis.map((r, i) => {
                const s = r.cnpj_norm ? sancMap.get(r.cnpj_norm) : undefined;
                const condenada = cond(s?.decisao ?? null);
                return (
                  <tr key={i}>
                    <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      {r.nome ?? "—"}{condenada && <span className="badge-danger" style={{ fontSize: "0.625rem", marginLeft: "0.5rem" }}>condenada</span>}
                      <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>{r.cnpj_norm}{condenada ? ` · ${(s?.conduta ?? "").slice(0, 40)}` : ""}</div>
                    </td>
                    <td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(r.n_notas ?? 0)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(r.valor_total))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!pago && top.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}><ParedeDeAcesso titulo="Veja os 150 maiores fornecedores" descricao={`Mostrando os ${FREE_LIMIT} maiores. Crie uma conta gratuita para a lista completa.`} next="/mg/notas" /></div>
        )}
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Notas Fiscais (SEF-MG), Portal de Dados Abertos, CC-BY-4.0. Somatório do
          valor com impostos das notas recebidas pelos órgãos do Estado, por CNPJ do emitente, 2022–2026.
          "Condenada" = decisão da CGE transitada em julgado (exclui arquivadas). Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
