import Link from "next/link";
import { getRp9StatsPorAno } from "~/services/emendas";

export const dynamic = "force-dynamic";

export function generateMetadata() {
  return {
    title: "Orçamento Secreto (RP9) — Transparência Federal",
    description:
      "Emendas do Relator-Geral do Orçamento (RP9) — o mecanismo declarado inconstitucional pelo STF em 2021. Dados de 2019 a 2022.",
  };
}

function fmtBRL(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(valor);
}

function fmtBRLFull(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default async function Rp9Page() {
  const stats = await getRp9StatsPorAno();
  const temDados = stats.length > 0;

  const totalGeral = stats.reduce((s, a) => s + a.total_empenhado, 0);
  const totalPago = stats.reduce((s, a) => s + a.total_pago, 0);
  const totalCancelado = stats.reduce((s, a) => s + a.total_cancelado, 0);

  return (
    <>
      {/* Hero editorial */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem" }}>

          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <span style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(350 73% 65%)", border: "1px solid hsl(350 73% 65%)", borderRadius: "2px", padding: "0.2rem 0.5rem" }}>
              Investigação
            </span>
            <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
              2019 – 2022
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2.5rem", width: "4px", flexShrink: 0, backgroundColor: "hsl(350 73% 65%)", marginTop: "0.25rem" }} />
            <h1 style={{ fontSize: "2rem", margin: 0, lineHeight: 1.2 }}>
              Orçamento Secreto
            </h1>
          </div>

          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", maxWidth: "52rem", lineHeight: 1.7, marginBottom: "1.5rem", marginLeft: "calc(4px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            As Emendas do Relator-Geral (RP9) permitiram que parlamentares alocassem bilhões do orçamento federal sem identificação pública do autor.
            O mecanismo foi declarado inconstitucional pelo STF em novembro de 2021. Esta página reúne os dados oficiais disponíveis.
          </p>

          {/* KPIs do RP9 */}
          {temDados && (
            <div className="bloomberg-kpi-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginLeft: "calc(4px + 0.75rem)" }}>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Total empenhado (2019–2022)</div>
                <div className="bloomberg-kpi-value" style={{ color: "hsl(350 73% 65%)" }}>{fmtBRL(totalGeral)}</div>
                <div className="bloomberg-kpi-sub">via Emendas de Relator</div>
              </div>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Total pago</div>
                <div className="bloomberg-kpi-value">{fmtBRL(totalPago)}</div>
                <div className="bloomberg-kpi-sub">{totalGeral > 0 ? Math.round((totalPago / totalGeral) * 100) : 0}% do empenhado</div>
              </div>
              <div className="bloomberg-kpi">
                <div className="bloomberg-kpi-label">Cancelado após STF</div>
                <div className="bloomberg-kpi-value">{fmtBRL(totalCancelado)}</div>
                <div className="bloomberg-kpi-sub">restos cancelados</div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem" }}>

        {/* Contexto histórico */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", backgroundColor: "hsl(var(--border))", marginBottom: "2rem" }}>
          {[
            {
              ano: "2019–2020",
              titulo: "Nascimento do mecanismo",
              texto: "O Relator-Geral do Orçamento começa a usar o instrumento RP9 (Resultado Primário 9) para alocar recursos sem identificação do parlamentar beneficiário. O valor cresce silenciosamente.",
            },
            {
              ano: "2021",
              titulo: "Pico e exposição",
              texto: "O RP9 atinge seu ápice com R$16,7 bilhões aprovados na LOA. A imprensa nomeia o mecanismo de \"orçamento secreto\". O STF abre ADPFs pedindo transparência.",
            },
            {
              ano: "Nov/2021",
              titulo: "STF: inconstitucional",
              texto: "O Supremo Tribunal Federal declara as Emendas de Relator-Geral inconstitucionais por violarem o princípio da transparência orçamentária e do processo legislativo.",
            },
            {
              ano: "2022",
              titulo: "Liquidação e restos",
              texto: "Após a decisão do STF, o Congresso cancela parcialmente os restos a pagar do RP9. Parte dos recursos foi paga antes da decisão judicial.",
            },
          ].map((ev) => (
            <div key={ev.ano} className="bloomberg-card" style={{ borderRadius: 0, border: "none" }}>
              <div style={{ fontSize: "0.625rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))", marginBottom: "0.5rem", fontFamily: "var(--font-mono)" }}>
                {ev.ano}
              </div>
              <div style={{ fontSize: "0.9375rem", fontWeight: 700, color: "hsl(var(--text-headline))", marginBottom: "0.5rem", fontFamily: "var(--font-display)" }}>
                {ev.titulo}
              </div>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.6, margin: 0, fontFamily: "var(--font-sans)" }}>
                {ev.texto}
              </p>
            </div>
          ))}
        </div>

        {/* Dados por ano */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
          <h2 style={{ fontSize: "1.125rem", margin: 0, fontFamily: "var(--font-sans)" }}>Dados por Ano</h2>
        </div>

        {!temDados ? (
          <div className="bloomberg-card" style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "hsl(var(--text-caption))", fontSize: "0.875rem", margin: 0 }}>
              Dados sendo carregados. Execute a ingestão de emendas para os anos 2019–2022.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))" }}>
            {stats.map((s) => {
              const taxaExec = s.total_empenhado > 0 ? Math.round((s.total_pago / s.total_empenhado) * 100) : 0;
              return (
                <div key={s.ano} className="bloomberg-card" style={{ borderRadius: 0, border: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "hsl(var(--text-headline))" }}>
                      {s.ano}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-mono)" }}>
                      {s.total_emendas} emendas
                    </span>
                  </div>

                  <dl style={{ marginBottom: "1.25rem" }}>
                    {[
                      { label: "Empenhado", value: fmtBRLFull(s.total_empenhado), bold: true },
                      { label: "Pago", value: fmtBRLFull(s.total_pago), bold: false },
                      { label: "Cancelado", value: fmtBRLFull(s.total_cancelado), bold: false },
                    ].map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.35rem 0", borderBottom: "1px solid hsl(var(--border-subtle))" }}>
                        <dt style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{row.label}</dt>
                        <dd style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", fontWeight: row.bold ? 600 : 400, color: row.bold ? "hsl(var(--text-headline))" : "hsl(var(--text-body))" }}>
                          {row.value}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  {/* Taxa de execução */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
                      <span style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))" }}>
                        Taxa de pagamento
                      </span>
                      <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))" }}>{taxaExec}%</span>
                    </div>
                    <div style={{ width: "100%", backgroundColor: "hsl(var(--border))", height: "2px" }}>
                      <div style={{ height: "2px", width: `${Math.min(taxaExec, 100)}%`, backgroundColor: "hsl(350 73% 65%)" }} />
                    </div>
                  </div>

                  {/* Top funções */}
                  {s.por_funcao.length > 0 && (
                    <div>
                      <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
                        Destino (por função)
                      </p>
                      {s.por_funcao.slice(0, 4).map(({ funcao, empenhado }) => (
                        <div key={funcao} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6875rem", padding: "0.2rem 0", borderBottom: "1px solid hsl(var(--border-subtle))" }}>
                          <span style={{ color: "hsl(var(--text-caption))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" }}>{funcao}</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "hsl(var(--text-body))", flexShrink: 0 }}>{fmtBRL(empenhado)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "1rem" }}>
                    <Link
                      href={`/rp9/${s.ano}`}
                      style={{ fontSize: "0.75rem", fontWeight: 600, color: "hsl(var(--primary))", textDecoration: "none" }}
                    >
                      Ver emendas de {s.ano} →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nota metodológica */}
        <div style={{ marginTop: "2.5rem", padding: "1.25rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px" }}>
          <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))", marginBottom: "0.5rem" }}>
            Nota sobre os dados
          </p>
          <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", margin: 0, fontFamily: "var(--font-sans)", lineHeight: 1.7 }}>
            Os dados são obtidos via API oficial do{" "}
            <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(var(--primary))" }}>
              Portal da Transparência
            </a>{" "}
            (campo <code style={{ fontSize: "0.6875rem", backgroundColor: "hsl(var(--border))", padding: "0.1rem 0.3rem", borderRadius: "2px" }}>tipoEmenda = "Emenda de Relator"</code>).
            Por design, as Emendas RP9 não identificam o parlamentar que negociou cada alocação — o autor registrado é sempre "RELATOR GERAL".
            Esse anonimato estrutural foi o principal argumento jurídico que levou à declaração de inconstitucionalidade pelo STF.
          </p>
        </div>
      </div>
    </>
  );
}
