/**
 * Emendas ao orçamento ESTADUAL de MG (LOA).
 * Quem emenda (deputado/bancada/comissão) → quanto → para qual órgão/objeto.
 * Rota: /mg/emendas-estaduais
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Emendas ao orçamento estadual de Minas Gerais: quem mais emenda | The BR Insider",
  description:
    "Emendas dos deputados estaduais ao orçamento de Minas Gerais (LOA): autor, valor e objeto. Ranking por autor e maiores emendas individuais.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/emendas-estaduais" },
  openGraph: { title: "Emendas ao orçamento estadual de MG: quem mais emenda", description: "Autor, valor e objeto das emendas estaduais à LOA de Minas Gerais.", url: "https://www.thebrinsider.com/mg/emendas-estaduais", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

const FREE_LIMIT = 40;
type Autor = { autor: string; n: number; total: string | null };
type Em = { autor: string | null; ano: number | null; objeto: string | null; uo_beneficiada: string | null; vr_emenda: string | null };
const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgEmendasEstaduaisPage() {
  const { pago } = await getViewer();
  const sb = getSupabase();
  const [resumoRes, autoresRes, maioresRes] = await Promise.all([
    sb.from("mg_emendas_estaduais_resumo").select("total,emendas,autores").maybeSingle(),
    sb.from("mg_emendas_estaduais_por_autor").select("autor,n,total").order("total", { ascending: false }).limit(120),
    sb.from("mg_emendas_estaduais").select("autor,ano,objeto,uo_beneficiada,vr_emenda").order("vr_emenda", { ascending: false }).limit(60),
  ]);
  if (autoresRes.error) return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {autoresRes.error.message}</p></div>);
  const resumo = resumoRes.data as { total: string; emendas: number; autores: number } | null;
  const autores = (autoresRes.data ?? []) as Autor[];
  const maiores = (maioresRes.data ?? []) as Em[];
  const visiveis = pago ? autores : autores.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Emendas estaduais</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Emendas ao orçamento estadual: quem mais emenda</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Emendas dos <strong>deputados estaduais</strong> (e comissões/blocos) à Lei Orçamentária de
            Minas Gerais: autor, valor e objeto. Ranking por autor e maiores emendas.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total emendado" value={fmtCompact(num(resumo?.total))} />
          <Kpi label="Emendas" value={fmtNum(num(resumo?.emendas))} />
          <Kpi label="Autores" value={fmtNum(num(resumo?.autores))} />
        </div>

        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Ranking por autor</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Autor</th><th style={{ textAlign: "center" }}>Emendas</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
            <tbody>
              {visiveis.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{r.autor}</td>
                  <td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(r.n)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(r.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!pago && autores.length > FREE_LIMIT && (
          <div style={{ marginBottom: "1.5rem" }}><ParedeDeAcesso titulo="Veja todos os autores" descricao={`Mostrando os ${FREE_LIMIT} maiores. Crie uma conta gratuita para a lista completa.`} next="/mg/emendas-estaduais" /></div>
        )}

        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Maiores emendas individuais</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "3rem", textAlign: "center" }}>Ano</th><th>Autor / Objeto</th><th>Órgão</th><th style={{ textAlign: "right" }}>Valor</th></tr></thead>
            <tbody>
              {maiores.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{r.ano}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}><div style={{ fontWeight: 600 }}>{r.autor ?? "—"}</div><div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{(r.objeto ?? "").slice(0, 70)}</div></td>
                  <td style={{ fontSize: "0.72rem", color: "hsl(var(--text-body))" }}>{r.uo_beneficiada ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(r.vr_emenda))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Proposta Orçamentária e Alteração Orçamentária (CGE-MG), Portal de Dados
          Abertos, CC-BY-4.0. Valor por emenda (maior valor registrado por emenda). Autores incluem
          deputados, comissões e blocos. ~45% das emendas não têm objeto/órgão detalhado na fonte. Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
