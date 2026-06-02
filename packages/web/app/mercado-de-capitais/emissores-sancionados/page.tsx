/**
 * Emissores × Sancionadas — empresas que captaram no mercado de capitais
 * (debêntures, cotas, CRI/CRA) e que também aparecem em listas de sanção
 * (CEIS/CNEP federal e CGE-MG). Cruzamento por CNPJ. Rota:
 * /mercado-de-capitais/emissores-sancionados
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCvmEmissoresSancionados } from "~/services/cvm";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Emissores sancionados — quem capta no mercado e está em lista de sanção | The BR Insider",
  description:
    "Empresas que emitiram debêntures, cotas ou recebíveis no mercado de capitais (CVM) e que também figuram em listas de sanção (CEIS/CNEP e CGE-MG). Cruzamento por CNPJ.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais/emissores-sancionados" },
  openGraph: {
    title: "Emissores sancionados — mercado de capitais × listas de sanção",
    description: "Quem captou no mercado e também aparece em CEIS/CNEP ou na CGE-MG. Cruzamento por CNPJ.",
    url: "https://www.thebrinsider.com/mercado-de-capitais/emissores-sancionados",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: "Emissores sancionados — mercado de capitais × listas de sanção", description: "Quem captou no mercado e também está em lista de sanção. Cruzamento por CNPJ." },
};

const FREE_LIMIT = 20;

type Row = {
  cnpj_emissor: string;
  nome_emissor: string | null;
  n_ofertas: number | null;
  valor_total: number | null;
  ultima_oferta: string | null;
  tipos_ativo: string[] | null;
  origem_sancao: string | null;
  sancao_orgao: string | null;
  sancao_ativa: boolean | null;
  condenada: boolean | null;
};

const fmtBRL = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v)) ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function EmissoresSancionadosPage({
  searchParams,
}: {
  searchParams: Promise<{ recorte?: string }>;
}) {
  const sp = await searchParams;
  const recorte = sp.recorte === "todos" ? "todos" : "ativas";

  const { pago } = await getViewer();
  const { data, error } = await getCvmEmissoresSancionados();

  if (error || !data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro ao carregar dados: {error?.message ?? "resposta vazia"}</p>
      </div>
    );
  }

  // Dedup por emissor: mantém a maior captação; agrega flags de sanção.
  const porCnpj = new Map<string, Row & { sancoes: number; temAtiva: boolean }>();
  for (const r of data as Row[]) {
    const ex = porCnpj.get(r.cnpj_emissor);
    if (!ex) {
      porCnpj.set(r.cnpj_emissor, { ...r, sancoes: 1, temAtiva: r.sancao_ativa === true });
    } else {
      ex.sancoes += 1;
      ex.temAtiva = ex.temAtiva || r.sancao_ativa === true;
      if ((Number(r.valor_total) || 0) > (Number(ex.valor_total) || 0)) ex.valor_total = r.valor_total;
    }
  }
  const todos = [...porCnpj.values()].sort((a, b) => (Number(b.valor_total) || 0) - (Number(a.valor_total) || 0));
  const ativas = todos.filter((r) => r.temAtiva);

  const baseLista = recorte === "todos" ? todos : ativas;
  const somaCaptado = baseLista.reduce((s, r) => s + (Number(r.valor_total) || 0), 0);
  const maior = baseLista[0] ?? null;

  const visiveis = pago ? baseLista : baseLista.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mercado-de-capitais" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Mercado de Capitais</Link>
            <span>/</span>
            <span>Emissores sancionados</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Emissores sancionados</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "680px" }}>
            Empresas que <strong>captaram no mercado de capitais</strong> (debêntures, cotas,
            recebíveis registrados na CVM) e que também figuram em listas de sanção — CEIS/CNEP
            (federal) ou CGE-MG. Cruzamento por CNPJ.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {maior && (
          <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
              <strong>{maior.nome_emissor}</strong> captou até <strong>{fmtBRL(maior.valor_total)}</strong> em
              ofertas registradas na CVM e aparece em lista de sanção ({maior.origem_sancao === "MG" ? "CGE-MG" : "CEIS/CNEP"}).
              Ao todo, <strong>{fmtNum(baseLista.length)}</strong> emissores neste recorte somam{" "}
              <strong>{fmtBRL(somaCaptado)}</strong> captados.
            </p>
          </div>
        )}

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Emissores no recorte" value={fmtNum(baseLista.length)} />
          <Kpi label="Total captado" value={fmtBRL(somaCaptado)} />
          <Kpi label="Com sanção ativa" value={fmtNum(ativas.length)} />
          <Kpi label="Total (todos)" value={fmtNum(todos.length)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {([["ativas", "Sanção ativa"], ["todos", "Todos os cruzamentos"]] as [string, string][]).map(([r, label]) => (
            <Link
              key={r}
              href={r === "ativas" ? "/mercado-de-capitais/emissores-sancionados" : `/mercado-de-capitais/emissores-sancionados?recorte=${r}`}
              style={{
                padding: "0.375rem 0.875rem", fontSize: "0.8125rem", fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "4px",
                color: recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent", textDecoration: "none",
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Emissor</th>
                <th>Ativos emitidos</th>
                <th style={{ textAlign: "right" }}>Captado</th>
                <th>Sanção</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r, idx) => (
                <tr key={`${r.cnpj_emissor}-${idx}`}>
                  <td>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{r.nome_emissor ?? "—"}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{r.cnpj_emissor}</div>
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "14rem" }}>
                    {(r.tipos_ativo ?? []).slice(0, 3).join(", ") || "—"}
                    <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>{r.n_ofertas ?? 0} oferta(s)</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-headline))" }}>{fmtBRL(r.valor_total)}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "16rem" }}>
                    <span className={r.temAtiva ? "badge-danger" : "badge-neutral"} style={{ fontSize: "0.625rem" }}>
                      {r.origem_sancao === "MG" ? "CGE-MG" : "CEIS/CNEP"}{r.temAtiva ? " · ativa" : ""}
                    </span>
                    <div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>{r.sancao_orgao}</div>
                  </td>
                </tr>
              ))}
              {visiveis.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum emissor neste recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!pago && baseLista.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              titulo={`Veja todos os ${fmtNum(baseLista.length)} emissores`}
              descricao={`Mostrando os ${FREE_LIMIT} de maior captação. Crie uma conta gratuita para ver a lista completa.`}
              next="/mercado-de-capitais/emissores-sancionados"
            />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> cruzamento por CNPJ entre as ofertas públicas registradas
          na CVM (Portal de Dados Abertos, licença ODbL) e as listas de sanção CEIS/CNEP (Portal da
          Transparência da União) e CGE-MG. O valor é a maior oferta registrada do emissor, não a
          soma de todas. A existência de sanção <em>não</em> implica irregularidade na captação:
          são bases distintas reunidas por CNPJ para apuração. Recorte padrão = sanção ativa hoje.
          Empresa que identificar erro pode pedir correção em{" "}
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
