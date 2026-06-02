/**
 * Painel do Executivo de Minas Gerais — hub de todos os eixos, em seções.
 * Cada card traz o número vivo do eixo. Rota: /mg
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Governo de Minas Gerais — Fiscalização do Executivo | The BR Insider",
  description:
    "Observatório do Poder Executivo de Minas Gerais: supersalários, contratos e pagamentos a empresas sancionadas, sobrepreço, notas fiscais e compras por fornecedor, emendas, organizações sociais, voos oficiais e mais.",
  alternates: { canonical: "https://www.thebrinsider.com/mg" },
  openGraph: { title: "Governo de Minas Gerais — Fiscalização do Executivo | The BR Insider", description: "Observatório do Executivo de MG: supersalários, contratos × sancionadas, sobrepreço, notas fiscais, compras, emendas, organizações sociais, voos oficiais e mais.", url: "https://www.thebrinsider.com/mg", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
  twitter: { card: "summary_large_image", title: "Governo de Minas Gerais — Fiscalização do Executivo | The BR Insider", description: "Observatório do Executivo de MG: 22 eixos de fiscalização a partir dos dados abertos do Estado." },
};

const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const fmtCompact = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(v);
const n = (v: unknown) => Number(v) || 0;

export default async function MgPainelPage() {
  const sb = getSupabase();
  const [
    supersal, contratos, obrasParadas, convenios, pagamentos, covidSob, terceir, reparacao,
    lrf, diarias, restos, licit, emendasFed,
    notasR, comprasR, emEstR, os, convEnt, doacoes, voos, valeP, ipsemg,
  ] = await Promise.all([
    sb.from("mg_supersalarios").select("*", { count: "exact", head: true }),
    sb.from("mg_contratos_sancionados").select("valor_total,condenada"),
    sb.from("mg_obras_paradas").select("*", { count: "exact", head: true }),
    sb.from("mg_convenios").select("*", { count: "exact", head: true }),
    sb.from("mg_pagamentos_condenadas").select("valor_pago"),
    sb.from("mg_covid_sobrepreco").select("*", { count: "exact", head: true }),
    sb.from("mg_terceirizados").select("cnpj_norm"),
    sb.from("mg_reparacao_vale").select("valor"),
    sb.from("mg_lrf_limites").select("ano_ref,pct_dtp,pct_prudencial").order("ano_ref", { ascending: false }).limit(1),
    sb.from("mg_diarias_orgao").select("vr_pago").eq("ano", 2025),
    sb.from("mg_restos_orgao").select("vr_inscrito").eq("ano", 2025),
    sb.from("mg_licitacao_sobrepreco_por_ano").select("total"),
    sb.from("mg_emendas_federais").select("valor_indicado"),
    sb.from("mg_notas_resumo").select("total,fornecedores").maybeSingle(),
    sb.from("mg_compras_resumo").select("total,fornecedores").maybeSingle(),
    sb.from("mg_emendas_estaduais_resumo").select("total,autores").maybeSingle(),
    sb.from("mg_os_parcerias").select("vr_repasse_atualizado"),
    sb.from("mg_convenios_entrada").select("*", { count: "exact", head: true }),
    sb.from("mg_doacoes").select("*", { count: "exact", head: true }),
    sb.from("mg_voos_governador").select("*", { count: "exact", head: true }),
    sb.from("mg_despesa_pessoal_vale").select("*", { count: "exact", head: true }),
    sb.from("mg_ipsemg_contratos").select("*", { count: "exact", head: true }),
  ]);

  const contratosCond = ((contratos.data ?? []) as { valor_total: number | null; condenada: boolean | null }[]).filter((r) => r.condenada);
  const somaContratos = contratosCond.reduce((s, r) => s + n(r.valor_total), 0);
  const somaPago = ((pagamentos.data ?? []) as { valor_pago: number | null }[]).reduce((s, r) => s + n(r.valor_pago), 0);
  const empresasTerc = new Set(((terceir.data ?? []) as { cnpj_norm: string | null }[]).map((r) => r.cnpj_norm)).size;
  const somaReparacao = ((reparacao.data ?? []) as { valor: number | null }[]).reduce((s, r) => s + n(r.valor), 0);
  const lrfRow = ((lrf.data ?? []) as { pct_dtp: number | null; pct_prudencial: number | null }[])[0];
  const lrfPct = n(lrfRow?.pct_dtp);
  const lrfAcimaPrud = lrfPct >= (n(lrfRow?.pct_prudencial) || 100);
  const somaDiarias = ((diarias.data ?? []) as { vr_pago: number | null }[]).reduce((s, r) => s + n(r.vr_pago), 0);
  const somaRestos = ((restos.data ?? []) as { vr_inscrito: number | null }[]).reduce((s, r) => s + n(r.vr_inscrito), 0);
  const somaSobrepreco = ((licit.data ?? []) as { total: number | null }[]).reduce((s, r) => s + n(r.total), 0);
  const somaEmendasFed = ((emendasFed.data ?? []) as { valor_indicado: number | null }[]).reduce((s, r) => s + n(r.valor_indicado), 0);
  const somaOS = ((os.data ?? []) as { vr_repasse_atualizado: number | null }[]).reduce((s, r) => s + n(r.vr_repasse_atualizado), 0);
  const rNotas = notasR.data as { total: string; fornecedores: number } | null;
  const rCompras = comprasR.data as { total: string; fornecedores: number } | null;
  const rEmEst = emEstR.data as { total: string; autores: number } | null;

  const sections: { titulo: string; cards: { href: string; titulo: string; num: string; sub: string; tom: string }[] }[] = [
    {
      titulo: "Irregularidades & risco",
      cards: [
        { href: "/mg/supersalarios", titulo: "Supersalários", num: fmtNum(supersal.count ?? 0), sub: "servidores acima do teto", tom: "danger" },
        { href: "/mg/contratos-sancionados", titulo: "Contratos × sancionadas", num: fmtCompact(somaContratos), sub: `${fmtNum(contratosCond.length)} contratos de condenadas`, tom: "danger" },
        { href: "/mg/pagamentos-sancionados", titulo: "Pagamentos a sancionadas", num: fmtCompact(somaPago), sub: "pagos a empresas condenadas", tom: "danger" },
        { href: "/mg/licitacoes", titulo: "Sobrepreço em licitações", num: fmtCompact(somaSobrepreco), sub: "homologado acima da referência", tom: "warn" },
        { href: "/mg/covid", titulo: "Compras COVID-19", num: fmtNum(covidSob.count ?? 0), sub: "itens acima do preço de referência", tom: "warn" },
        { href: "/mg/obras", titulo: "Obras (DER)", num: fmtNum(obrasParadas.count ?? 0), sub: "obras paralisadas", tom: "warn" },
      ],
    },
    {
      titulo: "Fornecedores — quem fatura com o Estado",
      cards: [
        { href: "/mg/notas", titulo: "Notas fiscais", num: fmtCompact(n(rNotas?.total)), sub: `${fmtNum(n(rNotas?.fornecedores))} fornecedores (2022–26)`, tom: "" },
        { href: "/mg/compras", titulo: "Compras (SIAD)", num: fmtCompact(n(rCompras?.total)), sub: `${fmtNum(n(rCompras?.fornecedores))} fornecedores`, tom: "" },
        { href: "/mg/terceirizados", titulo: "Terceirizados", num: fmtNum(empresasTerc), sub: "empresas fornecedoras", tom: "" },
        { href: "/mg/organizacoes-sociais", titulo: "Organizações sociais", num: fmtCompact(somaOS), sub: "repassado via contratos de gestão", tom: "" },
      ],
    },
    {
      titulo: "Transferências & emendas",
      cards: [
        { href: "/mg/emendas-federais", titulo: "Emendas federais", num: fmtCompact(somaEmendasFed), sub: "indicados a MG", tom: "" },
        { href: "/mg/emendas-estaduais", titulo: "Emendas estaduais (LOA)", num: fmtCompact(n(rEmEst?.total)), sub: `${fmtNum(n(rEmEst?.autores))} autores`, tom: "" },
        { href: "/mg/convenios", titulo: "Convênios de saída", num: fmtNum(convenios.count ?? 0), sub: "repasses do Estado", tom: "" },
        { href: "/mg/convenios-entrada", titulo: "Convênios de entrada", num: fmtNum(convEnt.count ?? 0), sub: "recursos que entram", tom: "" },
        { href: "/mg/reparacao", titulo: "Acordo Vale / Brumadinho", num: fmtCompact(somaReparacao), sub: "em iniciativas de reparação", tom: "" },
        { href: "/mg/doacoes", titulo: "Doações e comodatos", num: fmtNum(doacoes.count ?? 0), sub: "doações ao Estado", tom: "" },
      ],
    },
    {
      titulo: "Pessoal & gestão fiscal",
      cards: [
        { href: "/mg/lrf", titulo: "Despesa com pessoal (LRF)", num: lrfPct ? `${lrfPct.toFixed(1).replace(".", ",")}%` : "—", sub: `da RCL — ${lrfAcimaPrud ? "acima do prudencial" : "dentro do limite"}`, tom: lrfAcimaPrud ? "danger" : "" },
        { href: "/mg/pessoal-vale", titulo: "Pessoal · Acordo Vale", num: fmtNum(valeP.count ?? 0), sub: "pagamentos de pessoal (Brumadinho)", tom: "" },
        { href: "/mg/restos", titulo: "Restos a pagar", num: fmtCompact(somaRestos), sub: "inscritos em 2025", tom: "warn" },
        { href: "/mg/diarias", titulo: "Diárias por órgão", num: fmtCompact(somaDiarias), sub: "pagas em diárias em 2025", tom: "" },
      ],
    },
    {
      titulo: "Transparência & contexto",
      cards: [
        { href: "/mg/voos", titulo: "Voos do Governador", num: fmtNum(voos.count ?? 0), sub: "trechos em aeronave oficial", tom: "" },
        { href: "/mg/ipsemg", titulo: "Credenciados IPSEMG", num: fmtNum(ipsemg.count ?? 0), sub: "rede de saúde do servidor", tom: "" },
      ],
    },
  ];

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem 2rem", maxWidth: "1040px" }}>
          <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--accent))" }}>
            The BR Insider · Governos Estaduais
          </span>
          <h1 style={{ fontSize: "1.875rem", margin: "0.5rem 0 0", lineHeight: 1.2 }}>Governo de Minas Gerais</h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", margin: "0.625rem 0 0", maxWidth: "680px", lineHeight: 1.6 }}>
            Observatório do <strong>Poder Executivo</strong> mineiro a partir do Portal de Dados Abertos
            do Estado — 22 eixos de fiscalização, cada um atualizado direto da fonte oficial.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1040px" }}>
        {sections.map((sec) => (
          <div key={sec.titulo} style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "0.8125rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "hsl(var(--text-caption))", margin: "0 0 0.875rem", borderBottom: "1px solid hsl(var(--border))", paddingBottom: "0.5rem" }}>
              {sec.titulo}
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {sec.cards.map((c) => (
                <Link key={c.href} href={c.href} className="bloomberg-card" style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "hsl(var(--text-headline))", marginBottom: "0.5rem" }}>{c.titulo}</div>
                  <div style={{ fontSize: "1.75rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.1,
                    color: c.tom === "danger" ? "hsl(var(--badge-danger-fg))" : c.tom === "warn" ? "hsl(var(--accent))" : "hsl(var(--primary))" }}>
                    {c.num}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>{c.sub}</div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "0.5rem", lineHeight: 1.6 }}>
          Fonte: Portal de Dados Abertos do Estado de Minas Gerais (CGE, SEPLAG, SEF, DER, SEGOV), licença
          CC-BY-4.0. Projeto independente, sem vínculo com o Governo de MG. Cada página traz a metodologia
          e o recorte editorial do respectivo eixo.
        </p>
      </div>
    </>
  );
}
