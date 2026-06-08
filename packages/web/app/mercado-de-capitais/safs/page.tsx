/**
 * SAFs brasileiras — quadro societário, emissões CVM e FIPs do ecossistema.
 * Rota: /mercado-de-capitais/safs
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSafLista, getSafEcossistemaCvm, getFipSafResumo, getSafQuadroSocietario } from "~/services/cvm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SAFs brasileiras — quadro societário, emissões CVM e FIPs | The BR Insider",
  description:
    "Sociedades Anônimas do Futebol (SAFs) brasileiras: quadro societário pela Receita Federal, captações no mercado de capitais (debêntures, notas comerciais) e FIPs com participação nas SAFs — dados abertos da CVM.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais/safs" },
  openGraph: {
    title: "SAFs brasileiras — quadro societário, emissões CVM e FIPs",
    description: "Quem está atrás das SAFs: QSA da Receita, captações na CVM e fundos de investimento do ecossistema.",
    url: "https://www.thebrinsider.com/mercado-de-capitais/safs",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "SAFs brasileiras — dados abertos CVM e Receita",
    description: "Quadro societário, captações e FIPs das SAFs brasileiras. Dados abertos.",
  },
};

// ── helpers ──────────────────────────────────────────────────────────────────

const fmtMi = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v))
    ? "—"
    : `R$ ${(Number(v) / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}M`;

const fmtCnpj = (s: string) => {
  const d = s.replace(/\D/g, "").padStart(14, "0");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

const fmtData = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m] = iso.split("-");
  const meses = ["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m)]}/${a?.slice(2)}`;
};

const QUALIF: Record<string, string> = {
  "05": "Administrador",
  "08": "Diretor",
  "10": "Diretor Presidente",
  "16": "Presidente do Conselho",
  "22": "Sócio",
  "49": "Sócio-Administrador",
};
const fmtQualif = (q: string | null) => (q ? (QUALIF[q] ?? `qualif. ${q}`) : "—");

const SERIE_COR: Record<string, string> = {
  A: "hsl(var(--primary))",
  B: "hsl(var(--badge-warn-fg, var(--primary)))",
  C: "hsl(var(--text-caption))",
  Estadual: "hsl(var(--text-caption))",
};

// ── tipos ────────────────────────────────────────────────────────────────────

type Saf = {
  cnpj_norm: string;
  clube: string;
  razao_social: string | null;
  serie: string | null;
  investidor: string | null;
  data_constituicao: string | null;
  status: string | null;
  obs: string | null;
};

type Oferta = {
  clube: string;
  nome_emissor: string | null;
  tipo_ativo: string | null;
  valor: number | null;
  data_oferta: string | null;
  situacao: string | null;
  relacao: string;
  papel_entidade: string | null;
};

type Fip = {
  clube: string;
  papel: string | null;
  confirmado: boolean | null;
  nome_fip: string | null;
  cnpj_fip: string;
  ultimo_informe: string | null;
  pl: number | null;
  cap_integralizado: number | null;
  cotistas: number | null;
  pct_pf: number | null;
  obs: string | null;
};

type Socio = {
  clube: string;
  serie: string | null;
  status: string | null;
  nome_socio: string | null;
  identificador: string | null;
  qualificacao: string | null;
  data_entrada: string | null;
  razao_social_saf: string | null;
  capital_social_saf: number | null;
  razao_social_socio: string | null;
};

// ── página ───────────────────────────────────────────────────────────────────

export default async function SafsPage() {
  const [safRes, ofertasRes, fipsRes, sociosRes] = await Promise.all([
    getSafLista(),
    getSafEcossistemaCvm(),
    getFipSafResumo(),
    getSafQuadroSocietario(),
  ]);

  const safs = (safRes.data ?? []) as unknown as Saf[];
  const ofertas = (ofertasRes.data ?? []) as unknown as Oferta[];
  const fips = (fipsRes.data ?? []) as unknown as Fip[];
  const socios = (sociosRes.data ?? []) as unknown as Socio[];

  // KPIs
  const totalEmitido = ofertas.reduce((s, o) => s + (Number(o.valor) || 0), 0);
  const totalPlFips = fips.reduce((s, f) => s + (Number(f.pl) || 0), 0);
  const emissoesDiretas = ofertas.filter((o) => o.relacao === "direta").length;

  // Agrupar sócios por clube
  const sociosPorClube = socios.reduce<Record<string, Socio[]>>((acc, s) => {
    if (!acc[s.clube]) acc[s.clube] = [];
    acc[s.clube].push(s);
    return acc;
  }, {});

  return (
    <>
      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mercado-de-capitais" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Mercado de Capitais
            </Link>
            <span>/</span>
            <span>SAFs</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.25 }}>
            Sociedades Anônimas do Futebol
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "720px" }}>
            As SAFs brasileiras constituídas como empresas abertas — cruzadas com três fontes de
            dados públicos: o <strong>quadro societário da Receita Federal</strong> (quem controla
            cada clube), as <strong>captações na CVM</strong> (debêntures, notas comerciais e fundos)
            e os <strong>FIPs com participação nas SAFs</strong>.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>

        {/* KPIs */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "2rem" }}>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">SAFs mapeadas</div>
            <div className="bloomberg-kpi-value">{safs.length}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Emissões diretas CVM</div>
            <div className="bloomberg-kpi-value">{emissoesDiretas}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Total captado (ecossistema)</div>
            <div className="bloomberg-kpi-value">{fmtMi(totalEmitido)}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">FIPs do ecossistema (PL)</div>
            <div className="bloomberg-kpi-value">{fmtMi(totalPlFips)}</div>
          </div>
        </div>

        {/* ── Seção 1: Lista de SAFs ── */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", marginTop: 0 }}>
          SAFs constituídas
        </h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table" style={{ width: "100%", minWidth: "700px" }}>
              <thead>
                <tr>
                  <th>Clube</th>
                  <th>CNPJ</th>
                  <th style={{ textAlign: "center" }}>Série</th>
                  <th>Investidor / Controlador</th>
                  <th>Constituição</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {safs.map((s) => (
                  <tr key={s.cnpj_norm}>
                    <td style={{ fontWeight: 600 }}>
                      {s.clube}
                      {s.obs && (
                        <div style={{ fontSize: "0.7rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem", fontWeight: 400 }}>
                          {s.obs.split(".")[0]}
                        </div>
                      )}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {fmtCnpj(s.cnpj_norm)}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontWeight: 700, color: SERIE_COR[s.serie ?? ""] ?? "hsl(var(--text-body))" }}>
                        {s.serie ?? "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", maxWidth: "260px" }}>
                      {s.investidor ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                      {fmtData(s.data_constituicao)}
                    </td>
                    <td>
                      {s.status === "recuperacao_judicial" ? (
                        <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: "hsl(var(--badge-danger-bg))", color: "hsl(var(--badge-danger-fg))", fontWeight: 600 }}>
                          RJ
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.7rem", color: "hsl(var(--text-caption))" }}>ativa</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Seção 2: Quadro societário ── */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Quadro societário (Receita Federal — QSA maio/2026)
        </h2>
        <div
          className="bloomberg-card"
          style={{ padding: "0.75rem 1.25rem", marginBottom: "1rem", borderLeft: "3px solid hsl(var(--primary))", fontSize: "0.8rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}
        >
          CPF é <strong>parcialmente mascarado</strong> pela Receita (6 dígitos centrais visíveis).
          Os nomes listados são diretores e sócios registrados diretamente no CNPJ da SAF —
          a cadeia de controle acima (holdings, fundos) pode não aparecer aqui.
        </div>

        {safs.map((saf) => {
          const ss = sociosPorClube[saf.clube] ?? [];
          if (ss.length === 0) return null;
          return (
            <div key={saf.cnpj_norm} className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "0.875rem" }}>
              <div style={{ padding: "0.625rem 1rem", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{saf.clube}</span>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{fmtCnpj(saf.cnpj_norm)}</span>
                {ss[0]?.capital_social_saf && (
                  <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginLeft: "auto" }}>
                    capital social: {fmtMi(ss[0].capital_social_saf)}
                  </span>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Qualificação</th>
                      <th>Entrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ss.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>
                          {s.nome_socio ?? "—"}
                          {s.razao_social_socio && (
                            <div style={{ fontSize: "0.7rem", color: "hsl(var(--text-caption))", fontWeight: 400 }}>
                              {s.razao_social_socio}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: "0.8rem" }}>
                          {s.identificador === "1" ? "PJ" : s.identificador === "2" ? "PF" : "Estrangeiro"}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "hsl(var(--text-body))" }}>
                          {fmtQualif(s.qualificacao)}
                        </td>
                        <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                          {fmtData(s.data_entrada)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {/* ── Seção 3: Emissões CVM ── */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "2rem 0 0.75rem" }}>
          Captações no mercado de capitais (CVM)
        </h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table" style={{ width: "100%", minWidth: "760px" }}>
              <thead>
                <tr>
                  <th>Clube</th>
                  <th>Emissor</th>
                  <th>Instrumento</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                  <th>Data</th>
                  <th>Situação</th>
                  <th style={{ textAlign: "center" }}>Relação</th>
                </tr>
              </thead>
              <tbody>
                {ofertas.map((o, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{o.clube}</td>
                    <td style={{ fontSize: "0.8rem", color: "hsl(var(--text-body))", maxWidth: "220px" }}>
                      {o.nome_emissor ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{o.tipo_ativo ?? "—"}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {fmtMi(o.valor)}
                    </td>
                    <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{fmtData(o.data_oferta)}</td>
                    <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {o.situacao ?? "—"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {o.relacao === "direta" ? (
                        <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: "hsl(var(--primary))", color: "#fff", fontWeight: 600 }}>
                          direta
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: "hsl(var(--muted))", color: "hsl(var(--text-caption))" }}>
                          {o.papel_entidade ?? "eco"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Seção 4: FIPs do ecossistema ── */}
        <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          FIPs do ecossistema SAF
        </h2>
        <div
          className="bloomberg-card"
          style={{ padding: "0.75rem 1.25rem", marginBottom: "1rem", borderLeft: "3px solid hsl(var(--primary))", fontSize: "0.8rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}
        >
          A carteira de FIP é <strong>confidencial na CVM</strong>. O vínculo com cada SAF é{" "}
          <strong>confirmado</strong> (fontes públicas: prospectos, notícias, registros) ou{" "}
          <strong>inferido</strong> (nome do fundo, padrão de cotistas, gestor).
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table" style={{ width: "100%", minWidth: "760px" }}>
              <thead>
                <tr>
                  <th>Fundo</th>
                  <th>CNPJ</th>
                  <th>Clube</th>
                  <th style={{ textAlign: "center" }}>Papel</th>
                  <th style={{ textAlign: "right" }}>PL</th>
                  <th style={{ textAlign: "right" }}>Cap. integr.</th>
                  <th style={{ textAlign: "center" }}>Cotistas</th>
                  <th style={{ textAlign: "right" }}>% PF</th>
                  <th>Informe</th>
                </tr>
              </thead>
              <tbody>
                {fips.map((f) => (
                  <tr key={f.cnpj_fip}>
                    <td style={{ fontWeight: 600, maxWidth: "260px" }}>
                      <Link
                        href={`/mercado-de-capitais/grafo?cnpj=${f.cnpj_fip}`}
                        style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
                        title="Explorar no grafo de fundos"
                      >
                        {f.nome_fip ?? f.cnpj_fip}
                      </Link>
                      {!f.confirmado && (
                        <div style={{ fontSize: "0.7rem", color: "hsl(var(--badge-warn-fg, var(--primary)))", marginTop: "0.125rem" }}>
                          vínculo inferido
                        </div>
                      )}
                    </td>
                    <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                      {fmtCnpj(f.cnpj_fip)}
                    </td>
                    <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                      {f.clube === "multi" ? (
                        <span style={{ color: "hsl(var(--text-caption))" }}>multi-clube</span>
                      ) : f.clube}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem", borderRadius: "9999px", backgroundColor: "hsl(var(--muted))", color: "hsl(var(--text-caption))" }}>
                        {f.papel ?? "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700 }}>
                      {fmtMi(f.pl)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmtMi(f.cap_integralizado)}
                    </td>
                    <td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                      {f.cotistas ?? "—"}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {f.pct_pf != null ? `${Number(f.pct_pf).toFixed(1)}%` : "—"}
                    </td>
                    <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {fmtData(f.ultimo_informe)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Caso Galo Forte */}
        <div
          className="bloomberg-card"
          style={{ padding: "0.875rem 1.25rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))", fontSize: "0.8125rem", lineHeight: 1.65, marginBottom: "2rem" }}
        >
          <strong>Caso Galo Forte:</strong> o FIP que controla 26,88% da SAF do Atlético-MG tem{" "}
          <strong>1 cotista pessoa física com 100% das cotas</strong> e patrimônio de R$ 293M. É o
          caso mais documentado desta lista.{" "}
          <Link href="/mercado-de-capitais/galo-forte" style={{ color: "hsl(var(--primary))" }}>
            Ver análise completa →
          </Link>
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", lineHeight: 1.6 }}>
          <strong>Fontes:</strong>{" "}
          Portal de Dados Abertos da CVM (licença ODbL) — informe periódico de FIP, cadastro de
          fundos, composição de carteira (CDA) e ofertas públicas de distribuição. Quadro societário:
          dados abertos CNPJ da Receita Federal (maio/2026). A identidade nominal do cotista de FIP
          é confidencial na fonte e não é exibida. Erro ou atualização?{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>/correcoes</Link>
        </p>
      </div>
    </>
  );
}
