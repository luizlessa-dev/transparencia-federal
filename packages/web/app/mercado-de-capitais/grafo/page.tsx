/**
 * Explorador de grafo de fundos — motor re-semeável.
 * Dado um CNPJ semente (query param ?cnpj=), percorre a vizinhança recursiva
 * via cvm_grafo_vizinhanca() e exibe nós + arestas em tabela navegável.
 * Rota: /mercado-de-capitais/grafo
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCvmGrafoVizinhanca } from "~/services/cvm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explorador de grafo de fundos (CVM) | The BR Insider",
  description:
    "Navegue pela cadeia de investimentos entre fundos: dado um CNPJ semente, o grafo percorre quem investe em quem (downstream) e quem detém o fundo (upstream) em até 3 saltos.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais/grafo" },
  openGraph: {
    title: "Explorador de grafo de fundos (CVM)",
    description: "Cadeia fundo→fundo: upstream e downstream em até 3 saltos. Dados abertos da CVM.",
    url: "https://www.thebrinsider.com/mercado-de-capitais/grafo",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

type Aresta = {
  cnpj_origem: string;
  cnpj_destino: string;
  denom_destino: string | null;
  vl_merc: number | null;
  profundidade: number;
  direcao: string;
};

const fmtMi = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v))
    ? "—"
    : `R$ ${(Number(v) / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;

const fmtCnpj = (s: string) => {
  const d = s.replace(/\D/g, "").padStart(14, "0");
  return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
};

const CNPJ_SUGERIDOS = [
  { cnpj: "40908937000197", label: "Galo Forte FIP Multiestratégia" },
  { cnpj: "51856050000106", label: "Galo Forte FIP (alt. CNPJ)" },
];

export default async function GrafoPage({
  searchParams,
}: {
  searchParams: Promise<{ cnpj?: string; prof?: string }>;
}) {
  const sp = await searchParams;
  const cnpjRaw = (sp.cnpj ?? "").replace(/\D/g, "").padStart(14, "0");
  const cnpj = cnpjRaw === "00000000000000" ? "" : cnpjRaw;
  const prof = Math.min(5, Math.max(1, Number(sp.prof ?? 3) || 3));

  let arestas: Aresta[] = [];
  let error: string | null = null;

  if (cnpj) {
    const res = await getCvmGrafoVizinhanca(cnpj, prof);
    if (res.error) error = res.error.message;
    else arestas = (res.data ?? []) as Aresta[];
  }

  const downstream = arestas.filter((a) => a.direcao === "downstream");
  const upstream = arestas.filter((a) => a.direcao === "upstream");

  // Nós únicos para summary
  const nos = new Set([
    ...arestas.map((a) => a.cnpj_origem),
    ...arestas.map((a) => a.cnpj_destino),
  ]);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mercado-de-capitais" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Mercado de Capitais
            </Link>
            <span>/</span>
            <span>Explorador de grafo</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.25 }}>
            Grafo de fundos — explorador
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "680px" }}>
            Dado um CNPJ de fundo, percorre a cadeia em duas direções:{" "}
            <strong>downstream</strong> (o que o fundo detém) e{" "}
            <strong>upstream</strong> (quem detém o fundo) — em até {prof} salto{prof !== 1 ? "s" : ""}.
            Cobre o universo 555 (fundos abertos com CDA declarada).
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {/* Formulário de busca */}
        <form
          method="GET"
          action="/mercado-de-capitais/grafo"
          style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "flex-end" }}
        >
          <div style={{ flex: "1 1 280px" }}>
            <label
              htmlFor="cnpj-input"
              style={{ display: "block", fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "0.375rem" }}
            >
              CNPJ do fundo semente
            </label>
            <input
              id="cnpj-input"
              name="cnpj"
              type="text"
              defaultValue={cnpj ? fmtCnpj(cnpj) : ""}
              placeholder="00.000.000/0001-00"
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                fontSize: "0.9375rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--text-headline))",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <label
              htmlFor="prof-input"
              style={{ display: "block", fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "0.375rem" }}
            >
              Profundidade (1–5)
            </label>
            <input
              id="prof-input"
              name="prof"
              type="number"
              min={1}
              max={5}
              defaultValue={prof}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                fontSize: "0.9375rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                backgroundColor: "hsl(var(--card))",
                color: "hsl(var(--text-headline))",
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.9375rem",
              cursor: "pointer",
              fontWeight: 600,
              whiteSpace: "nowrap",
            }}
          >
            Explorar
          </button>
        </form>

        {/* Sugestões */}
        {!cnpj && (
          <div style={{ marginBottom: "1.5rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
              Exemplos para começar:
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {CNPJ_SUGERIDOS.map((s) => (
                <Link
                  key={s.cnpj}
                  href={`/mercado-de-capitais/grafo?cnpj=${s.cnpj}&prof=3`}
                  style={{
                    fontSize: "0.8125rem",
                    padding: "0.3rem 0.75rem",
                    borderRadius: "9999px",
                    textDecoration: "none",
                    border: "1px solid hsl(var(--border))",
                    color: "hsl(var(--primary))",
                    backgroundColor: "hsl(var(--card))",
                  }}
                >
                  {s.label}
                </Link>
              ))}
              <Link
                href="/mercado-de-capitais/fips-monopolio"
                style={{
                  fontSize: "0.8125rem",
                  padding: "0.3rem 0.75rem",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--text-body))",
                  backgroundColor: "hsl(var(--card))",
                }}
              >
                Ver FIPs monopolizados →
              </Link>
            </div>
          </div>
        )}

        {error && (
          <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
            <p style={{ margin: 0, color: "hsl(var(--badge-danger-fg))", fontSize: "0.875rem" }}>
              Erro na consulta: {error}
            </p>
          </div>
        )}

        {cnpj && !error && arestas.length === 0 && (
          <div className="bloomberg-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", textAlign: "center" }}>
            <p style={{ margin: 0, color: "hsl(var(--text-caption))", fontSize: "0.875rem" }}>
              Nenhuma aresta encontrada para <strong>{fmtCnpj(cnpj)}</strong> até a profundidade{" "}
              {prof}. O fundo pode ser um FIP (sem CDA declarada) ou não ter posições em cotas de
              fundo neste período.
            </p>
          </div>
        )}

        {arestas.length > 0 && (
          <>
            {/* Resumo */}
            <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Nós únicos</div>
                <div className="bloomberg-kpi-value">{nos.size.toLocaleString("pt-BR")}</div>
              </div>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Arestas downstream</div>
                <div className="bloomberg-kpi-value">{downstream.length.toLocaleString("pt-BR")}</div>
              </div>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Arestas upstream</div>
                <div className="bloomberg-kpi-value">{upstream.length.toLocaleString("pt-BR")}</div>
              </div>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Profundidade máx. encontrada</div>
                <div className="bloomberg-kpi-value">
                  {arestas.length > 0 ? Math.max(...arestas.map((a) => a.profundidade)) : "—"}
                </div>
              </div>
            </div>

            {/* Downstream */}
            {downstream.length > 0 && (
              <>
                <h2 style={{ fontSize: "1.0625rem", margin: "0 0 0.75rem" }}>
                  Downstream — o que{" "}
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCnpj(cnpj)}</span> detém
                </h2>
                <ArestaTabela arestas={downstream} cnpjSeed={cnpj} />
              </>
            )}

            {/* Upstream */}
            {upstream.length > 0 && (
              <>
                <h2 style={{ fontSize: "1.0625rem", margin: "1.5rem 0 0.75rem" }}>
                  Upstream — quem detém{" "}
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{fmtCnpj(cnpj)}</span>
                </h2>
                <ArestaTabela arestas={upstream} cnpjSeed={cnpj} />
              </>
            )}
          </>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "2rem", lineHeight: 1.6 }}>
          <strong>Cobertura:</strong> universo 555 (fundos abertos) que declaram Composição e
          Diversificação de Carteira (CDA) à CVM. FIPs e FIDCs fechados <em>não</em> declaram CDA —
          sua cadeia interna não está neste grafo. <strong>Fonte:</strong> CDA mensal (Portal de Dados
          Abertos da CVM, licença ODbL).
        </p>
      </div>
    </>
  );
}

