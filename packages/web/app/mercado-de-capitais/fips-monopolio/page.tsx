/**
 * FIPs monopolizados — o "universo Galo Forte".
 * Critério: 1 cotista, 100% PF, capital integralizado > R$10M.
 * Rota: /mercado-de-capitais/fips-monopolio
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCvmFipMonopolioLista } from "~/services/cvm";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FIPs monopolizados — 1 cotista PF com 100% das cotas | The BR Insider",
  description:
    "Levantamento sistemático dos Fundos de Investimento em Participações com um único cotista pessoa física detendo 100% das cotas e capital integralizado superior a R$10 milhões. O padrão identificado no caso Galo Forte.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais/fips-monopolio" },
  openGraph: {
    title: "FIPs monopolizados — 1 cotista PF com 100% das cotas",
    description: "O padrão Galo Forte no universo inteiro de FIPs. Capital integralizado, patrimônio e links com o grafo de fundos.",
    url: "https://www.thebrinsider.com/mercado-de-capitais/fips-monopolio",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "FIPs monopolizados — 1 cotista PF, 100% das cotas",
    description: "Busca sistemática do padrão Galo Forte no universo de FIPs. Dados abertos da CVM.",
  },
};

const FREE_LIMIT = 20;

type Row = {
  cnpj_norm: string;
  denom: string | null;
  tipo: string | null;
  situacao: string | null;
  dt_comptc: string | null;
  vl_patrim_liq: number | null;
  vl_cap_integr: number | null;
  vl_cap_compr: number | null;
  nr_cotst: number | null;
  pr_pf: number | null;
  admin: string | null;
  gestor: string | null;
  controlador: string | null;
  tem_aresta_grafo: boolean | null;
  tem_oferta: boolean | null;
  tem_politico: boolean | null;
};

const fmtMi = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v))
    ? "—"
    : `R$ ${(Number(v) / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;

const fmtCnpj = (s: string) => {
  const d = s.replace(/\D/g, "").padStart(14, "0");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

const fmtData = (iso: string | null) => {
  if (!iso) return "—";
  const [a, m] = iso.split("-");
  const meses = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m)]}/${a}`;
};

export default async function FipsMonopolioPage() {
  const { pago } = await getViewer();
  const { data, error } = await getCvmFipMonopolioLista();

  if (error || !data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar dados: {error?.message ?? "resposta vazia"}
        </p>
      </div>
    );
  }

  const rows = data as unknown as Row[];
  const total = rows.length;
  const totalCap = rows.reduce((s, r) => s + (Number(r.vl_cap_integr) || 0), 0);
  const totalPl = rows.reduce((s, r) => s + (Number(r.vl_patrim_liq) || 0), 0);
  const comGrafo = rows.filter((r) => r.tem_aresta_grafo).length;
  const comPolitico = rows.filter((r) => r.tem_politico).length;

  const visivel = pago ? rows : rows.slice(0, FREE_LIMIT);
  const bloqueados = rows.length - visivel.length;

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mercado-de-capitais" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Mercado de Capitais
            </Link>
            <span>/</span>
            <span>FIPs monopolizados</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.25 }}>
            FIPs com um único cotista pessoa física
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "720px" }}>
            O caso Galo Forte — um FIP com capital de R$300M controlado por uma única pessoa física —
            não é único. Este levantamento busca <strong>sistematicamente</strong> todos os Fundos de
            Investimento em Participações com o mesmo padrão nos{" "}
            <strong>dados abertos da CVM</strong>: 1 cotista, 100% pessoa física, capital integralizado
            acima de R$10M.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {/* KPIs */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">FIPs no padrão</div>
            <div className="bloomberg-kpi-value">{total.toLocaleString("pt-BR")}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Capital integralizado total</div>
            <div className="bloomberg-kpi-value">{fmtMi(totalCap)}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Patrimônio líquido total</div>
            <div className="bloomberg-kpi-value">{fmtMi(totalPl)}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Com nó no grafo de fundos</div>
            <div className="bloomberg-kpi-value">{comGrafo.toLocaleString("pt-BR")}</div>
          </div>
          {comPolitico > 0 && (
            <div className="bloomberg-kpi" style={{ borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
              <div className="bloomberg-kpi-label">Ligação com parlamentar</div>
              <div className="bloomberg-kpi-value" style={{ color: "hsl(var(--badge-danger-fg))" }}>
                {comPolitico.toLocaleString("pt-BR")}
              </div>
            </div>
          )}
        </div>

        {/* O que este dado é */}
        <div
          className="bloomberg-card"
          style={{ padding: "0.875rem 1.25rem", marginBottom: "1.25rem", borderLeft: "3px solid hsl(var(--primary))", fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.65 }}
        >
          <strong>O que este dado mostra:</strong> o informe periódico de FIP da CVM registra o
          número de cotistas e a distribuição <em>por tipo</em> (PF, PJ, banco, fundo de pensão…).
          Quando <code>nr_cotst = 1</code> e <code>pr_pf = 100</code>, sabemos que existe uma única
          pessoa física com 100% das cotas — mas a{" "}
          <strong>identidade nominal é confidencial na fonte</strong>. O informe não nomeia o
          cotista. A coluna &quot;ligação com parlamentar&quot; indica que, no QSA da Receita, um
          parlamentar figura como sócio de empresa com o mesmo CNPJ — não necessariamente que o
          cotista do FIP seja esse parlamentar.
        </div>

        {/* Tabela */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table" style={{ width: "100%", minWidth: "800px" }}>
              <thead>
                <tr>
                  <th>Fundo</th>
                  <th>CNPJ</th>
                  <th style={{ textAlign: "right" }}>Cap. integralizado</th>
                  <th style={{ textAlign: "right" }}>PL</th>
                  <th>Competência</th>
                  <th>Gestor / Admin</th>
                  <th style={{ textAlign: "center" }}>Sinais</th>
                </tr>
              </thead>
              <tbody>
                {visivel.map((r) => (
                  <tr key={r.cnpj_norm}>
                    <td style={{ fontWeight: 600, maxWidth: "260px" }}>
                      <Link
                        href={`/mercado-de-capitais/grafo?cnpj=${r.cnpj_norm}`}
                        style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
                        title="Explorar no grafo de fundos"
                      >
                        {r.denom ?? r.cnpj_norm}
                      </Link>
                      {r.situacao && r.situacao !== "EM FUNCIONAMENTO NORMAL" && (
                        <div style={{ fontSize: "0.7rem", color: "hsl(var(--badge-warn-fg, var(--primary)))", marginTop: "0.125rem" }}>
                          {r.situacao}
                        </div>
                      )}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                      {fmtCnpj(r.cnpj_norm)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
                      {fmtMi(r.vl_cap_integr)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMi(r.vl_patrim_liq)}
                    </td>
                    <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                      {fmtData(r.dt_comptc)}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", maxWidth: "200px" }}>
                      {r.gestor ?? r.admin ?? "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center", flexWrap: "wrap" }}>
                        {r.tem_aresta_grafo && (
                          <span
                            title="Aparece no grafo de fundos (CDA)"
                            style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", backgroundColor: "hsl(var(--muted))", color: "hsl(var(--text-caption))" }}
                          >
                            grafo
                          </span>
                        )}
                        {r.tem_oferta && (
                          <span
                            title="Emitiu oferta pública"
                            style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", backgroundColor: "hsl(var(--badge-warn-bg, hsl(var(--muted))))", color: "hsl(var(--badge-warn-fg, var(--primary)))" }}
                          >
                            oferta
                          </span>
                        )}
                        {r.tem_politico && (
                          <span
                            title="Ligação com parlamentar no QSA"
                            style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", backgroundColor: "hsl(var(--badge-danger-bg))", color: "hsl(var(--badge-danger-fg))", fontWeight: 600 }}
                          >
                            político
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {bloqueados > 0 && (
          <ParedeDeAcesso
            titulo={`+${bloqueados.toLocaleString("pt-BR")} FIPs disponíveis para assinantes`}
            descricao="Acesse o universo completo com capital integralizado, gestor, sinais de oferta pública e ligações políticas para cada fundo."
          />
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Critério de seleção:</strong> <code>nr_cotst = 1</code> E <code>pr_pf = 100</code> E{" "}
          <code>vl_cap_integr &gt; R$10M</code> no informe mais recente disponível.{" "}
          <strong>Fonte:</strong> Informe Trimestral/Quadrimestral de FIP (Portal de Dados Abertos da
          CVM, licença ODbL). A identidade nominal do cotista é confidencial na fonte. Identificou
          erro?{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>
            /correcoes
          </Link>
        </p>
      </div>
    </>
  );
}
