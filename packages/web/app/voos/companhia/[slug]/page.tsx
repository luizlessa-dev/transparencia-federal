/**
 * Ficha de companhia aérea — quanto faturou da cota do Congresso e quem mais a usa.
 * Rota: /voos/companhia/[slug]  (entity-first de empresa)
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCompanhiasComPagina,
  getCompanhiaResumo,
  getCompanhiaSenadores,
  getCompanhiaRotas,
  companhiaSlug,
} from "~/services/voos";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

async function resolverCanon(slug: string): Promise<string | null> {
  const lista = await getCompanhiasComPagina();
  return lista.find((c) => companhiaSlug(c) === slug) ?? null;
}

export async function generateStaticParams() {
  const lista = await getCompanhiasComPagina().catch(() => []);
  return lista.map((c) => ({ slug: companhiaSlug(c) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canon = await resolverCanon(slug).catch(() => null);
  if (!canon) return { title: "Companhia não encontrada — The BR Insider" };
  const titulo = `${canon} na cota do Congresso: quanto faturou e quem mais voa`;
  return {
    title: `${titulo} | The BR Insider`,
    description: `Quanto a ${canon} faturou das cotas parlamentares de Câmara e Senado, quais senadores mais usam a companhia e as rotas mais voadas.`,
    alternates: { canonical: `https://www.thebrinsider.com/voos/companhia/${slug}` },
    openGraph: {
      title: titulo,
      description: `${canon} e o dinheiro público: faturamento da cota do Congresso, parlamentares e rotas.`,
      url: `https://www.thebrinsider.com/voos/companhia/${slug}`,
      siteName: "The BR Insider",
      type: "website",
      locale: "pt_BR",
    },
  };
}

export default async function CompanhiaPage({ params }: Props) {
  const { slug } = await params;
  const canon = await resolverCanon(slug);
  if (!canon) notFound();

  const [resumo, { data: senadores }, { data: rotas }] = await Promise.all([
    getCompanhiaResumo(canon),
    getCompanhiaSenadores(canon),
    getCompanhiaRotas(canon),
  ]);

  const totalGasto = resumo.senadoGasto + resumo.camaraGasto;
  const sens = senadores ?? [];
  const rts = rotas ?? [];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/voos" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Passagens da cota
            </Link>
            <span>/</span>
            <span>Companhias</span>
            <span>/</span>
            <span>{canon}</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
            {canon} na cota do Congresso: quanto faturou e quem mais voa
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "720px", lineHeight: 1.6 }}>
            Dinheiro público pago à <strong>{canon}</strong> via cota parlamentar de Câmara
            e Senado. No Senado, dá pra ver <strong>quais senadores</strong> mais usam a
            companhia e as <strong>rotas</strong> mais voadas.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Faturado da cota (total)" value={fmtBRL(totalGasto)} />
          <Kpi label="Câmara" value={fmtBRL(resumo.camaraGasto)} />
          <Kpi label="Senado" value={fmtBRL(resumo.senadoGasto)} />
          <Kpi label="Trechos (Senado)" value={fmtNum(resumo.senadoTrechos)} />
        </div>

        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>
          Senadores que mais usam a {canon}
        </h2>
        {sens.length > 0 ? (
          <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "2rem" }}>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ width: "2.5rem" }}>#</th>
                  <th>Senador(a)</th>
                  <th style={{ textAlign: "right" }}>Trechos</th>
                </tr>
              </thead>
              <tbody>
                {sens.slice(0, 15).map((s, i) => (
                  <tr key={`${s.senador_normalizado}-${i}`}>
                    <td style={{ color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>{s.senador_normalizado}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {fmtNum(Number(s.n_trechos ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "2rem" }}>
            Sem trechos detalhados no Senado para esta companhia.
          </p>
        )}

        {rts.length > 0 && (
          <>
            <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>
              Rotas mais voadas na {canon} (Senado)
            </h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}>
                <thead>
                  <tr>
                    <th>Rota</th>
                    <th style={{ textAlign: "right" }}>Trechos</th>
                  </tr>
                </thead>
                <tbody>
                  {rts.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: "0.8125rem", fontVariantNumeric: "tabular-nums" }}>
                        {r.origem} → {r.destino}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                        {fmtNum(Number(r.n_trechos ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> CEAP/CEAPS (Câmara e Senado, dados abertos). Senado: companhia,
          senador e rota extraídos do detalhamento. Câmara: fornecedor e valor (2023+).
          <Link href="/voos" style={{ color: "hsl(var(--primary))", marginLeft: "0.375rem" }}>
            Ver visão geral →
          </Link>
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
