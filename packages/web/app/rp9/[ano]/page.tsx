import Link from "next/link";
import { notFound } from "next/navigation";
import { getEmendasRp9 } from "~/services/emendas";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ ano: string }>;
  searchParams: Promise<{ page?: string }>;
}

const ANOS_RP9 = [2019, 2020, 2021, 2022];

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fmtN(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export async function generateMetadata({ params }: Props) {
  const { ano } = await params;
  return {
    title: `RP9 ${ano} — Emendas do Relator-Geral — Transparência Federal`,
    description: `Emendas do Relator-Geral (orçamento secreto) em ${ano}. Dados oficiais do Portal da Transparência.`,
  };
}

export default async function Rp9AnoPage({ params, searchParams }: Props) {
  const { ano: anoStr } = await params;
  const sp = await searchParams;
  const ano = Number(anoStr);

  if (!ANOS_RP9.includes(ano)) notFound();

  const page = Math.max(1, Number(sp.page ?? 1));
  const PER_PAGE = 50;

  const { data, total } = await getEmendasRp9(ano, page, PER_PAGE);
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", fontFamily: "var(--font-sans)" }}>
            <Link href="/rp9" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Orçamento Secreto</Link>
            <span style={{ margin: "0 0.375rem", color: "hsl(var(--border))" }}>/</span>
            <span>{ano}</span>
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "4px", flexShrink: 0, backgroundColor: "hsl(350 73% 65%)" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Emendas RP9 — {ano}</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginLeft: "calc(4px + 0.75rem)" }}>
            {fmtN(total)} emendas do Relator-Geral · Autor registrado: "RELATOR GERAL"
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* Filtros de ano */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)", marginRight: "0.25rem" }}>Ano:</span>
          {ANOS_RP9.map((a) => (
            <Link
              key={a}
              href={`/rp9/${a}`}
              style={{
                padding: "0.375rem 0.875rem",
                fontSize: "0.8125rem",
                fontWeight: a === ano ? 600 : 400,
                fontFamily: "var(--font-mono)",
                color: a === ano ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))",
                backgroundColor: a === ano ? "hsl(350 73% 65%)" : "hsl(var(--surface))",
                border: `1px solid ${a === ano ? "hsl(350 73% 65%)" : "hsl(var(--border))"}`,
                borderRadius: "2px",
                textDecoration: "none",
              }}
            >
              {a}
            </Link>
          ))}
        </div>

        {/* Tabela */}
        <div style={{ overflowX: "auto" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Código</th>
                <th>Função</th>
                <th>Subfunção</th>
                <th>Localidade</th>
                <th style={{ textAlign: "right" }}>Empenhado</th>
                <th style={{ textAlign: "right" }}>Pago</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--text-caption))" }}>
                    Dados não disponíveis para {ano}. Execute a ingestão de emendas.
                  </td>
                </tr>
              ) : (
                data.map((emenda, i) => (
                  <tr key={emenda.id}>
                    <td style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                      {(page - 1) * PER_PAGE + i + 1}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-body))" }}>
                      {emenda.codigo_emenda}
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-headline))" }}>
                      {emenda.funcao ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {emenda.subfuncao ?? "—"}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {emenda.localidade ?? "Nacional"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--text-headline))", fontSize: "0.875rem" }}>
                      {fmtBRL(emenda.valor_empenhado)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))", fontSize: "0.8125rem" }}>
                      {fmtBRL(emenda.valor_pago)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
            {page > 1 && (
              <Link href={`/rp9/${ano}?page=${page - 1}`} style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                ← Anterior
              </Link>
            )}
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", padding: "0 0.5rem" }}>
              {page} / {totalPages}
            </span>
            {page < totalPages && (
              <Link href={`/rp9/${ano}?page=${page + 1}`} style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                Próxima →
              </Link>
            )}
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <Link href="/rp9" style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}>
            ← Voltar ao Orçamento Secreto
          </Link>
        </div>
      </div>
    </>
  );
}
