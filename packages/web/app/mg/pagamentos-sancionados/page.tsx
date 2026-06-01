/**
 * Pagamentos a empresas sancionadas — Executivo de MG.
 * Empenhos (dinheiro efetivamente pago/liquidado) a fornecedores CONDENADOS
 * (view mg_pagamentos_condenadas). Complementa /mg/contratos-sancionados
 * (contrato assinado) com o que de fato saiu do caixa. Histórico 2022–2026.
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
    "Empenhos pagos pelo Estado de Minas Gerais a fornecedores condenados pela Lei Anticorrupção entre 2022 e 2026. Não só contrato assinado: dinheiro que saiu do caixa.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/pagamentos-sancionados" },
};

const FREE_LIMIT = 20;

type Pg = {
  credor: string | null; orgao: string | null; cnpj_norm: string | null;
  elemento_despesa: string | null; valor_pago: number | null; ano: number | null;
  conduta: string | null; decisao: string | null; fase: string | null;
};

const num = (v: number | string | null | undefined) => (v == null ? 0 : Number(v));
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

export default async function MgPagamentosSancionadosPage() {
  const user = await getUser();
  const pago = user ? await hasPaidAccess(user.id) : false;

  const sb = getSupabase();
  const { data, error } = await sb
    .from("mg_pagamentos_condenadas")
    .select("credor,orgao,cnpj_norm,elemento_despesa,valor_pago,ano,conduta,decisao,fase");

  if (error || !data) {
    return (<div className="container" style={{ padding: "3rem 1.5rem" }}><p style={{ color: "hsl(var(--badge-danger-fg))" }}>Erro: {error?.message ?? "vazio"}</p></div>);
  }
  const empenhos = (data as Pg[]).slice().sort((a, b) => num(b.valor_pago) - num(a.valor_pago));
  const totalPago = empenhos.reduce((s, e) => s + num(e.valor_pago), 0);

  // ── agregação por empresa ──
  const porEmpMap = new Map<string, { credor: string | null; conduta: string | null; fase: string | null; n: number; total: number }>();
  for (const e of empenhos) {
    const k = e.cnpj_norm ?? "?";
    const a = porEmpMap.get(k) ?? { credor: e.credor, conduta: e.conduta, fase: e.fase, n: 0, total: 0 };
    a.n++; a.total += num(e.valor_pago); porEmpMap.set(k, a);
  }
  const porEmpresa = [...porEmpMap.values()].sort((a, b) => b.total - a.total);

  // ── por ano ──
  const porAnoMap = new Map<number, number>();
  for (const e of empenhos) if (e.ano) porAnoMap.set(e.ano, (porAnoMap.get(e.ano) ?? 0) + num(e.valor_pago));
  const porAno = [...porAnoMap.entries()].sort((a, b) => a[0] - b[0]);

  const top = porEmpresa[0];
  const visiveis = pago ? empenhos : empenhos.slice(0, FREE_LIMIT);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link>
            <span>/</span><span>Pagamentos a sancionadas</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Pagamentos a empresas sancionadas (2022–2026)</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "660px", lineHeight: 1.6 }}>
            Empenhos <strong>efetivamente pagos</strong> pelo Estado a fornecedores condenados pela
            Lei Anticorrupção. Diferente do contrato assinado, aqui é o dinheiro que saiu do caixa.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        {top && (
          <div className="bloomberg-card" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
              <strong>{top.credor}</strong>, condenada por “{(top.conduta ?? "").toLowerCase()}”, recebeu{" "}
              <strong>{fmtBRL(top.total)}</strong> em {fmtNum(top.n)} empenhos entre 2022 e 2026 — dinheiro
              pago após o trânsito em julgado da condenação.
            </p>
          </div>
        )}

        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Total pago a condenadas" value={fmtCompact(totalPago)} />
          <Kpi label="Empresas condenadas" value={fmtNum(porEmpresa.length)} />
          <Kpi label="Empenhos" value={fmtNum(empenhos.length)} />
          <Kpi label="Maior credor" value={fmtCompact(top?.total ?? 0)} />
        </div>

        {/* ── por ano ── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {porAno.map(([ano, v]) => (
            <div key={ano} className="bloomberg-card" style={{ padding: "0.625rem 0.875rem", flex: "1 1 120px", minWidth: "110px" }}>
              <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{ano}{ano === 2026 ? " (parcial)" : ""}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtCompact(v)}</div>
            </div>
          ))}
        </div>

        {/* ── resumo por empresa ── */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Por empresa condenada</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Empresa</th><th>Conduta condenada</th><th style={{ textAlign: "center" }}>Empenhos</th><th style={{ textAlign: "right" }}>Pago</th></tr></thead>
            <tbody>
              {porEmpresa.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{e.credor ?? "—"}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>{e.conduta ?? "—"}<div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>{e.fase}</div></td>
                  <td style={{ textAlign: "center", fontVariantNumeric: "tabular-nums", fontSize: "0.8125rem" }}>{fmtNum(e.n)}</td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "hsl(var(--badge-danger-fg))" }}>{fmtBRL(e.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── detalhe dos empenhos ── */}
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Detalhe dos empenhos</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: "3rem", textAlign: "center" }}>Ano</th><th>Credor</th><th>Órgão / Elemento</th><th style={{ textAlign: "right" }}>Pago</th></tr></thead>
            <tbody>
              {visiveis.map((e, i) => (
                <tr key={i}>
                  <td style={{ textAlign: "center", fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontVariantNumeric: "tabular-nums" }}>{e.ano}</td>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>{e.credor ?? "—"}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                    <div>{e.orgao ?? "—"}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{e.elemento_despesa}</div>
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtBRL(num(e.valor_pago))}</td>
                </tr>
              ))}
              {empenhos.length === 0 && <tr><td colSpan={4} style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>Nenhum pagamento a empresa condenada no recorte.</td></tr>}
            </tbody>
          </table>
        </div>

        {!pago && empenhos.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso titulo={`Veja todos os ${fmtNum(empenhos.length)} empenhos`} descricao={`Mostrando os ${FREE_LIMIT} maiores. Crie uma conta gratuita para ver a lista completa.`} next="/mg/pagamentos-sancionados" />
          </div>
        )}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Metodologia:</strong> empenhos do Estado (portal de empenhos de MG, exercícios 2022–2026)
          cujo credor consta, por CNPJ, na lista de empresas <em>condenadas</em> pela Lei Anticorrupção
          (CGE-MG), com decisão condenatória — processos arquivados ou de absolvição ficam fora. “Pago” é o
          valor financeiro efetivamente liquidado e quitado. Dados públicos (CC-BY-4.0). Projeto independente.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
