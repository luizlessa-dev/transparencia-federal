/**
 * Supersalários — Executivo de Minas Gerais.
 * Servidores do Poder Executivo estadual com abate-teto > 0 (corte oficial por
 * exceder o teto constitucional). Fonte: CKAN dados.mg.gov.br (CGE), CC-BY-4.0.
 * Rota: /mg/supersalarios
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgSupersalarios } from "~/services/mg";
import { getViewer } from "~/lib/dal";
import { ParedeDeAcesso } from "~/components/ParedeDeAcesso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Supersalários do Governo de Minas Gerais | The BR Insider",
  description:
    "Servidores do Executivo de MG que receberam acima do teto constitucional, ordenados pelo valor cortado (abate-teto). Dado oficial do Portal da Transparência de Minas Gerais.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/supersalarios" },
  openGraph: {
    title: "Supersalários — Governo de Minas Gerais",
    description:
      "Quem recebeu acima do teto no Executivo mineiro, servidor a servidor. Sinal oficial: abate-teto.",
    url: "https://www.thebrinsider.com/mg/supersalarios",
    siteName: "The BR Insider",
    type: "website",
    locale: "pt_BR",
  },
};

const FREE_LIMIT = 25;

type Row = {
  servidor_nome: string;
  orgao: string | null;
  cargo: string | null;
  situacao: string | null;
  remuneracao_bruta: number | null;
  remuneracao_liquida: number | null;
  abate_teto: number | null;
  servidor_id_externo: string | null;
  ano: number | null;
  mes: number | null;
};

type Recorte = "todos" | "ativos" | "aposentados";

const RECORTE_LABELS: Record<Recorte, string> = {
  todos: "Todos",
  ativos: "Ativos",
  aposentados: "Aposentados",
};

const MESES = [
  "", "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function fmtBRL(v: number | null | undefined): string {
  if (v == null || !isFinite(Number(v))) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmtNum(v: number): string {
  return new Intl.NumberFormat("pt-BR").format(v);
}

function fmtPct(v: number): string {
  return `${Math.round(v)}%`;
}

const isInativo = (s: string | null) => (s ?? "").toUpperCase().startsWith("INATIV");

export default async function MgSupersalariosPage({
  searchParams,
}: {
  searchParams: Promise<{ recorte?: string }>;
}) {
  const sp = await searchParams;
  const recorte = (["todos", "ativos", "aposentados"].includes(sp.recorte ?? "")
    ? sp.recorte
    : "todos") as Recorte;

  const { pago } = await getViewer();

  // A view já vem ordenada por abate_teto desc e filtrada para abate > 0.
  const { data, error } = await getMgSupersalarios();

  if (error || !data) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem" }}>
        <p style={{ color: "hsl(var(--badge-danger-fg))" }}>
          Erro ao carregar dados: {error?.message ?? "resposta vazia"}
        </p>
      </div>
    );
  }

  const todas = data as Row[];

  // ── KPIs (panorama completo, independem do recorte) ──────────────────────
  const total = todas.length;
  const somaAbate = todas.reduce((s, r) => s + (Number(r.abate_teto) || 0), 0);
  const nFazenda = todas.filter((r) => (r.orgao ?? "").toUpperCase().includes("FAZENDA")).length;
  const nInativos = todas.filter((r) => isInativo(r.situacao)).length;
  const nAtivos = total - nInativos;
  const competencia =
    todas[0]?.mes && todas[0]?.ano ? `${MESES[todas[0].mes]} de ${todas[0].ano}` : "—";

  // ── Recorte (filtra só a tabela) ─────────────────────────────────────────
  const filtradas =
    recorte === "ativos"
      ? todas.filter((r) => !isInativo(r.situacao))
      : recorte === "aposentados"
      ? todas.filter((r) => isInativo(r.situacao))
      : todas;

  const visiveis = pago ? filtradas : filtradas.slice(0, FREE_LIMIT);
  const maiorAbate = todas[0]?.abate_teto ?? 0;

  return (
    <>
      {/* ── Cabeçalho ────────────────────────────────────────────────────── */}
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div
            style={{
              fontSize: "0.75rem",
              color: "hsl(var(--text-caption))",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
            }}
          >
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
              Governo de MG
            </Link>
            <span>/</span>
            <span>Supersalários</span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
            <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>
              Supersalários — Executivo de Minas Gerais
            </h1>
            <span
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "hsl(var(--accent))",
              }}
            >
              {competencia}
            </span>
          </div>

          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-body))",
              margin: "0.5rem 0 0",
              maxWidth: "640px",
            }}
          >
            Servidores que receberam <strong>acima do teto constitucional</strong> e tiveram
            corte (abate-teto) aplicado pelo próprio Estado. Ordenados pelo valor cortado.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        {/* ── Lead ──────────────────────────────────────────────────────── */}
        <div
          className="bloomberg-card"
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            borderLeft: "3px solid hsl(var(--accent))",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.6 }}>
            A <strong>Secretaria da Fazenda</strong> concentra{" "}
            <strong>{fmtPct((nFazenda / total) * 100)}</strong> dos supersalários do Executivo
            mineiro ({fmtNum(nFazenda)} de {fmtNum(total)}) — sobretudo auditores fiscais e
            procuradores. <strong>{fmtNum(nInativos)}</strong> são aposentados.
          </p>
        </div>

        {/* ── KPIs ──────────────────────────────────────────────────────── */}
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Servidores acima do teto" value={fmtNum(total)} />
          <Kpi label="Cortado pelo teto / mês" value={fmtBRL(somaAbate)} />
          <Kpi label="Ativos / Aposentados" value={`${fmtNum(nAtivos)} / ${fmtNum(nInativos)}`} />
          <Kpi label="Maior corte individual" value={fmtBRL(maiorAbate)} />
        </div>

        {/* ── Recorte ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {(["todos", "ativos", "aposentados"] as Recorte[]).map((r) => (
            <Link
              key={r}
              href={r === "todos" ? "/mg/supersalarios" : `/mg/supersalarios?recorte=${r}`}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: recorte === r ? 700 : 400,
                border: `1px solid ${recorte === r ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
                borderRadius: "4px",
                color: recorte === r ? "hsl(var(--primary))" : "hsl(var(--text-body))",
                backgroundColor: recorte === r ? "hsl(var(--primary) / 0.08)" : "transparent",
                textDecoration: "none",
              }}
            >
              {RECORTE_LABELS[r]}
            </Link>
          ))}
        </div>

        {/* ── Tabela ────────────────────────────────────────────────────── */}
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem", textAlign: "center" }}>#</th>
                <th>Servidor</th>
                <th>Órgão / Cargo</th>
                <th style={{ textAlign: "right" }}>Bruto</th>
                <th style={{ textAlign: "right" }}>Cortado (teto)</th>
                <th style={{ textAlign: "right" }}>Líquido</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((r, idx) => (
                <tr key={`${r.servidor_id_externo}-${idx}`}>
                  <td
                    style={{
                      textAlign: "center",
                      color: "hsl(var(--text-caption))",
                      fontVariantNumeric: "tabular-nums",
                      fontSize: "0.75rem",
                    }}
                  >
                    {idx + 1}
                  </td>
                  <td>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--text-headline))" }}>
                      {r.servidor_nome}
                    </div>
                    <span
                      className={isInativo(r.situacao) ? "badge-warning" : "badge-neutral"}
                      style={{ fontSize: "0.625rem", marginTop: "0.125rem" }}
                    >
                      {isInativo(r.situacao) ? "aposentado" : "ativo"}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                    <div>{r.orgao ?? "—"}</div>
                    <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>
                      {r.cargo ?? "—"}
                    </div>
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: "hsl(var(--text-body))",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {fmtBRL(r.remuneracao_bruta)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "hsl(var(--badge-danger-fg))",
                    }}
                  >
                    {fmtBRL(r.abate_teto)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      color: "hsl(var(--text-body))",
                      fontSize: "0.8125rem",
                    }}
                  >
                    {fmtBRL(r.remuneracao_liquida)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Paywall ───────────────────────────────────────────────────── */}
        {!pago && filtradas.length > FREE_LIMIT && (
          <div style={{ marginTop: "1.5rem" }}>
            <ParedeDeAcesso
              titulo={`Veja todos os ${fmtNum(filtradas.length)} supersalários`}
              descricao={`Mostrando os ${FREE_LIMIT} maiores. Crie uma conta gratuita para ver a lista completa, filtrar por órgão e baixar os dados.`}
              next="/mg/supersalarios"
            />
          </div>
        )}

        {pago && (
          <div style={{ marginTop: "1rem" }}>
            <a
              href="/api/export/mg-supersalarios"
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
              ↓ Baixar lista completa (.csv)
            </a>
          </div>
        )}

        {/* ── Nota metodológica / LGPD ──────────────────────────────────── */}
        <p
          style={{
            fontSize: "0.75rem",
            color: "hsl(var(--text-caption))",
            marginTop: "1.5rem",
            lineHeight: 1.6,
          }}
        >
          <strong>Metodologia:</strong> considera-se supersalário o servidor com{" "}
          <em>abate-teto &gt; 0</em> — ou seja, o próprio Estado reconheceu que a remuneração
          excedeu o teto constitucional e aplicou o corte. A <em>remuneração bruta</em> é o total
          de proventos do mês (reconstruída como líquido + IR + previdência + abate), incluindo
          eventuais e retroativos. Verbas indenizatórias, que não contam para o teto, ficam fora
          deste recorte. Competência: {competencia}.{" "}
          <strong>Fonte:</strong> Portal de Dados Abertos do Estado de MG (CGE), licença CC-BY-4.0.
          Dados públicos por força da Lei de Acesso à Informação. Servidor que identificar erro
          pode solicitar correção em{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))" }}>
            /correcoes
          </Link>
          .
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
