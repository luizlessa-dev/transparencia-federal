import Link from "next/link";
import { buscarVoos } from "~/lib/radar-fab";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Busca de voos",
  description: "Pesquise voos de autoridades na FAB por nome, destino e período. Base histórica 2020–hoje.",
  alternates: { canonical: "/radar/busca" },
};

const ANOS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const MESES = [
  { v: "01", l: "Janeiro" }, { v: "02", l: "Fevereiro" }, { v: "03", l: "Março" },
  { v: "04", l: "Abril"   }, { v: "05", l: "Maio"      }, { v: "06", l: "Junho" },
  { v: "07", l: "Julho"   }, { v: "08", l: "Agosto"    }, { v: "09", l: "Setembro" },
  { v: "10", l: "Outubro" }, { v: "11", l: "Novembro"  }, { v: "12", l: "Dezembro" },
];

export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; ano?: string; mes?: string; destino?: string }>;
}) {
  const sp      = await searchParams;
  const temFiltro = !!(sp.q || sp.ano || sp.destino);
  const voos    = temFiltro ? await buscarVoos(sp) : [];

  const INPUT_STYLE = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    border: "1px solid hsl(var(--border))",
    backgroundColor: "hsl(var(--card))",
    color: "hsl(var(--text-body))",
    borderRadius: "2px",
    outline: "none",
  } as const;

  const SELECT_STYLE = { ...INPUT_STYLE } as const;

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/radar" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Busca</span>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: "hsl(350 73% 44%)" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: "hsl(350 73% 44%)" }}>
              Fase 2 · Busca
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)", marginBottom: "0.5rem" }}>
            Busca de Voos
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))" }}>
            Pesquise na base histórica (2020–hoje) por autoridade, destino ou período.
            Máximo 500 resultados por consulta.
          </p>
        </div>

        {/* ── FORMULÁRIO ──────────────────────────────────────── */}
        <form method="GET" action="/radar/busca">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
              gap: "0.75rem",
              padding: "1.5rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--card))",
              borderRadius: "2px",
              marginBottom: "2rem",
              alignItems: "end",
            }}
          >
            {/* Autoridade */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Autoridade
              </label>
              <input
                type="text"
                name="q"
                placeholder="Ex: Ministro da Saúde"
                defaultValue={sp.q ?? ""}
                style={INPUT_STYLE}
              />
            </div>

            {/* Destino */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Origem / Destino
              </label>
              <input
                type="text"
                name="destino"
                placeholder="Ex: João Pessoa"
                defaultValue={sp.destino ?? ""}
                style={INPUT_STYLE}
              />
            </div>

            {/* Ano */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Ano
              </label>
              <select name="ano" defaultValue={sp.ano ?? ""} style={SELECT_STYLE}>
                <option value="">Todos</option>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Mês (só visível quando 2026 selecionado) */}
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.375rem", color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Mês (2026)
              </label>
              <select name="mes" defaultValue={sp.mes ?? ""} style={SELECT_STYLE}>
                <option value="">Todos</option>
                {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
            </div>

            {/* Botão */}
            <button
              type="submit"
              style={{
                padding: "0.5rem 1.25rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                backgroundColor: "hsl(350 73% 44%)",
                color: "#fff",
                border: "none",
                borderRadius: "2px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Buscar
            </button>
          </div>
        </form>

        {/* ── RESULTADOS ──────────────────────────────────────── */}
        {temFiltro && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))" }}>
                {voos.length === 0
                  ? "Nenhum resultado encontrado."
                  : `${voos.length} voo${voos.length !== 1 ? "s" : ""} encontrado${voos.length !== 1 ? "s" : ""}${voos.length === 500 ? " (máx)" : ""}.`}
              </p>
              {voos.length > 0 && (
                <Link
                  href="/radar/busca"
                  style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", textDecoration: "none" }}
                >
                  Limpar filtros ×
                </Link>
              )}
            </div>

            {voos.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table className="bloomberg-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Autoridade</th>
                      <th>Origem</th>
                      <th>Destino</th>
                      <th>Motivo</th>
                      <th style={{ textAlign: "right" }}>Pax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {voos.map((v, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {v.decolagem}
                        </td>
                        <td style={{ maxWidth: "16rem" }}>
                          {v.autoridade}
                        </td>
                        <td style={{ color: "hsl(var(--text-caption))", fontSize: "0.8125rem" }}>
                          {v.origem}
                        </td>
                        <td style={{ fontWeight: 500 }}>{v.destino}</td>
                        <td>
                          <span
                            className={v.motivo === "Segurança" ? "badge-warn" : "badge-neutral"}
                            style={{ fontSize: "0.6875rem" }}
                          >
                            {v.motivo}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>
                          {v.passageiros}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Estado inicial */}
        {!temFiltro && (
          <div
            style={{
              padding: "3rem",
              border: "1px solid hsl(var(--border))",
              backgroundColor: "hsl(var(--surface))",
              borderRadius: "2px",
              textAlign: "center",
              color: "hsl(var(--text-caption))",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✈️</div>
            <div style={{ fontSize: "0.9375rem", fontWeight: 600, marginBottom: "0.375rem", color: "hsl(var(--text-body))" }}>
              10.012+ voos disponíveis
            </div>
            <div style={{ fontSize: "0.8125rem" }}>
              Use os filtros acima para pesquisar na base histórica 2020–hoje.
            </div>
          </div>
        )}

      </div>
    </>
  );
}
