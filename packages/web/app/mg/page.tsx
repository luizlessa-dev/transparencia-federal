/**
 * Índice do módulo Governo de Minas Gerais (Executivo estadual).
 * Distinto do subdomínio almg. (que cobre a Assembleia / legislativo).
 * Rota: /mg
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Governo de Minas Gerais — Fiscalização do Executivo | The BR Insider",
  description:
    "Dados do Poder Executivo de Minas Gerais sob curadoria jornalística: supersalários, diárias, contratos e despesas. Fonte: Portal de Dados Abertos de MG.",
  alternates: { canonical: "https://www.thebrinsider.com/mg" },
};

function fmtNum(v: number): string {
  return new Intl.NumberFormat("pt-BR").format(v);
}

export default async function MgIndexPage() {
  const sb = getSupabase();
  const { count } = await sb
    .from("mg_supersalarios")
    .select("*", { count: "exact", head: true });
  const nSupersalarios = count ?? null;

  return (
    <>
      <section
        style={{
          borderBottom: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
        }}
      >
        <div className="container" style={{ padding: "2.5rem 1.5rem 2rem", maxWidth: "1000px" }}>
          <span
            style={{
              fontSize: "0.6875rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              color: "hsl(var(--accent))",
            }}
          >
            The BR Insider · Governos Estaduais
          </span>
          <h1 style={{ fontSize: "1.875rem", margin: "0.5rem 0 0", lineHeight: 1.2 }}>
            Governo de Minas Gerais
          </h1>
          <p
            style={{
              fontSize: "0.9375rem",
              color: "hsl(var(--text-body))",
              margin: "0.625rem 0 0",
              maxWidth: "640px",
              lineHeight: 1.6,
            }}
          >
            Fiscalização do <strong>Poder Executivo</strong> mineiro a partir do Portal de Dados
            Abertos do Estado. Diferente da Assembleia (ALMG), aqui o foco é o governo: folha,
            gastos, contratos e fornecedores.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {/* Supersalários — ativo */}
          <Link
            href="/mg/supersalarios"
            className="bloomberg-card"
            style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}
          >
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
              Supersalários
            </div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Servidores acima do teto constitucional, ordenados pelo valor cortado.
            </p>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(var(--primary))", fontVariantNumeric: "tabular-nums" }}>
              {nSupersalarios != null ? fmtNum(nSupersalarios) : "—"}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              acima do teto
            </div>
          </Link>

          {/* Contratos × sancionadas — ativo */}
          <Link
            href="/mg/contratos-sancionados"
            className="bloomberg-card"
            style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}
          >
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
              Contratos × sancionadas
            </div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Empresas condenadas pela Lei Anticorrupção que mantêm contrato com o Estado.
            </p>
            <span className="badge-danger" style={{ fontSize: "0.625rem" }}>investigativo</span>
          </Link>

          {/* Obras — ativo */}
          <Link href="/mg/obras" className="bloomberg-card" style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>Obras (DER)</div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Obras paralisadas, percentual de execução e fornecedores sancionados.
            </p>
            <span className="badge-neutral" style={{ fontSize: "0.625rem" }}>obras paradas</span>
          </Link>

          {/* Convênios — ativo */}
          <Link href="/mg/convenios" className="bloomberg-card" style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>Convênios e repasses</div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Repasses a entidades, parcela de emenda parlamentar e sancionados.
            </p>
            <span className="badge-neutral" style={{ fontSize: "0.625rem" }}>86 mil convênios</span>
          </Link>

          {/* Pagamentos a sancionadas — ativo */}
          <Link href="/mg/pagamentos-sancionados" className="bloomberg-card" style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>Pagamentos a sancionadas</div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Dinheiro efetivamente pago a empresas condenadas (não só contrato).
            </p>
            <span className="badge-danger" style={{ fontSize: "0.625rem" }}>investigativo</span>
          </Link>

          {/* COVID — ativo */}
          <Link href="/mg/covid" className="bloomberg-card" style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>Compras COVID-19</div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Compras de pandemia acima do preço de referência, por dispensa.
            </p>
            <span className="badge-neutral" style={{ fontSize: "0.625rem" }}>sobrepreço</span>
          </Link>

          {/* Terceirizados — ativo */}
          <Link href="/mg/terceirizados" className="bloomberg-card" style={{ padding: "1.25rem", textDecoration: "none", display: "block" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>Terceirizados</div>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
              Quantos terceirizados cada empresa mantém em cada órgão.
            </p>
            <span className="badge-neutral" style={{ fontSize: "0.625rem" }}>por empresa</span>
          </Link>

          {/* Próximos eixos — em breve */}
          {[
            { t: "Emendas estaduais (LOA)", d: "Autores de emenda e destino do recurso." },
            { t: "Reparação Vale / Brumadinho", d: "Projetos e recursos do acordo judicial." },
            { t: "Despesas e orçamento", d: "Para onde vai o dinheiro, por órgão e programa (SIAFI/SISOR)." },
          ].map((c) => (
            <div
              key={c.t}
              className="bloomberg-card"
              style={{ padding: "1.25rem", opacity: 0.6 }}
            >
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
                {c.t}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: "0.375rem 0 0.75rem", lineHeight: 1.5 }}>
                {c.d}
              </p>
              <span className="badge-neutral" style={{ fontSize: "0.625rem" }}>
                em breve
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          Fonte: Portal de Dados Abertos do Estado de Minas Gerais (Controladoria-Geral do Estado),
          licença CC-BY-4.0. Projeto independente, sem vínculo com o Governo de MG.
        </p>
      </div>
    </>
  );
}
