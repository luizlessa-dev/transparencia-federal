/**
 * Emendas federais executadas por MG (entrada de recursos).
 * Rastreio: quem indicou (autor/bancada/relator) → quanto → para qual órgão.
 * Lidera por VALOR INDICADO (valor da emenda). "Repassado" tem escopo mais
 * amplo (acumula no instrumento) → fica só em nota, sem gap.
 * Rota: /mg/emendas-federais
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Emendas federais em Minas Gerais: quem indicou e para onde foi | The BR Insider",
  description:
    "Rastreio das emendas parlamentares federais executadas pelo Estado de Minas Gerais: autor, valor indicado, objeto e órgão de destino. Emendas individuais, de bancada, de comissão e de relator.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/emendas-federais" },
  openGraph: { title: "Emendas federais em Minas Gerais: quem indicou e para onde foi | The BR Insider", description: "Rastreio das emendas parlamentares federais executadas pelo Estado de Minas Gerais: autor, valor indicado, objeto e órgão de destino. Emendas individuais, de bancada, de comissão e de relator.", url: "https://www.thebrinsider.com/mg/emendas-federais", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Emendas federais em Minas Gerais: quem indicou e para onde foi | The BR Insider", description: "Rastreio das emendas parlamentares federais executadas pelo Estado de Minas Gerais: autor, valor indicado, objeto e órgão de destino. Emendas individuais, de bancada, de comissão e de relator." },
};

const FREE_LIMIT = 40;

type Em = {
  modalidade: string | null; autoria: string | null; ano: number | null;
  valor_indicado: string | null; valor_repassado: string | null;
  objeto: string | null; funcao_governo: string | null; orgao_executor: string | null;
};

const num = (v: string | number | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const normOrg = (s: string | null) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();

export default async function MgEmendasFederaisPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const modSel = sp.m ?? null;

  const user = await getUser();
  const pago = user ? await hasPaidAccess(user.id) : false;

  const sb = getSupabase();
  const { data, error } = await sb
    .from("mg_emendas_federais")
    .select("modalidade,autoria,ano,valor_indicado,valor_repassado,objeto,funcao_governo,orgao_executor");

  if (error || !data) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  }
  const todas = data as Em[];
  const totalInd = todas.reduce((s, r) => s + num(r.valor_indicado), 0);
  const autores = new Set(todas.map((r) => r.autoria).filter(Boolean)).size;

  const agg = (key: (r: Em) => string) => {
    const m = new Map<string, { rotulo: string; n: number; ind: number }>();
    for (const r of todas) {
      const k = key(r) || "(não informado)";
      const a = m.get(k) ?? { rotulo: k, n: 0, ind: 0 };
      a.n++; a.ind += num(r.valor_indicado); m.set(k, a);
    }
    return [...m.values()].sort((a, b) => b.ind - a.ind);
  };
  const porModalidade = agg((r) => r.modalidade ?? "");
  const porAutor = agg((r) => r.autoria ?? "");
  const porOrgao = agg((r) => normOrg(r.orgao_executor));

  const modalidades = porModalidade.map((m) => m.rotulo).filter((m) => m !== "(não informado)");
  const detalhe = todas
    .filter((r) => !modSel || r.modalidade === modSel)
    .sort((a, b) => num(b.valor_indicado) - num(a.valor_indicado));
  const visiveis = pago ? detalhe : detalhe.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Emendas federais</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Emendas federais em MG: quem indicou e para onde foi</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Rastreio das <strong>emendas parlamentares federais</strong> executadas pelo Estado de Minas
            Gerais: autor, valor indicado, objeto e órgão de destino — emendas individuais, de bancada,
            de comissão e de relator (o "orçamento secreto").
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total indicado" value={fmtCompact(totalInd)} />
          <Kpi label="Emendas" value={fmtNum(todas.length)} />
          <Kpi label="Autores" value={fmtNum(autores)} />
          <Kpi label="Maior autor" value={fmtCompact(porAutor[0]?.ind ?? 0)} />
        </div>

        {/* ── modalidade + órgão lado a lado ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Por modalidade</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead><tr><th>Modalidade</th><th style={{ textAlign: "center" }}>Nº</th><th style={{ textAlign: "right" }}>Indicado</th></tr></thead>
                <tbody>
                  {porModalidade.map((m, i) => (
                    <tr key={i}><td style={{ fontSize: "0.8125rem" }}>{m.rotulo}</td><td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(m.n)}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtCompact(m.ind)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Maiores destinos (órgão)</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead><tr><th>Órgão executor</th><th style={{ textAlign: "right" }}>Indicado</th></tr></thead>
                <tbody>
                  {porOrgao.slice(0, 6).map((o, i) => (
                    <tr key={i}><td style={{ fontSize: "0.75rem" }}>{o.rotulo}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtCompact(o.ind)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── top autores ── */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Quem mais indicou recursos para MG</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "2.5rem", textAlign: "center" }}>#</th><th>Autor</th><th style={{ textAlign: "center" }}>Emendas</th><th style={{ textAlign: "right" }}>Indicado</th></tr></thead>
            <tbody>
              {porAutor.slice(0, 12).map((a, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", color: "hsl(var(--text-caption))", fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{a.rotulo}</td>
                  <td style={{ textAlign: "center", fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>{fmtNum(a.n)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(a.ind)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── detalhe com recorte por modalidade ── */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Emendas, uma a uma</h2>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <Chip label="Todas" href="/mg/emendas-federais" active={!modSel} />
          {modalidades.map((m) => <Chip key={m} label={m} href={`/mg/emendas-federais?m=${encodeURIComponent(m)}`} active={modSel === m} />)}
        </div>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "3rem", textAlign: "center" }}>Ano</th><th>Autor / Objeto</th><th>Destino</th><th style={{ textAlign: "right" }}>Indicado</th></tr></thead>
            <tbody>
              {visiveis.map((r, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{r.ano}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                    <div style={{ fontWeight: 600 }}>{r.autoria ?? "—"} <span style={{ fontWeight: 400, fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>· {r.modalidade}</span></div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{(r.objeto ?? "").slice(0, 72)}</div>
                  </td>
                  <td style={{ fontSize: "0.72rem", color: "hsl(var(--text-body))" }}>{r.orgao_executor ?? "—"}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(r.valor_indicado))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!pago && detalhe.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso titulo={`Veja todas as ${fmtNum(detalhe.length)} emendas`} descricao={`Mostrando as ${FREE_LIMIT} maiores. Crie uma conta gratuita para a lista completa e o filtro por modalidade.`} next="/mg/emendas-federais" />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> emendas parlamentares <em>federais</em> executadas pelo Estado de MG
          (entrada de recursos), dataset "Emendas Federais" do Portal de Dados Abertos de MG. O valor
          destacado é o <strong>valor indicado</strong> na emenda. O campo "valor repassado" da fonte tem
          escopo mais amplo (acumula transferências do instrumento, podendo exceder o indicado) e por isso
          <strong> não</strong> é apresentado como diferença/saldo aqui. "Autor" e "órgão executor" são os da
          base oficial. Dados públicos (CC-BY-4.0). Projeto independente, sem vínculo com o Governo de MG.
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