function ArestaTabela({ arestas, cnpjSeed }: { arestas: Aresta[]; cnpjSeed: string }) {
  const sorted = [...arestas].sort((a, b) =>
    a.profundidade - b.profundidade || (b.vl_merc ?? 0) - (a.vl_merc ?? 0)
  );

  return (
    <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1rem" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="bloomberg-table" style={{ width: "100%", minWidth: "680px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "center", width: "48px" }}>Salto</th>
              <th>Origem</th>
              <th>Destino</th>
              <th style={{ textAlign: "right" }}>Valor de mercado</th>
              <th style={{ textAlign: "center" }}>Explorar</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((a, i) => (
              <tr key={`${a.cnpj_origem}-${a.cnpj_destino}-${i}`}>
                <td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-caption))" }}>
                  {a.profundidade}
                </td>
                <td style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                  {a.cnpj_origem === cnpjSeed ? (
                    <strong title="Semente">{fmtCnpj(a.cnpj_origem)}</strong>
                  ) : (
                    fmtCnpj(a.cnpj_origem)
                  )}
                </td>
                <td>
                  <span style={{ fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                    {fmtCnpj(a.cnpj_destino)}
                  </span>
                  {a.denom_destino && (
                    <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>
                      {a.denom_destino}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                  {fmtMi(a.vl_merc)}
                </td>
                <td style={{ textAlign: "center" }}>
                  <Link
                    href={`/mercado-de-capitais/grafo?cnpj=${a.cnpj_destino}&prof=3`}
                    style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", textDecoration: "none" }}
                    title={`Explorar a partir de ${fmtCnpj(a.cnpj_destino)}`}
                  >
                    →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
