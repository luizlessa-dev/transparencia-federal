/**
 * Passagens aéreas da cota do Senado — quem voa, em qual companhia,
 * e quem voa sem ser o parlamentar.
 * Rota: /voos
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  getVoosParlamentarAgg,
  getVoosCompanhiaAgg,
  getVoosTerceiros,
  getVoosCamaraDeputado,
  getVoosCamaraCompanhia,
  ehAereaConhecida,
  companhiaSlug,
} from "~/services/voos";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title:
    "Passagens aéreas da cota do Senado: quem voa, em qual companhia | The BR Insider",
  description:
    "Voos pagos pela cota parlamentar do Senado (CEAPS): ranking de quem mais voa, voos em nome de não-parlamentares e share de faturamento por companhia aérea (LATAM, GOL, AZUL) e agência.",
  alternates: { canonical: "https://www.thebrinsider.com/voos" },
  openGraph: {
    title: "Passagens aéreas da cota do Senado",
    description:
      "Quem voa na cota do Senado, em qual companhia, e quem voa sem ser o parlamentar.",
    url: "https://www.thebrinsider.com/voos",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default async function VoosPage() {
  const [
    { data: parlRaw },
    { data: compRaw },
    { data: tercRaw },
    { data: camDepRaw },
    { data: camCompRaw },
  ] = await Promise.all([
    getVoosParlamentarAgg(),
    getVoosCompanhiaAgg(),
    getVoosTerceiros(),
    getVoosCamaraDeputado(),
    getVoosCamaraCompanhia(),
  ]);

  // ── Agrega parlamentar (soma anos) ──
  const parlMap = new Map<
    string,
    { senador: string; gasto: number; trechos: number; terceiros: number }
  >();
  for (const r of parlRaw ?? []) {
    const k = r.senador_normalizado ?? "—";
    const a = parlMap.get(k) ?? { senador: k, gasto: 0, trechos: 0, terceiros: 0 };
    a.gasto += Number(r.total_gasto ?? 0);
    a.trechos += Number(r.n_trechos ?? 0);
    a.terceiros += Number(r.n_trechos_terceiros ?? 0);
    parlMap.set(k, a);
  }
  const parl = [...parlMap.values()].sort((a, b) => b.gasto - a.gasto);

  // ── Agrega companhia (soma anos) e recalcula share ──
  const compMap = new Map<
    string,
    { companhia: string; gasto: number; trechos: number; docs: number }
  >();
  for (const r of compRaw ?? []) {
    const k = r.companhia ?? "—";
    const a = compMap.get(k) ?? { companhia: k, gasto: 0, trechos: 0, docs: 0 };
    a.gasto += Number(r.total_gasto ?? 0);
    a.trechos += Number(r.n_trechos ?? 0);
    a.docs += Number(r.n_documentos ?? 0);
    compMap.set(k, a);
  }
  const gastoTotal = [...compMap.values()].reduce((s, c) => s + c.gasto, 0);
  const comp = [...compMap.values()]
    .map((c) => ({ ...c, share: gastoTotal > 0 ? (c.gasto / gastoTotal) * 100 : 0 }))
    .sort((a, b) => b.gasto - a.gasto);

  const terc = tercRaw ?? [];

  // ── Agrega Câmara: deputado (por id, soma anos) ──
  const camDepMap = new Map<
    string,
    { nome: string; partido: string; uf: string; gasto: number; docs: number }
  >();
  for (const r of camDepRaw ?? []) {
    const k = r.deputado_id_externo ?? "—";
    const a =
      camDepMap.get(k) ??
      {
        nome: r.nome ?? "—",
        partido: r.sigla_partido ?? "",
        uf: r.sigla_uf ?? "",
        gasto: 0,
        docs: 0,
      };
    a.gasto += Number(r.total_gasto ?? 0);
    a.docs += Number(r.n_documentos ?? 0);
    camDepMap.set(k, a);
  }
  const camDep = [...camDepMap.values()].sort((a, b) => b.gasto - a.gasto);

  // ── Agrega Câmara: companhia (soma anos) ──
  const camCompMap = new Map<string, { companhia: string; gasto: number; docs: number }>();
  for (const r of camCompRaw ?? []) {
    const k = r.companhia ?? "—";
    const a = camCompMap.get(k) ?? { companhia: k, gasto: 0, docs: 0 };
    a.gasto += Number(r.total_gasto ?? 0);
    a.docs += Number(r.n_documentos ?? 0);
    camCompMap.set(k, a);
  }
  const camGastoTotal = [...camCompMap.values()].reduce((s, c) => s + c.gasto, 0);
  const camComp = [...camCompMap.values()]
    .map((c) => ({ ...c, share: camGastoTotal > 0 ? (c.gasto / camGastoTotal) * 100 : 0 }))
    .sort((a, b) => b.gasto - a.gasto);
  // KPIs da Câmara saem da agg de companhia (completa); a lista de deputados é
  // truncada em 1000 linhas pelo PostgREST, então não serve para totais.
  const camTotalGasto = camGastoTotal;
  const camTotalDocs = [...camCompMap.values()].reduce((s, c) => s + c.docs, 0);

  // ── KPIs ──
  const totalGasto = parl.reduce((s, p) => s + p.gasto, 0);
  const totalTrechos = parl.reduce((s, p) => s + p.trechos, 0);
  const totalTerceiros = parl.reduce((s, p) => s + p.terceiros, 0);
  const nAereas = comp.filter((c) => ehAereaConhecida(c.companhia)).length;
  const pctTerceiros = totalTrechos > 0 ? (totalTerceiros / totalTrechos) * 100 : 0;

  return (
    <>
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
            }}
          >
            Congresso / Passagens aéreas da cota
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
            Passagens aéreas da cota do Congresso: quem voa, em qual companhia
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
              margin: "0.5rem 0 0",
              maxWidth: "720px",
              lineHeight: 1.6,
            }}
          >
            Voos pagos pela <strong>cota parlamentar</strong> de senadores e deputados.
            O Senado detalha cada voo (quem mais voa, voos em nome de{" "}
            <strong>não-parlamentares</strong> e a companhia); a Câmara publica só
            fornecedor e valor, então mostra o <strong>gasto por deputado</strong> e o{" "}
            <strong>faturamento por companhia</strong>.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Gasto total" value={fmtBRL(totalGasto)} />
          <Kpi label="Trechos voados" value={fmtNum(totalTrechos)} />
          <Kpi label="Companhias aéreas" value={fmtNum(nAereas)} />
          <Kpi label="Trechos de terceiros" value={fmtPct(pctTerceiros)} />
        </div>

        <HouseHeader nome="Senado Federal" sub="Voos detalhados — companhia, trecho e passageiro (2019–2026)" />

        {/* Seção 1 — quem mais voa */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>
          Quem mais voa na cota
        </h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>#</th>
                <th>Senador(a)</th>
                <th style={{ textAlign: "right" }}>Gasto</th>
                <th style={{ textAlign: "right" }}>Trechos</th>
                <th style={{ textAlign: "right" }}>% terceiros</th>
              </tr>
            </thead>
            <tbody>
              {parl.slice(0, 30).map((p, i) => (
                <tr key={p.senador}>
                  <td style={{ color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>
                    {i + 1}
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{p.senador}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {fmtBRL(p.gasto)}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(p.trechos)}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {p.trechos > 0 ? fmtPct((p.terceiros / p.trechos) * 100) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Seção 2 — passageiro ≠ parlamentar */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem" }}>
          Voou na cota sem ser o parlamentar
        </h2>
        <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0 0 0.75rem", maxWidth: "720px", lineHeight: 1.5 }}>
          Trechos pagos pela cota do senador em nome de outra pessoa (vínculo declarado no detalhamento).
        </p>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Passageiro</th>
                <th>Vínculo</th>
                <th>Cota de</th>
                <th style={{ textAlign: "right" }}>Trechos</th>
              </tr>
            </thead>
            <tbody>
              {terc.slice(0, 30).map((t, i) => (
                <tr key={`${t.passageiro}-${i}`}>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{t.passageiro}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{t.vinculo}</td>
                  <td style={{ fontSize: "0.75rem" }}>{t.senador_normalizado}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {fmtNum(Number(t.n_trechos ?? 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Seção 3 — companhias */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>
          Companhias aéreas e agências
        </h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Faturado da cota</th>
                <th style={{ textAlign: "right" }}>Share</th>
                <th style={{ textAlign: "right" }}>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {comp.slice(0, 20).map((c) => {
                const aerea = ehAereaConhecida(c.companhia);
                return (
                  <tr key={c.companhia}>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      {aerea ? (
                        <Link
                          href={`/voos/companhia/${companhiaSlug(c.companhia)}`}
                          style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
                        >
                          {c.companhia}
                        </Link>
                      ) : (
                        c.companhia
                      )}
                    </td>
                    <td>
                      <span className={aerea ? "badge-success" : "badge-neutral"}>
                        {aerea ? "Aérea" : "Agência"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(c.gasto)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtPct(c.share)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(c.docs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "2.5rem" }}>
          <HouseHeader
            nome="Câmara dos Deputados"
            sub="A Câmara não publica trecho nem passageiro — só gasto e companhia (2023–2025)"
          />
        </div>

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Gasto total (Câmara)" value={fmtBRL(camTotalGasto)} />
          <Kpi label="Bilhetes" value={fmtNum(camTotalDocs)} />
          <Kpi
            label="LATAM + GOL + AZUL"
            value={fmtPct(
              camComp
                .filter((c) => ["LATAM", "GOL", "AZUL"].includes(c.companhia.toUpperCase()))
                .reduce((s, c) => s + c.share, 0)
            )}
          />
        </div>

        {/* Câmara — quem mais gasta */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>
          Quem mais gasta com voo (Câmara)
        </h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>#</th>
                <th>Deputado(a)</th>
                <th>Partido/UF</th>
                <th style={{ textAlign: "right" }}>Gasto</th>
                <th style={{ textAlign: "right" }}>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {camDep.slice(0, 30).map((d, i) => (
                <tr key={`${d.nome}-${i}`}>
                  <td style={{ color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>
                    {i + 1}
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{d.nome}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                    {[d.partido, d.uf].filter(Boolean).join("-")}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                    {fmtBRL(d.gasto)}
                  </td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(d.docs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Câmara — companhias */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>
          Companhias aéreas e agências (Câmara)
        </h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Fornecedor</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Faturado da cota</th>
                <th style={{ textAlign: "right" }}>Share</th>
                <th style={{ textAlign: "right" }}>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {camComp.slice(0, 20).map((c) => {
                const aerea = ehAereaConhecida(c.companhia);
                return (
                  <tr key={c.companhia}>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      {aerea ? (
                        <Link
                          href={`/voos/companhia/${companhiaSlug(c.companhia)}`}
                          style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
                        >
                          {c.companhia}
                        </Link>
                      ) : (
                        c.companhia
                      )}
                    </td>
                    <td>
                      <span className={aerea ? "badge-success" : "badge-neutral"}>
                        {aerea ? "Aérea" : "Agência"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {fmtBRL(c.gasto)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtPct(c.share)}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtNum(c.docs)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          <strong>Fonte:</strong> CEAP/CEAPS — Cota para o Exercício da Atividade Parlamentar
          (Câmara dos Deputados e Senado Federal, dados abertos). No Senado, companhia, trecho e
          passageiro são extraídos do detalhamento de cada documento (valores líquidos; estornos
          aparecem como negativos). Na Câmara, há apenas fornecedor e valor; os anos de 2019 a 2022
          foram omitidos por inconsistência de valores na base histórica da fonte. Projeto independente.
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

function HouseHeader({ nome, sub }: { nome: string; sub: string }) {
  return (
    <div
      style={{
        borderTop: "2px solid hsl(var(--primary))",
        paddingTop: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      <div style={{ fontSize: "1.0625rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
        {nome}
      </div>
      <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>
        {sub}
      </div>
    </div>
  );
}
