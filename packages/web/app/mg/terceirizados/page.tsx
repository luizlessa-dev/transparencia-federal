/**
 * Terceirizados — Executivo de MG (agregado por empresa/órgão; sem nomes).
 * Quantos terceirizados cada empresa mantém em cada órgão; recorte de sancionadas.
 * Rota: /mg/terceirizados
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terceirizados do Governo de Minas Gerais por empresa | The BR Insider",
  description:
    "Quantos trabalhadores terceirizados cada empresa mantém em cada órgão do Executivo de MG, e quais fornecedoras são sancionadas. Agregado, sem dados pessoais.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/terceirizados" },
};

const FREE_LIMIT = 20;

type Terc = { empresa: string | null; cnpj_norm: string | null; orgao: string | null; mes_referencia: string | null; qtd_trabalhadores: number | null };
type Sanc = Terc & { conduta: string | null; condenada: boolean | null };
type Recorte = "empresas" | "sancionadas";

const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgTerceirizadosPage({ searchParams }: { searchParams: Promise<{ recorte?: string }> }) {
  const sp = await searchParams;
  const recorte = (sp.recorte === "sancionadas" ? "sancionadas" : "empresas") as Recorte;

  const user = await getUser();
  const pago = user ? await hasPaidAccess(user.id) : false;

  const sb = getSupabase();
  const [{ data: tData }, { data: sData }] = await Promise.all([
    sb.from("mg_terceirizados").select("empresa,cnpj_norm,orgao,mes_referencia,qtd_trabalhadores"),
    sb.from("mg_terceirizados_sancionados").select("empresa,cnpj_norm,orgao,mes_referencia,qtd_trabalhadores,conduta,condenada"),
  ]);

  const todos = ((tData ?? []) as Terc[]).sort((a, b) => (Number(b.qtd_trabalhadores) || 0) - (Number(a.qtd_trabalhadores) || 0));
  const sancionadas = ((sData ?? []) as Sanc[]).filter((r) => r.condenada === true);
  const empresas = new Set(todos.map((t) => t.cnpj_norm)).size;
  const orgaos = new Set(todos.map((t) => t.orgao)).size;
  const ultimoMes = todos.map((t) => t.mes_referencia).filter(Boolean).sort().slice(-1)[0] ?? null;
  const totalUltimoMes = todos.filter((t) => t.mes_referencia === ultimoMes).reduce((s, t) => s + (Number(t.qtd_trabalhadores) || 0), 0);

  const base = recorte === "sancionadas" ? sancionadas : todos;
  // Aba "empresa sancionada" = conteúdo pago: sem prévia (a contagem fica no KPI).
  const visiveis = pago ? base : recorte === "sancionadas" ? [] : base.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Terceirizados</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Terceirizados por empresa</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "640px" }}>
            Quantos trabalhadores terceirizados cada empresa mantém em cada órgão do Estado. Dados
            agregados por empresa, sem identificar trabalhadores.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Empresas fornecedoras" value={fmtNum(empresas)} />
          <Kpi label="Órgãos atendidos" value={fmtNum(orgaos)} />
          <Kpi label="Terceirizados (último mês)" value={fmtNum(totalUltimoMes)} />
          <Kpi label="Empresa condenada" value={fmtNum(new Set(sancionadas.map((s) => s.cnpj_norm)).size)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {([["empresas", "Por empresa"], ["sancionadas", "Empresa sancionada"]] as [Recorte, string][]).map(([r, label]) => (
            <Link key={r} href={r === "empresas" ? "/mg/terceirizados" : `/mg/terceirizados?recorte=${r}`}
              style={{ padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
                color: recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none" }}>{label}</Link>
          ))}
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Empresa</th><th>Órgão</th><th style={{ textAlign: "right" }}>Mês</th><th style={{ textAlign: "right" }}>Terceirizados</th>{recorte === "sancionadas" && <th>Punição</th>}</tr></thead>
            <tbody>
              {visiveis.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{t.empresa ?? "—"}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>{t.orgao ?? "—"}</td>
                  <td style={{ textAlign: "right", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{t.mes_referencia ? String(t.mes_referencia).slice(0, 7) : "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtNum(Number(t.qtd_trabalhadores) || 0)}</td>
                  {recorte === "sancionadas" && <td style={{ fontSize: "0.72rem", color: "hsl(var(--text-body))" }}>{(t as Sanc).conduta ?? "—"}</td>}
                </tr>
              ))}
              {base.length === 0 && (pago || recorte !== "sancionadas") && <tr><td colSpan={recorte === "sancionadas" ? 5 : 4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum registro neste recorte.</td></tr>}
            </tbody>
          </table>
        </div>

        {recorte === "empresas" && !pago && base.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}><ParedeDeAcesso titulo="Veja todas as empresas" descricao={`Mostrando as ${FREE_LIMIT} maiores por nº de terceirizados.`} next="/mg/terceirizados" /></div>
        )}

        {recorte === "sancionadas" && !pago && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              tipo="pago"
              titulo="Terceirizados de empresas condenadas (plano pago)"
              descricao={`${fmtNum(new Set(sancionadas.map((s) => s.cnpj_norm)).size)} empresa(s) condenada(s) pela Lei Anticorrupção fornecendo mão de obra ao Estado. Assine para ver os nomes, os órgãos e a conduta apurada.`}
              next="/mg/terceirizados?recorte=sancionadas"
            />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> lista de terceirizados do Estado (SEPLAG), <strong>agregada por
          empresa, órgão e mês</strong>. Não armazenamos nem exibimos nomes de trabalhadores (LGPD; sem
          interesse público nominal). O recorte “empresa sancionada” cruza o CNPJ da contratada com a
          lista de condenadas pela Lei Anticorrupção. Dados públicos (CC-BY-4.0).
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
