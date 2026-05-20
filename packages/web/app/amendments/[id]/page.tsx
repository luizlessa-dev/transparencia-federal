import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmendaById } from "~/services/emendas";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function tipoLabel(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("relator")) return "RP9";
  if (t.includes("bancada")) return "Bancada";
  if (t.includes("comissão") || t.includes("comissao")) return "Comissão";
  if (t.includes("individual")) return "Individual";
  return tipo.split(" ")[0];
}

function tipoBadge(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("relator")) return "badge-danger";
  if (t.includes("bancada")) return "badge-warn";
  if (t.includes("comissão") || t.includes("comissao")) return "badge-neutral";
  return "badge-success";
}

export default async function AmendmentDetailPage({ params }: Props) {
  const { id } = await params;
  const emenda = await getEmendaById(id);

  if (!emenda) notFound();

  const execucao = emenda.valor_empenhado > 0
    ? (emenda.valor_pago / emenda.valor_empenhado) * 100
    : 0;

  const rows: { label: string; value: string; mono?: boolean }[] = [
    { label: "Código da Emenda", value: emenda.codigo_emenda, mono: true },
    { label: "Número da Emenda", value: emenda.numero_emenda ?? "—", mono: true },
    { label: "Ano", value: String(emenda.ano), mono: true },
    { label: "Tipo", value: emenda.tipo_emenda },
    { label: "Autor", value: emenda.autor_nome ?? "RELATOR GERAL" },
    { label: "Função", value: emenda.funcao ?? "—" },
    { label: "Sub-função", value: emenda.subfuncao ?? "—" },
    { label: "Localidade", value: emenda.localidade ?? "—" },
    { label: "UF", value: emenda.uf ?? "—", mono: true },
    { label: "Município", value: emenda.municipio ?? "—" },
  ];

  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <Link href="/amendments"
            style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", textDecoration: "none", fontFamily: "var(--font-mono)", display: "inline-block", marginBottom: "0.75rem" }}>
            ← Emendas
          </Link>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, marginTop: "0.25rem", backgroundColor: "hsl(var(--primary))" }} />
            <div>
              <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.375rem 0", lineHeight: 1.2 }}>
                {emenda.autor_nome ?? "RELATOR GERAL"}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                <span className={tipoBadge(emenda.tipo_emenda)}>{tipoLabel(emenda.tipo_emenda)}</span>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                  {emenda.codigo_emenda}
                </span>
                <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                  {emenda.ano}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* KPIs financeiros */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Empenhado</div>
            <div className="bloomberg-kpi-value">{fmtBRL(emenda.valor_empenhado)}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Liquidado</div>
            <div className="bloomberg-kpi-value">{fmtBRL(emenda.valor_liquidado)}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Pago</div>
            <div className="bloomberg-kpi-value">{fmtBRL(emenda.valor_pago)}</div>
          </div>
          <div className="bloomberg-kpi">
            <div className="bloomberg-kpi-label">Execução</div>
            <div className="bloomberg-kpi-value"
              style={{ color: execucao >= 70 ? "hsl(var(--success))" : execucao >= 30 ? "hsl(var(--warning))" : "hsl(var(--danger))" }}>
              {execucao.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Barra de execução */}
        <div className="bloomberg-card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))" }}>
              Execução Orçamentária
            </span>
            <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))" }}>
              {fmtBRL(emenda.valor_pago)} / {fmtBRL(emenda.valor_empenhado)}
            </span>
          </div>
          <div style={{ height: "8px", backgroundColor: "hsl(var(--border))", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${Math.min(execucao, 100)}%`,
              backgroundColor: execucao >= 70 ? "hsl(var(--success))" : execucao >= 30 ? "hsl(var(--warning))" : "hsl(var(--danger))",
              borderRadius: "2px",
              transition: "width 0.4s ease",
            }} />
          </div>

          {/* Restos a pagar */}
          {(emenda.valor_resto_inscrito > 0 || emenda.valor_resto_cancelado > 0 || emenda.valor_resto_pago > 0) && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid hsl(var(--border))" }}>
              <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.625rem" }}>
                Restos a Pagar
              </div>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                {[
                  { label: "Inscrito", value: emenda.valor_resto_inscrito },
                  { label: "Cancelado", value: emenda.valor_resto_cancelado },
                  { label: "Pago", value: emenda.valor_resto_pago },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginBottom: "0.125rem" }}>{label}</div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-mono)", color: "hsl(var(--text-headline))" }}>
                      {fmtBRL(value)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Ficha completa */}
        <div className="bloomberg-card">
          <div style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", marginBottom: "0.875rem" }}>
            Dados da Emenda
          </div>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <tbody>
              {rows.map(({ label, value, mono }) => (
                <tr key={label}>
                  <td style={{ width: "40%", color: "hsl(var(--text-caption))", fontSize: "0.8125rem", paddingLeft: 0 }}>
                    {label}
                  </td>
                  <td style={{
                    fontWeight: 600,
                    color: "hsl(var(--text-headline))",
                    fontSize: "0.875rem",
                    fontFamily: mono ? "var(--font-mono)" : undefined,
                  }}>
                    {value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Aviso RP9 */}
        {emenda.eh_rp9 && (
          <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(350 73% 65% / 0.3)", borderRadius: "2px" }}>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: 0 }}>
              <strong style={{ color: "hsl(350 73% 65%)" }}>Emenda do Relator (RP9)</strong>{" "}
              — Este tipo de emenda foi declarado inconstitucional pelo STF em 2021 por falta de transparência.{" "}
              <Link href="/rp9" style={{ color: "hsl(var(--primary))", fontWeight: 600, textDecoration: "none" }}>
                Ver análise completa →
              </Link>
            </p>
          </div>
        )}

      </div>
    </>
  );
}
