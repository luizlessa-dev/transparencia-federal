/**
 * Caso Galo Forte — o FIP que controla parte da SAF do Atlético-MG.
 * Dado 100% aberto da CVM (informe de FIP): trajetória de patrimônio, capital
 * integralizado e estrutura de cotistas POR TIPO. A identidade nominal do
 * cotista é confidencial na fonte; a cadeia de fundos acima (Olaf 95 / Hans 95)
 * e o nome do investidor vêm de apuração pública (PF/imprensa) — camada
 * editorial, claramente separada do dado.
 * Rota: /mercado-de-capitais/galo-forte
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCvmGaloForteHistorico } from "~/services/cvm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "O FIP Galo Forte e a SAF do Atlético-MG — os números da CVM | The BR Insider",
  description:
    "O que os dados abertos da CVM mostram sobre o FIP Galo Forte: o patrimônio saltou de R$ 100 mi (2023) para R$ 300 mi (2025), com um único cotista pessoa física detendo 100% das cotas. Fundo controla 26,88% da SAF do Atlético-MG.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais/galo-forte" },
  openGraph: {
    title: "O FIP Galo Forte e a SAF do Atlético-MG — os números da CVM",
    description: "Patrimônio de R$ 100 mi (2023) → R$ 300 mi (2025), um único cotista pessoa física com 100% das cotas. Dados abertos da CVM.",
    url: "https://www.thebrinsider.com/mercado-de-capitais/galo-forte",
    siteName: "The BR Insider",
    type: "article",
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: "O FIP Galo Forte e a SAF do Atlético-MG — os números da CVM", description: "R$ 100 mi → R$ 300 mi em dois anos, um único cotista pessoa física. Dados abertos da CVM." },
};

type Informe = {
  dt_comptc: string;
  vl_patrim_liq: number | null;
  vl_cap_integr: number | null;
  nr_cotst: number | null;
  pr_pf: number | null;
};

const fmtBRL = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v)) ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
const fmtMi = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v)) ? "—" : `R$ ${(Number(v) / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
const fmtData = (iso: string) => {
  const [a, m] = iso.split("-");
  const meses = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m)]}/${a}`;
};

export default async function GaloFortePage() {
  const { data, error } = await getCvmGaloForteHistorico();

  const informes = ((data ?? []) as Informe[]).filter((r) => r.vl_patrim_liq != null);
  // Uma linha por competência (a fonte traz classes; pegamos o maior PL do mês).
  const porMes = new Map<string, Informe>();
  for (const r of informes) {
    const ex = porMes.get(r.dt_comptc);
    if (!ex || (Number(r.vl_patrim_liq) > Number(ex.vl_patrim_liq))) porMes.set(r.dt_comptc, r);
  }
  const serie = [...porMes.values()].sort((a, b) => a.dt_comptc.localeCompare(b.dt_comptc));
  const primeiro = serie[0];
  const ultimo = serie[serie.length - 1];
  const capMax = Math.max(0, ...serie.map((r) => Number(r.vl_cap_integr) || 0));
  const cotistasUlt = ultimo?.nr_cotst ?? null;
  const pfUlt = ultimo?.pr_pf ?? null;

  if (error || serie.length === 0) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>Dados do informe ainda não disponíveis{error ? `: ${error.message}` : ""}.</p>
      </div>
    );
  }

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mercado-de-capitais" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Mercado de Capitais</Link>
            <span>/</span>
            <span>Galo Forte</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.25 }}>
            O FIP Galo Forte e a SAF do Atlético-MG
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "680px" }}>
            O que os <strong>dados abertos da CVM</strong> mostram sobre o fundo que aportou
            recursos na Sociedade Anônima do Futebol do Atlético Mineiro — sem inferência, só
            o que está nos informes oficiais do FIP.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {/* Lead factual */}
        <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--primary))" }}>
          <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
            Entre <strong>{fmtData(primeiro.dt_comptc)}</strong> e <strong>{fmtData(ultimo.dt_comptc)}</strong>,
            o capital integralizado no <strong>Galo Forte FIP Multiestratégia</strong> (CNPJ
            51.856.050/0001-06) saiu de <strong>{fmtMi(primeiro.vl_cap_integr ?? primeiro.vl_patrim_liq)}</strong> para{" "}
            <strong>{fmtMi(capMax)}</strong>.
            {cotistasUlt === 1 && pfUlt === 100 && (
              <> Na última competência, o fundo tinha <strong>um único cotista, pessoa física</strong>, detentor de 100% das cotas.</>
            )}
          </p>
        </div>

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Patrimônio líquido (último)" value={fmtMi(ultimo.vl_patrim_liq)} />
          <Kpi label="Capital integralizado (máx.)" value={fmtMi(capMax)} />
          <Kpi label="Cotistas (último informe)" value={cotistasUlt != null ? String(cotistasUlt) : "—"} />
          <Kpi label="% pessoa física" value={pfUlt != null ? `${pfUlt.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%` : "—"} />
        </div>

        {/* Trajetória */}
        <h2 style={{ fontSize: "1.0625rem", margin: "0 0 0.75rem" }}>Trajetória do patrimônio</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Competência</th>
                <th style={{ textAlign: "right" }}>Patrimônio líquido</th>
                <th style={{ textAlign: "right" }}>Capital integralizado</th>
                <th style={{ textAlign: "right" }}>Cotistas</th>
                <th style={{ textAlign: "right" }}>% PF</th>
              </tr>
            </thead>
            <tbody>
              {serie.map((r) => (
                <tr key={r.dt_comptc}>
                  <td style={{ fontWeight: 600 }}>{fmtData(r.dt_comptc)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "hsl(var(--text-headline))" }}>{fmtBRL(r.vl_patrim_liq)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(r.vl_cap_integr)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.nr_cotst ?? "—"}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.pr_pf != null ? `${r.pr_pf.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* O que o dado mostra e o que NÃO mostra */}
        <div className="bloomberg-card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.0625rem", margin: "0 0 0.625rem" }}>O que o dado da CVM mostra — e o que não mostra</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.7 }}>
            <li><strong>Mostra:</strong> patrimônio, capital comprometido/integralizado, número de cotistas e a distribuição das cotas <em>por tipo de investidor</em> (pessoa física, PJ, banco, fundo de pensão…). É o informe periódico oficial do FIP.</li>
            <li><strong>Não mostra:</strong> o <strong>nome</strong> do cotista — a identidade nominal de cotista de FIP é confidencial nos dados abertos. Também não há, em dado aberto, a cadeia de fundos acima do Galo Forte: FIPs não declaram composição de carteira como os fundos abertos (universo 555).</li>
          </ul>
        </div>

        {/* Contexto sourced — claramente separado */}
        <div className="bloomberg-card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--text-caption))" }}>
          <h2 style={{ fontSize: "1.0625rem", margin: "0 0 0.625rem" }}>Contexto público (apuração externa)</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.7 }}>
            Segundo noticiário e investigações da Polícia Federal, o Galo Forte foi o veículo
            usado pelo banqueiro Daniel Vorcaro (Banco Master) para aportar R$ 300 milhões e
            ficar com 26,88% da Galo Holding S.A., controladora da SAF do Atlético-MG; a apuração
            aponta uma cadeia de fundos (Olaf 95 / Hans 95) acima do Galo Forte, ligada à Reag e
            alvo da Operação Carbono Oculto. Em 2025, o clube aprovou novo aporte que diluiu a
            fatia do fundo. <strong>Essas informações são de fontes externas</strong> (imprensa e
            autoridades), não dos dados abertos da CVM, e são reproduzidas aqui como contexto —
            não como conclusão do The BR Insider.
          </p>
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> dados do <em>Informe Trimestral/Quadrimestral de FIP</em> da
          CVM (Portal de Dados Abertos, licença ODbL), competências de 2023 a 2026, filtrados pelo
          CNPJ 51.856.050/0001-06. Quando há mais de uma classe de cotas na mesma competência,
          exibimos a de maior patrimônio. Os percentuais de cotista são por <em>tipo</em> de
          investidor, não nominais. Identificou erro? Escreva em{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>/correcoes</Link>.
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
