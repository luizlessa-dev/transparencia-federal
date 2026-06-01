/**
 * Pagamentos a empresas sancionadas — Executivo de MG.
 * Empenhos (dinheiro efetivamente pago/liquidado) a fornecedores sancionados.
 * Complementa /mg/contratos-sancionados (contrato assinado) com o que de fato saiu.
 * Rota: /mg/pagamentos-sancionados
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";
import { getUser, hasPaidAccess } from "~/lib/supabase-auth";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pagamentos a empresas sancionadas — Governo de MG | The BR Insider",
  description:
    "Empenhos pagos pelo Estado de Minas Gerais a fornecedores condenados pela Lei Anticorrupção. Não só contrato assinado: dinheiro que saiu do caixa.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/pagamentos-sancionados" },
};

const FREE_LIMIT = 20;

type Emp = {
  credor: string | null; orgao: string | null; cnpj_norm: string | null;
  elemento_despesa: string | null; valor_pago: number | null; valor_liquidado: number | null;
  ano: number | null;
};
type Sanc = { cnpj_norm: string | null; conduta: string | null; decisao: string | null; fase: string | null };

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
}
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const condenadaDe = (d: string | null) => !!d && !/arquiv/i.test(d) && !/absolv/i.test(d);

export default async function MgPagamentosSancionadosPage() {
  const user = await getUser();
  const pago = user ? await hasPaidAccess(user.id) : false;

  const sb = getSupabase();
  const [{ data: empData }, { data: sancData }] = await Promise.all([
    sb.from("mg_empenhos_sancionados").select("credor,orgao,cnpj_norm,elemento_despesa,valor_pago,valor_liquidado,ano"),
    sb.from("mg_empresas_sancionadas").select("cnpj_norm,conduta,decisao,fase"),
  ]);

  const sancMap = new Map<string, Sanc>();
  for (const s of (sancData ?? []) as Sanc[]) if (s.cnpj_norm) sancMap.set(s.cnpj_norm, s);

  const empenhos = ((empData ?? []) as Emp[])
    .map((e) => ({ ...e, s: e.cnpj_norm ? sancMap.get(e.cnpj_norm) : undefined }))
    .filter((e) => condenadaDe(e.s?.decisao ?? null)) // só credor CONDENADO
    .sort((a, b) => (Number(b.valor_pago) || 0) - (Number(a.valor_pago) || 0));

  const totalPago = empenhos.reduce((s, e) => s + (Number(e.valor_pago) || 0), 0);
  const empresas = new Set(empenhos.map((e) => e.cnpj_norm)).size;
  const visiveis = pago ? empenhos : empenhos.slice(0, FREE_LIMIT);
  const top = empenhos[0];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Pagamentos a sancionadas</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Pagamentos a empresas sancionadas</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "640px" }}>
            Empenhos <strong>efetivamente pagos</strong> pelo Estado a fornecedores condenados pela
            Lei Anticorrupção. Diferente do contrato assinado, aqui é o dinheiro que saiu do caixa.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        {top && (
          <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
              <strong>{top.credor}</strong>, condenada por “{(top.s?.conduta ?? "").toLowerCase()}”, recebeu{" "}
              <strong>{fmtBRL(top.valor_pago)}</strong> pagos de {top.orgao}.
            </p>
          </div>
        )}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Empenhos a condenadas" value={fmtNum(empenhos.length)} />
          <Kpi label="Total pago" value={fmtBRL(totalPago)} />
          <Kpi label="Empresas" value={fmtNum(empresas)} />
        </div>

        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Credor</th><th>Órgão / Elemento</th><th style={{ textAlign: "right" }}>Pago</th><th>Punição</th></tr></thead>
            <tbody>
              {visiveis.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{e.credor ?? "—"}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                    <div>{e.orgao ?? "—"}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{e.elemento_despesa}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(e.valor_pago)}</td>
                  <td style={{ fontSize: "0.72rem", color: "hsl(var(--text-body))" }}>{e.s?.conduta ?? "—"}<div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>{e.s?.fase}</div></td>
                </tr>
              ))}
              {empenhos.length === 0 && <tr><td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum pagamento a empresa condenada no recorte.</td></tr>}
            </tbody>
          </table>
        </div>

        {!pago && empenhos.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso titulo={`Veja todos os ${fmtNum(empenhos.length)} pagamentos`} descricao={`Mostrando os ${FREE_LIMIT} maiores.`} next="/mg/pagamentos-sancionados" />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> empenhos do Estado (portal de empenhos de MG) cujo credor consta,
          por CNPJ, na lista de empresas <em>condenadas</em> pela Lei Anticorrupção (CGE-MG). Processos
          arquivados/absolvidos ficam fora. “Pago” é o valor financeiro efetivamente pago. Dados públicos (CC-BY-4.0).
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
