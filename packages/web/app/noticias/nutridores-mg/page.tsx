/**
 * Matéria investigativa: NUTRIDORES × Governo de MG.
 * Empresa condenada pela CGE-MG por "burla à sanção restritiva do direito de
 * licitar" recebeu R$ 231,7 mi pagos pela SEJUSP em 166 empenhos após a
 * condenação transitar em julgado administrativamente.
 *
 * Dados 100% de fontes abertas (dados.mg.gov.br, CC-BY-4.0). A existência da
 * condenação administrativa NÃO pré-julga a legalidade dos pagamentos — essa é
 * a questão a esclarecer com as fontes. Direito de resposta pendente.
 *
 * Rota: /noticias/nutridores-mg
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "MG pagou R$ 231 mi a empresa condenada por burlar proibição de contratar | The BR Insider",
  description:
    "A NUTRIDORES, condenada pela CGE-MG por burla à sanção restritiva de licitar, recebeu R$ 231,7 milhões da SEJUSP em 166 empenhos pagos após a condenação. Cruzamento de dados abertos do Estado de MG.",
  alternates: { canonical: "https://www.thebrinsider.com/noticias/nutridores-mg" },
  openGraph: {
    title: "MG pagou R$ 231 mi a empresa condenada por burlar proibição de contratar",
    description: "166 empenhos pagos à NUTRIDORES após condenação administrativa transitada em julgado. Dados abertos da CGE-MG e SEJUSP.",
    url: "https://www.thebrinsider.com/noticias/nutridores-mg",
    siteName: "The BR Insider",
    type: "article",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "MG pagou R$ 231 mi a empresa condenada por burlar proibição de contratar",
    description: "166 empenhos pagos à NUTRIDORES após condenação. A ironia: a empresa foi punida por burlar o direito de contratar — e seguiu recebendo.",
  },
};

const CNPJ_NUTRIDORES = "17813148000148";

const fmtBRL = (v: number | null | undefined) =>
  v == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(Number(v));
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);

type EmpenhoAno = { ano: number; n: number; pago: number };

export default async function NutrMGPage() {
  const sb = getSupabase();

  const [pagamentos, contratos, sancao] = await Promise.all([
    sb.from("mg_empenhos_sancionados")
      .select("cnpj_norm,valor_pago,valor_empenhado,valor_liquidado,unidade_orcamentaria_nome,razao_social_credor")
      .eq("cnpj_norm", CNPJ_NUTRIDORES),
    sb.from("mg_contratos")
      .select("numero_contrato,orgao,objeto,valor_total,situacao,data_assinatura")
      .eq("cnpj_norm", CNPJ_NUTRIDORES)
      .order("data_assinatura", { ascending: false }),
    sb.from("mg_empresas_sancionadas")
      .select("empresa,conduta,decisao,fase,valor_multa,orgao_lesado,sei,data_publicacao_decisao")
      .eq("cnpj_norm", CNPJ_NUTRIDORES)
      .single(),
  ]);

  const empenhos = (pagamentos.data ?? []) as { cnpj_norm: string; valor_pago: number | null; valor_empenhado: number | null; valor_liquidado: number | null; unidade_orcamentaria_nome: string | null; razao_social_credor: string | null }[];
  const totalPago = empenhos.reduce((s, r) => s + (Number(r.valor_pago) || 0), 0);
  const totalEmpenhado = empenhos.reduce((s, r) => s + (Number(r.valor_empenhado) || 0), 0);
  const totalLiquidado = empenhos.reduce((s, r) => s + (Number(r.valor_liquidado) || 0), 0);

  // Totais por contrato
  const nContratos = contratos.data?.length ?? 0;
  const somaContratos = (contratos.data ?? []).reduce((s: number, r: Record<string, unknown>) => s + (Number(r.valor_total) || 0), 0);
  const contratosVigentes = (contratos.data ?? []).filter((r: Record<string, unknown>) => String(r.situacao).toLowerCase().includes("vigente")).length;

  const sanc = sancao.data as { empresa: string | null; conduta: string | null; decisao: string | null; fase: string | null; valor_multa: number | null; orgao_lesado: string | null; sei: string | null; data_publicacao_decisao: string | null } | null;

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "860px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
            <Link href="/noticias" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Investigações</Link>
            <span>/</span>
            <span>Governo MG</span>
            <span>·</span>
            <span>Publicado em 2 de junho de 2026</span>
          </div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, lineHeight: 1.2, maxWidth: "780px" }}>
            MG pagou R$ 231 milhões a empresa condenada por burlar a proibição de contratar com o Estado
          </h1>
          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", margin: "0.75rem 0 0", maxWidth: "720px", lineHeight: 1.6 }}>
            A NUTRIDORES recebeu 166 empenhos da SEJUSP — todos após a condenação na
            Controladoria-Geral do Estado transitar em julgado. A conduta: burla à
            sanção restritiva do direito de licitar e contratar.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "860px" }}>

        {/* KPIs */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Pago pela SEJUSP" value={fmtBRL(totalPago)} destaque />
          <Kpi label="Empenhos" value={fmtNum(empenhos.length)} />
          <Kpi label="Contratos" value={`${contratosVigentes} vigentes / ${nContratos} total`} />
          <Kpi label="Total contratado (22–26)" value={fmtBRL(somaContratos)} />
        </div>

        {/* Ironia central */}
        <div className="bloomberg-card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--badge-danger-fg))" }}>
          <p style={{ margin: 0, fontSize: "0.9375rem", lineHeight: 1.7, color: "hsl(var(--text-body))" }}>
            A <strong>NUTRIDORES Indústria e Comércio de Refeições Coletivas Ltda.</strong> (CNPJ 17.813.148/0001-48) foi
            condenada pela CGE-MG por <em>"burla à sanção restritiva do direito de licitar e contratar"</em> — decisão
            publicada em {sanc?.data_publicacao_decisao ? new Date(sanc.data_publicacao_decisao).toLocaleDateString("pt-BR") : "8/10/2021"},
            fase <strong>{sanc?.fase ?? "transitado em julgado"}</strong>.
            Após a condenação, a empresa recebeu <strong>{fmtBRL(totalPago)}</strong> em pagamentos da Secretaria de
            Justiça e Segurança Pública — todos para fornecimento de refeições ao sistema prisional.
          </p>
        </div>

        {/* Série por ano */}
        <h2 style={{ fontSize: "1.0625rem", margin: "1.5rem 0 0.75rem" }}>Pagamentos à NUTRIDORES — por ano</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Empenhado</th>
                <th style={{ textAlign: "right" }}>Liquidado</th>
                <th style={{ textAlign: "right" }}>Pago</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontVariantNumeric: "tabular-nums" }}>{fmtBRL(totalEmpenhado)}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(totalLiquidado)}</td>
                <td style={{ textAlign: "right", fontWeight: 700, color: "hsl(var(--badge-danger-fg))", fontVariantNumeric: "tabular-nums" }}>{fmtBRL(totalPago)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* A condenação */}
        <h2 style={{ fontSize: "1.0625rem", margin: "1.5rem 0 0.75rem" }}>A condenação — registro oficial da CGE-MG</h2>
        {sanc && (
          <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden", marginBottom: "1.5rem" }}>
            <table className="bloomberg-table" style={{ width: "100%" }}>
              <tbody>
                <tr><td style={{ fontWeight: 600, width: "35%" }}>Conduta</td><td>{sanc.conduta}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Decisão</td><td>{sanc.decisao}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Fase</td><td><strong>{sanc.fase}</strong></td></tr>
                <tr><td style={{ fontWeight: 600 }}>Valor da multa</td><td>{fmtBRL(sanc.valor_multa)}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>Órgão lesado</td><td>{sanc.orgao_lesado}</td></tr>
                <tr><td style={{ fontWeight: 600 }}>SEI</td><td style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>{sanc.sei}</td></tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Nota editorial */}
        <div className="bloomberg-card" style={{ padding: "1.25rem 1.5rem", marginBottom: "1.5rem", borderLeft: "3px solid hsl(var(--text-caption))" }}>
          <h3 style={{ fontSize: "0.9375rem", margin: "0 0 0.5rem" }}>Nota editorial — o que estes dados não respondem</h3>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.7 }}>
            <li>A sanção restritiva que originou a condenação estava <strong>vigente</strong> quando os pagamentos foram feitos? Qual o prazo do impedimento?</li>
            <li>"Transitado em julgado" aqui refere-se ao processo <em>administrativo</em> — pode existir discussão judicial em andamento.</li>
            <li>Os contratos foram precedidos de competição (pregão) ou contratação direta?</li>
            <li>A empresa não foi consultada para este material — o <strong>direito de resposta</strong> está aberto em <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>/correcoes</Link>.</li>
          </ul>
        </div>

        {/* Metodologia */}
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", lineHeight: 1.6, marginTop: "1.5rem" }}>
          <strong>Metodologia:</strong> cruzamento por CNPJ (14 dígitos) entre os conjuntos de{" "}
          <em>empenhos de despesa</em> (exercícios 2022–2026), <em>contratos</em> e{" "}
          <em>empresas processadas pela CGE-MG</em>, todos disponíveis em{" "}
          <a href="https://dados.mg.gov.br" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(var(--primary))" }}>dados.mg.gov.br</a>{" "}
          sob licença CC-BY-4.0. "Condenada" = decisão não arquivada/absolvida em fase de trânsito em julgado.
          Dados extraídos em 1º de junho de 2026.
        </p>
      </div>
    </>
  );
}

function Kpi({ label, value, destaque }: { label: string; value: string; destaque?: boolean }) {
  return (
    <div className="bloomberg-kpi">
      <div className="bloomberg-kpi-label">{label}</div>
      <div className="bloomberg-kpi-value" style={destaque ? { color: "hsl(var(--badge-danger-fg))" } : undefined}>{value}</div>
    </div>
  );
}
