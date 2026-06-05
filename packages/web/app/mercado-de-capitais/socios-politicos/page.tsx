/**
 * Sócios políticos no mercado de capitais.
 * View cvm_socio_politico: parlamentares da câmara que figuram como sócios de
 * empresas no QSA da Receita, cruzado por nome normalizado + CPF parcial.
 * Rota: /mercado-de-capitais/socios-politicos
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getCvmSociosPoliticos } from "~/services/cvm";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deputados sócios de empresas no mercado de capitais | The BR Insider",
  description:
    "Parlamentares da Câmara que aparecem como sócios de empresas atuantes no mercado de capitais — cruzamento entre o QSA da Receita Federal e a base da CVM. Match por nome e CPF parcial.",
  alternates: { canonical: "https://www.thebrinsider.com/mercado-de-capitais/socios-politicos" },
  openGraph: {
    title: "Deputados sócios de empresas no mercado de capitais",
    description: "Cruzamento QSA Receita × parlamentares: quem tem sociedade empresarial no setor financeiro.",
    url: "https://www.thebrinsider.com/mercado-de-capitais/socios-politicos",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deputados sócios de empresas no mercado de capitais",
    description: "QSA Receita × parlamentares. Match nome + CPF parcial.",
  },
};

const FREE_LIMIT = 25;

type Row = {
  deputado_id: number | null;
  politico: string | null;
  sigla_partido: string | null;
  sigla_uf: string | null;
  score_total: number | null;
  cnpj_basico: string | null;
  empresa: string | null;
  capital_social: number | null;
  papel_societario: string | null;
  cpf_socio_mascarado: string | null;
  cpf_confirma: boolean | null;
};

const fmtBRL = (v: number | null | undefined) =>
  v == null || !isFinite(Number(v))
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));

const fmtCnpj = (s: string | null) => {
  if (!s) return "—";
  const d = s.replace(/\D/g, "").padStart(8, "0");
  return d.replace(/^(\d{2})(\d{3})(\d{3})$/, "$1.$2.$3");
};

export default async function SociosPoliticosPage({
  searchParams,
}: {
  searchParams: Promise<{ confirma?: string }>;
}) {
  const sp = await searchParams;
  const somenteConfirmados = sp.confirma === "1";

  const { pago } = await getViewer();
  const { data, error } = await getCvmSociosPoliticos();

  if (error || !data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar dados: {error?.message ?? "resposta vazia"}
        </p>
      </div>
    );
  }

  const rows = (data as unknown as Row[]).filter(
    (r) => !somenteConfirmados || r.cpf_confirma === true
  );
  const confirmados = (data as unknown as Row[]).filter((r) => r.cpf_confirma === true).length;
  const total = (data as unknown as Row[]).length;

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
            <span>Sócios políticos</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.25 }}>
            Deputados como sócios no mercado de capitais
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px" }}>
            Parlamentares da Câmara que constam como sócios de empresas no{" "}
            <strong>Quadro Societário (QSA) da Receita Federal</strong>, cruzados com
            entidades atuantes no mercado de capitais. Match por nome normalizado —
            confirmação por CPF parcial quando disponível.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {/* KPIs */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Total de leads</div>
            <div className="bloomberg-kpi-value">{total.toLocaleString("pt-BR")}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">CPF confirmado</div>
            <div className="bloomberg-kpi-value">{confirmados.toLocaleString("pt-BR")}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Só por nome</div>
            <div className="bloomberg-kpi-value">{(total - confirmados).toLocaleString("pt-BR")}</div>
          </div>
        </div>

        {/* Aviso metodológico */}
        <div
          className="bloomberg-card"
          style={{ padding: "0.875rem 1.25rem", marginBottom: "1.25rem", borderLeft: "3px solid hsl(var(--badge-warn-fg, var(--primary)))", fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}
        >
          <strong>Metodologia:</strong> cruzamento por <em>nome normalizado</em> (sem acentos,
          sem caracteres especiais) entre deputados federais com risco fiscal (
          <Link href="/deputados" style={{ color: "hsl(var(--primary))" }}>base do The BR Insider</Link>) e o
          QSA da Receita. Quando o CPF do sócio (que a Receita mascara mostrando apenas os 6
          dígitos centrais) coincide com o miolo do CPF do deputado, o match é marcado como{" "}
          <strong>confirmado</strong>. Sem CPF, é <strong>lead por nome</strong> — homônimo possível,
          apuração necessária. Nenhum dado aqui constitui acusação.
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <Link
            href="/mercado-de-capitais/socios-politicos"
            style={{
              fontSize: "0.8125rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "9999px",
              textDecoration: "none",
              backgroundColor: !somenteConfirmados ? "hsl(var(--primary))" : "hsl(var(--card))",
              color: !somenteConfirmados ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            Todos ({total.toLocaleString("pt-BR")})
          </Link>
          <Link
            href="/mercado-de-capitais/socios-politicos?confirma=1"
            style={{
              fontSize: "0.8125rem",
              padding: "0.3rem 0.75rem",
              borderRadius: "9999px",
              textDecoration: "none",
              backgroundColor: somenteConfirmados ? "hsl(var(--primary))" : "hsl(var(--card))",
              color: somenteConfirmados ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
              border: "1px solid hsl(var(--border))",
            }}
          >
            CPF confirmado ({confirmados.toLocaleString("pt-BR")})
          </Link>
        </div>

        {/* Tabela */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Deputado</th>
                <th>Partido / UF</th>
                <th>Empresa (CNPJ básico)</th>
                <th>Papel societário</th>
                <th style={{ textAlign: "right" }}>Capital social</th>
                <th style={{ textAlign: "center" }}>CPF</th>
              </tr>
            </thead>
            <tbody>
              {visivel.map((r, i) => (
                <tr key={`${r.deputado_id}-${r.cnpj_basico}-${i}`}>
                  <td style={{ fontWeight: 600 }}>
                    {r.deputado_id ? (
                      <Link
                        href={`/deputados/${r.deputado_id}`}
                        style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
                      >
                        {r.politico ?? "—"}
                      </Link>
                    ) : (
                      r.politico ?? "—"
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {r.sigla_partido ?? "—"} / {r.sigla_uf ?? "—"}
                  </td>
                  <td>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {fmtCnpj(r.cnpj_basico)}
                    </span>
                    {r.empresa && (
                      <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>
                        {r.empresa}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: "0.8125rem" }}>{r.papel_societario ?? "—"}</td>
                  <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    {fmtBRL(r.capital_social)}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {r.cpf_confirma === true ? (
                      <span
                        title="CPF parcial coincide com o QSA"
                        style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "9999px", backgroundColor: "hsl(var(--badge-danger-bg))", color: "hsl(var(--badge-danger-fg))", fontWeight: 600 }}
                      >
                        confirmado
                      </span>
                    ) : (
                      <span
                        title="Match apenas por nome — apurar"
                        style={{ fontSize: "0.75rem", padding: "0.125rem 0.5rem", borderRadius: "9999px", backgroundColor: "hsl(var(--badge-muted-bg, hsl(var(--muted))))", color: "hsl(var(--text-caption))" }}
                      >
                        lead
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {bloqueados > 0 && (
          <ParedeDeAcesso
            titulo={`+${bloqueados.toLocaleString("pt-BR")} registros disponíveis para assinantes`}
            descricao="Acesse o universo completo de parlamentares com sociedade empresarial no mercado de capitais — com filtros por partido, UF e confirmação de CPF."
          />
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> QSA Receita Federal (Cadastro de Empresas, download mensal) ×
          base de deputados do The BR Insider ({" "}
          <Link href="/metodologia" style={{ color: "hsl(var(--primary))" }}>metodologia</Link>). Os
          6 dígitos centrais do CPF são os únicos exibidos pela Receita no QSA — a coincidência
          com o miolo do CPF do deputado eleva a confiança do match, mas não é certeza absoluta.
          Identificou erro?{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>
            /correcoes
          </Link>
        </p>
      </div>
    </>
  );
}
