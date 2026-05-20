import Link from "next/link";
import { getEmendasListing } from "~/services/emendas";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    ano?: string;
    tipo?: string;
    uf?: string;
    page?: string;
  }>;
}

const ANOS = [2019, 2020, 2021, 2022, 2023, 2024];
const TIPOS = [
  { label: "Todos", value: "" },
  { label: "Individual", value: "Individual" },
  { label: "Bancada", value: "Bancada" },
  { label: "Comissão", value: "Comissão" },
  { label: "Relator (RP9)", value: "Relator" },
];
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA",
  "MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN",
  "RS","RO","RR","SC","SP","SE","TO",
];

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

function buildUrl(base: Record<string, string | undefined>, override: Record<string, string | undefined>) {
  const merged = { ...base, ...override };
  const qs = Object.entries(merged)
    .filter(([, v]) => v && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join("&");
  return `/amendments${qs ? `?${qs}` : ""}`;
}

export function generateMetadata() {
  return {
    title: "Emendas Parlamentares — Transparência Federal",
    description: "Explore todas as emendas parlamentares de 2019 a 2024: individuais, de bancada, de comissão e do relator-geral (RP9).",
  };
}

export default async function AmendmentsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ano = ANOS.includes(Number(sp.ano)) ? Number(sp.ano) : 2024;
  const tipo = sp.tipo ?? "";
  const uf = sp.uf ?? "";
  const page = Math.max(1, Number(sp.page ?? 1));
  const PER_PAGE = 50;

  const currentParams = {
    ano: String(ano),
    tipo: tipo || undefined,
    uf: uf || undefined,
  };

  const { data, total } = await getEmendasListing(ano, page, PER_PAGE, {
    tipoEmenda: tipo || undefined,
    uf: uf || undefined,
  });

  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Emendas Parlamentares</h1>
          </div>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", marginLeft: "calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            {fmtN(total)} emendas · {ano}
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "1.5rem 1.5rem 3rem" }}>

        {/* Filtros */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem", marginBottom: "1.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>

          {/* Ano */}
          <div>
            <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", marginBottom: "0.375rem" }}>Ano</div>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              {ANOS.map((a) => (
                <Link key={a} href={buildUrl(currentParams, { ano: String(a), page: "1" })}
                  style={{ padding: "0.3rem 0.625rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: a === ano ? 600 : 400, color: a === ano ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))", backgroundColor: a === ano ? "hsl(var(--primary))" : "transparent", border: `1px solid ${a === ano ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "2px", textDecoration: "none" }}>
                  {a}
                </Link>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", marginBottom: "0.375rem" }}>Tipo</div>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {TIPOS.map((t) => {
                const active = tipo === t.value;
                return (
                  <Link key={t.value || "todos"} href={buildUrl(currentParams, { tipo: t.value || undefined, page: "1" })}
                    style={{ padding: "0.3rem 0.625rem", fontSize: "0.75rem", fontWeight: active ? 600 : 400, color: active ? "hsl(var(--primary-foreground))" : "hsl(var(--text-body))", backgroundColor: active ? "hsl(var(--primary))" : "transparent", border: `1px solid ${active ? "hsl(var(--primary))" : "hsl(var(--border))"}`, borderRadius: "2px", textDecoration: "none" }}>
                    {t.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* UF */}
          <div>
            <div style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: "hsl(var(--text-caption))", marginBottom: "0.375rem" }}>
              UF {uf && <span style={{ color: "hsl(var(--primary))" }}>({uf})</span>}
            </div>
            <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
              {uf ? (
                <Link href={buildUrl(currentParams, { uf: undefined, page: "1" })}
                  style={{ padding: "0.3rem 0.625rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", fontWeight: 600, color: "hsl(var(--primary-foreground))", backgroundColor: "hsl(var(--primary))", border: "1px solid hsl(var(--primary))", borderRadius: "2px", textDecoration: "none" }}>
                  {uf} ×
                </Link>
              ) : (
                UFS.map((u) => (
                  <Link key={u} href={buildUrl(currentParams, { uf: u, page: "1" })}
                    style={{ padding: "0.3rem 0.5rem", fontSize: "0.6875rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none" }}>
                    {u}
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div style={{ overflowX: "auto" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "2.5rem" }}>#</th>
                <th>Autor</th>
                <th>Tipo</th>
                <th>Função</th>
                <th>UF</th>
                <th style={{ textAlign: "right" }}>Empenhado</th>
                <th style={{ textAlign: "right" }}>Pago</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--text-caption))" }}>
                    Nenhuma emenda encontrada com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                data.map((emenda, i) => (
                  <tr key={emenda.id}>
                    <td style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))", fontSize: "0.75rem" }}>
                      {(page - 1) * PER_PAGE + i + 1}
                    </td>
                    <td>
                      <Link href={`/amendments/${emenda.id}`} style={{ textDecoration: "none" }}>
                        <div style={{ fontWeight: 600, color: "hsl(var(--primary))", fontSize: "0.8125rem" }}>
                          {emenda.autor_nome ?? "RELATOR GERAL"}
                        </div>
                        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", marginTop: "0.125rem" }}>
                          {emenda.codigo_emenda}
                        </div>
                      </Link>
                    </td>
                    <td>
                      <span className={tipoBadge(emenda.tipo_emenda)}>
                        {tipoLabel(emenda.tipo_emenda)}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>
                      <div>{emenda.funcao ?? "—"}</div>
                      {emenda.subfuncao && (
                        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>{emenda.subfuncao}</div>
                      )}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                      {emenda.uf ?? (emenda.localidade?.toLowerCase().includes("nacional") ? "BR" : "—")}
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
              <Link href={buildUrl(currentParams, { page: String(page - 1) })}
                style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                ← Anterior
              </Link>
            )}
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)", padding: "0 0.5rem" }}>
              {fmtN((page - 1) * PER_PAGE + 1)}–{fmtN(Math.min(page * PER_PAGE, total))} de {fmtN(total)}
            </span>
            {page < totalPages && (
              <Link href={buildUrl(currentParams, { page: String(page + 1) })}
                style={{ padding: "0.4rem 0.875rem", fontSize: "0.8125rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", textDecoration: "none", color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                Próxima →
              </Link>
            )}
          </div>
        )}

        {/* Chamada RP9 */}
        {(tipo === "" || tipo === "Relator") && (
          <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(350 73% 65% / 0.3)", borderRadius: "2px" }}>
            <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", margin: 0, fontFamily: "var(--font-sans)" }}>
              <strong style={{ color: "hsl(350 73% 65%)" }}>Orçamento Secreto (RP9)</strong>{" "}
              — Emendas do Relator-Geral foram declaradas inconstitucionais pelo STF em 2021.{" "}
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
