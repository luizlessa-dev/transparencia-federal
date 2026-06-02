/**
 * Convênios de saída — Executivo de Minas Gerais.
 * Repasses do Estado a entidades (ONGs, associações, municípios). Lidera pelos
 * maiores; recortes por emenda parlamentar e por empresa sancionada.
 * Rota: /mg/convenios
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgConveniosCount, getMgConveniosComEmendaCount, getMgConveniosMaiores, getMgConveniosComEmenda, getMgConveniosSancionados } from "~/services/mg";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Convênios e repasses do Governo de Minas Gerais | The BR Insider",
  description:
    "Repasses do Executivo de MG a entidades por convênio: maiores valores, parcela de emenda parlamentar e cruzamento com empresas sancionadas.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/convenios" },
  openGraph: { title: "Convênios e repasses do Governo de Minas Gerais | The BR Insider", description: "Repasses do Executivo de MG a entidades por convênio: maiores valores, parcela de emenda parlamentar e cruzamento com empresas sancionadas.", url: "https://www.thebrinsider.com/mg/convenios", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Convênios e repasses do Governo de Minas Gerais | The BR Insider", description: "Repasses do Executivo de MG a entidades por convênio: maiores valores, parcela de emenda parlamentar e cruzamento com empresas sancionadas." },
};

const FREE_LIMIT = 20;
const TOPN = 200;

type Conv = {
  convenente: string | null; ano: number | null; orgao_id: string | null;
  vr_total: number | null; vr_emenda_parl: number | null;
};
type ConvSanc = { convenente: string | null; ano: number | null; vr_total: number | null; conduta: string | null; condenada: boolean | null };
type Recorte = "maiores" | "emenda" | "sancionadas";

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgConveniosPage({ searchParams }: { searchParams: Promise<{ recorte?: string }> }) {
  const sp = await searchParams;
  const recorte = (["maiores", "emenda", "sancionadas"].includes(sp.recorte ?? "") ? sp.recorte : "maiores") as Recorte;

  const { pago } = await getViewer();

  const [total, comEmenda, maiores, comEmendaRows, sancRows] = await Promise.all([
    getMgConveniosCount(),
    getMgConveniosComEmendaCount(),
    getMgConveniosMaiores(TOPN),
    getMgConveniosComEmenda(TOPN),
    getMgConveniosSancionados(),
  ]);

  const totalConv = total.count ?? 0;
  const nEmenda = comEmenda.count ?? 0;
  const linhasMaiores = (maiores.data ?? []) as Conv[];
  const linhasEmenda = (comEmendaRows.data ?? []) as Conv[];
  const sancionadas = ((sancRows.data ?? []) as ConvSanc[]).filter((r) => r.condenada === true);
  const maiorRepasse = linhasMaiores[0]?.vr_total ?? 0;

  const base = recorte === "emenda" ? linhasEmenda : linhasMaiores;
  const visiveis = pago ? base : base.slice(0, FREE_LIMIT);
  // Aba "empresa sancionada" = conteúdo pago (a contagem fica no KPI público).
  const sancVisiveis = pago ? sancionadas : [];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Convênios</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Convênios e repasses</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "660px" }}>
            Repasses do Estado a entidades por convênio. Destaque para os maiores valores, a
            parcela vinda de <strong>emenda parlamentar</strong> e fornecedores sancionados.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Convênios" value={fmtNum(totalConv)} />
          <Kpi label="Com emenda parlamentar" value={fmtNum(nEmenda)} />
          <Kpi label="Maior repasse" value={fmtBRL(maiorRepasse)} />
          <Kpi label="De empresa condenada" value={fmtNum(sancionadas.length)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {([["maiores", "Maiores repasses"], ["emenda", "Via emenda parlamentar"], ["sancionadas", "Empresa sancionada"]] as [Recorte, string][]).map(([r, label]) => (
            <Link key={r} href={r === "maiores" ? "/mg/convenios" : `/mg/convenios?recorte=${r}`}
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
              {recorte === "sancionadas" ? (
                <tr><th>Convenente</th><th style={{ textAlign: "right" }}>Ano</th><th style={{ textAlign: "right" }}>Repasse</th><th>Punição</th></tr>
              ) : (
                <tr><th>Convenente</th><th style={{ textAlign: "right" }}>Ano</th><th style={{ textAlign: "right" }}>Valor total</th><th style={{ textAlign: "right" }}>Emenda parl.</th></tr>
              )}
            </thead>
            <tbody>
              {recorte !== "sancionadas" && visiveis.map((c, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{c.convenente ?? "—"}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-caption))" }}>{c.ano ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(c.vr_total)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: (c.vr_emenda_parl ?? 0) > 0 ? "hsl(var(--accent))" : "hsl(var(--text-caption))" }}>{fmtBRL(c.vr_emenda_parl)}</td>
                </tr>
              ))}
              {recorte === "sancionadas" && sancVisiveis.map((s, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{s.convenente ?? "—"}</td>
                  <td style={{ textAlign: "right", color: "hsl(var(--text-caption))" }}>{s.ano ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(s.vr_total)}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>{s.conduta ?? "—"}</td>
                </tr>
              ))}
              {((recorte !== "sancionadas" && base.length === 0) || (recorte === "sancionadas" && pago && sancionadas.length === 0)) && (
                <tr><td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum registro neste recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {recorte !== "sancionadas" && !pago && base.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso titulo="Veja a lista completa de convênios" descricao={`Mostrando os ${FREE_LIMIT} maiores deste recorte.`} next="/mg/convenios" />
          </div>
        )}

        {recorte === "sancionadas" && !pago && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              tipo="pago"
              titulo="Convênios com empresas condenadas (plano pago)"
              descricao={`${fmtNum(sancionadas.length)} convênio(s) com convenente(s) condenado(s) pela Lei Anticorrupção. Assine para ver os nomes, os anos, os valores repassados e a conduta apurada.`}
              next="/mg/convenios?recorte=sancionadas"
            />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Portal de Transparência de MG, convênios de saída de recursos (CGE),
          histórico desde 2007. “Emenda parlamentar” é a parcela do convênio originada de emenda. O
          recorte “empresa sancionada” cruza o CNPJ do convenente com a lista de condenadas pela Lei
          Anticorrupção (CGE-MG). Valores são o total atual do convênio. Dados públicos (CC-BY-4.0).
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
