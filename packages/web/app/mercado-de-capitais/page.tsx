/**
 * Mercado de Capitais (CVM) — hub do eixo. Grafo de fundos, informes de FIP,
 * ofertas públicas e cruzamento com listas de sanção. Rota: /mercado-de-capitais
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCvmFundos, getCvmCarteira, getCvmOfertas, getCvmFips, getCvmEmissoresSancionadosCount, getCvmGaloForteHistorico } from "~/services/cvm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mercado de Capitais — fundos, FIPs e emissores (dados da CVM) | The BR Insider",
  description:
    "Observatório do mercado de capitais brasileiro a partir dos dados abertos da CVM: grafo de fundos (quem investe em quem), informes de FIP, ofertas públicas e cruzamento de emissores com listas de sanção.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais" },
  openGraph: { title: "Mercado de Capitais — fundos, FIPs e emissores (dados da CVM)", description: "Grafo de fundos, informes de FIP, ofertas públicas e emissores sancionados. Dados abertos da CVM.", url: "https://www.thebrinsider.com/mercado-de-capitais", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Mercado de Capitais — dados abertos da CVM", description: "Grafo de fundos, FIPs, ofertas públicas e emissores sancionados." },
};

const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtMi = (v: number) => `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;

export default async function MercadoCapitaisPage() {
  const [fundos, arestas, ofertas, fips, emissoresUnicos, galoHistorico] = await Promise.all([
    getCvmFundos(),
    getCvmCarteira(),
    getCvmOfertas(),
    getCvmFips(),
    getCvmEmissoresSancionadosCount(),
    getCvmGaloForteHistorico(),
  ]);

  const galoSerie = ((galoHistorico.data ?? []) as { vl_patrim_liq: number | null; dt_comptc: string }[])
    .filter((r) => r.vl_patrim_liq != null)
    .sort((a, b) => b.dt_comptc.localeCompare(a.dt_comptc));
  const galoPl = Number(galoSerie[0]?.vl_patrim_liq ?? 0);

  const cards: { href: string; titulo: string; num: string; sub: string; tom: string }[] = [
    { href: "/mercado-de-capitais/galo-forte", titulo: "Caso Galo Forte", num: galoPl ? fmtMi(galoPl) : "—", sub: "FIP que controla parte da SAF do Atlético-MG", tom: "danger" },
    { href: "/mercado-de-capitais/emissores-sancionados", titulo: "Emissores sancionados", num: fmtNum(emissoresUnicos.count ?? 0), sub: "captaram no mercado e estão em lista de sanção", tom: "danger" },
    { href: "/mercado-de-capitais/galo-forte", titulo: "Informes de FIP", num: fmtNum(fips.count ?? 0), sub: "fundos de participação monitorados", tom: "" },
    { href: "/mercado-de-capitais", titulo: "Grafo de fundos", num: fmtNum(arestas.count ?? 0), sub: "arestas fundo→fundo (quem investe em quem)", tom: "" },
    { href: "/mercado-de-capitais", titulo: "Fundos cadastrados", num: fmtNum(fundos.count ?? 0), sub: "nós do grafo (CVM)", tom: "" },
    { href: "/mercado-de-capitais/emissores-sancionados", titulo: "Ofertas públicas", num: fmtNum(ofertas.count ?? 0), sub: "debêntures, cotas, CRI/CRA (emissores)", tom: "" },
  ];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Mercado de Capitais</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px" }}>
            O mercado de capitais brasileiro a partir dos <strong>dados abertos da CVM</strong>:
            o grafo de fundos (quem investe em quem), informes de FIP, ofertas públicas e o
            cruzamento de emissores com listas de sanção. Seguir o dinheiro até onde o dado
            público permite.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        <div className="bloomberg-kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.875rem" }}>
          {cards.map((c) => (
            <Link key={c.titulo + c.href} href={c.href} className="bloomberg-card" style={{ padding: "1rem 1.25rem", textDecoration: "none", borderLeft: c.tom === "danger" ? "3px solid hsl(var(--badge-danger-fg))" : c.tom === "warn" ? "3px solid hsl(var(--badge-warn-fg, var(--primary)))" : "3px solid hsl(var(--border))" }}>
              <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "0.25rem" }}>{c.titulo}</div>
              <div style={{ fontSize: "1.375rem", fontWeight: 700, color: "hsl(var(--text-headline))", fontVariantNumeric: "tabular-nums" }}>{c.num}</div>
              <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", marginTop: "0.25rem", lineHeight: 1.4 }}>{c.sub}</div>
            </Link>
          ))}
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "2rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Portal de Dados Abertos da CVM (licença ODbL) — cadastro de
          fundos, composição de carteira (CDA), informes de FIP e ofertas públicas de distribuição —
          cruzado com as listas de sanção CEIS/CNEP (União) e CGE-MG. Identidade nominal de
          cotista de fundo é confidencial na fonte e não é exibida.
        </p>
      </div>
    </>
  );
}
