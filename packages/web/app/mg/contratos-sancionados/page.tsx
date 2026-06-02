/**
 * Contratos × Empresas Sancionadas — Executivo de Minas Gerais.
 * Fornecedores com processo sancionatório (Lei Anticorrupção) que mantêm
 * contrato com o Estado. Lidera por CONDENADA (exclui arquivados/absolvidos).
 * Rota: /mg/contratos-sancionados
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgContratosSancionados } from "~/services/mg";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contratos com Empresas Sancionadas — Governo de MG | The BR Insider",
  description:
    "Fornecedores punidos pela Lei Anticorrupção que mantêm contrato com o Estado de Minas Gerais. Cruzamento por CNPJ entre contratos e empresas sancionadas pela CGE-MG.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/contratos-sancionados" },
  openGraph: {
    title: "Contratos com empresas sancionadas — Governo de MG",
    description: "Quem foi punido por fraude/conluio e segue contratando com o Estado.",
    url: "https://www.thebrinsider.com/mg/contratos-sancionados",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

const FREE_LIMIT = 20;

type Row = {
  fornecedor: string | null;
  cnpj_fmt: string | null;
  cnpj_norm: string | null;
  orgao: string | null;
  objeto: string | null;
  valor_total: number | null;
  situacao: string | null;
  conduta: string | null;
  decisao: string | null;
  fase: string | null;
  condenada: boolean | null;
};

type Recorte = "condenadas" | "todos";

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}
function fmtNum(v: number): string {
  return new Intl.NumberFormat("pt-BR").format(v);
}
function truncar(s: string | null, n: number): string {
  if (!s) return "—";
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

export default async function MgContratosSancionadosPage({
  searchParams,
}: {
  searchParams: Promise<{ recorte?: string }>;
}) {
  const sp = await searchParams;
  const recorte = (sp.recorte === "todos" ? "todos" : "condenadas") as Recorte;

  const { pago } = await getViewer();

  const { data, error } = await getMgContratosSancionados();

  if (error || !data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro ao carregar dados: {error?.message ?? "resposta vazia"}</p>
      </div>
    );
  }

  const todas = data as Row[];
  const condenadas = todas.filter((r) => r.condenada === true);

  // KPIs sempre sobre o recorte CONDENADAS (o defensável).
  const cnpjsCondenados = new Set(condenadas.map((r) => r.cnpj_norm));
  const somaContratos = condenadas.reduce((s, r) => s + (Number(r.valor_total) || 0), 0);
  const maior = condenadas[0] ?? null; // view já ordena condenada desc, valor desc
  const arquivados = todas.length - condenadas.length;

  const linhas = recorte === "todos" ? todas : condenadas;
  const visiveis = pago ? linhas : linhas.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1040px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span>
            <span>Contratos com sancionadas</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
            Contratos com empresas sancionadas
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "660px" }}>
            Empresas <strong>condenadas</strong> em processo da Lei Anticorrupção (CGE-MG) que
            mantêm contrato com o Estado. Cruzamento por CNPJ entre contratos e a lista de
            sancionadas. Exclui processos arquivados.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {/* Lead dinâmico */}
        {maior && (
          <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
              <strong>{maior.fornecedor}</strong>, condenada por “{(maior.conduta ?? "").toLowerCase()}”,
              mantém contrato de <strong>{fmtBRL(maior.valor_total)}</strong> com {maior.orgao}.
              Ao todo, <strong>{fmtNum(cnpjsCondenados.size)}</strong> empresas condenadas somam{" "}
              <strong>{fmtBRL(somaContratos)}</strong> em contratos firmados com o Estado entre
              2022 e 2026 (inclui vigentes e vencidos).
            </p>
          </div>
        )}

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Contratos (condenadas)" value={fmtNum(condenadas.length)} />
          <Kpi label="Total contratado 22–26" value={fmtBRL(somaContratos)} />
          <Kpi label="Empresas condenadas" value={fmtNum(cnpjsCondenados.size)} />
          <Kpi label="Processos arquivados" value={fmtNum(arquivados)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {([["condenadas", "Condenadas"], ["todos", "Todos os processos"]] as [Recorte, string][]).map(([r, label]) => (
            <Link
              key={r}
              href={r === "condenadas" ? "/mg/contratos-sancionados" : `/mg/contratos-sancionados?recorte=${r}`}
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
                <th>Fornecedor</th>
                <th>Órgão / Objeto</th>
                <th style={{ textAlign: "right" }}>Contrato</th>
                <th>Punição</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r, idx) => (
                <tr key={`${r.cnpj_norm}-${idx}`}>
                  <td>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{r.fornecedor ?? "—"}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{r.cnpj_fmt}</div>
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                    <div>{r.orgao ?? "—"}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{truncar(r.objeto, 80)}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "hsl(var(--text-headline))" }}>
                    {fmtBRL(r.valor_total)}
                    <div style={{ fontSize: "0.625rem", fontWeight: 400, color: "hsl(var(--text-caption))" }}>{r.situacao}</div>
                  </td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", maxWidth: "16rem" }}>
                    <div>{r.conduta ?? "—"}</div>
                    <span
                      className={r.condenada ? "badge-danger" : "badge-neutral"}
                      style={{ fontSize: "0.625rem", marginTop: "0.125rem" }}
                    >
                      {r.condenada ? "condenada" : "arquivado"}
                    </span>
                    <span style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))", marginLeft: "0.375rem" }}>{r.fase}</span>
                  </td>
                </tr>
              ))}
              {visiveis.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum registro neste recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {!pago && linhas.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              titulo={`Veja todos os ${fmtNum(linhas.length)} contratos`}
              descricao={`Mostrando os ${FREE_LIMIT} de maior valor. Crie uma conta gratuita para ver a lista completa.`}
              next="/mg/contratos-sancionados"
            />
          </div>
        )}

        {pago && (
          <div style={{ marginTop: "1rem" }}>
            <a
              href="/api/export/mg-contratos"
              download
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                padding: "0.375rem 0.875rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                color: "hsl(var(--text-body))",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              ↓ Baixar contratos × sancionadas (.csv)
            </a>
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> cruzamento por CNPJ entre os contratos do Estado
          (portal de compras de MG, anos de assinatura 2022–2026) e a lista de empresas
          processadas pela Lei Anticorrupção (CGE-MG). Os valores são o total de cada contrato
          no período (vigentes e vencidos), não gasto anual. <strong>“Condenada”</strong> = processo com decisão
          condenatória; processos <em>arquivados</em> ou absolvidos NÃO são tratados como sanção
          e ficam fora do recorte principal. A coluna <em>fase</em> indica se a decisão transitou
          em julgado ou ainda cabe recurso. São pessoas jurídicas; dados públicos (CC-BY-4.0).
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
