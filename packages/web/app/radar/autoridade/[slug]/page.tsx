import Link from "next/link";
import { notFound } from "next/navigation";
import { getAutoridade } from "~/lib/radar-fab";

export const revalidate = 3600;

const ACCENT = "hsl(350 73% 44%)";

function brlFull(v: number): string {
  return `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getAutoridade(slug);
  if (!a) return { title: "Autoridade" };
  return {
    title: `${a.autoridade} — Voos na FAB`,
    description: `${a.autoridade}: ${a.voos} voos em aeronaves da FAB, custo estimado ${brlFull(a.custo_estimado)}. Destinos, fins de semana e linha do tempo. Dados GABAER.`,
    alternates: { canonical: `/autoridade/${slug}` },
  };
}

export default async function AutoridadePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getAutoridade(slug);
  if (!a) notFound();

  const maxTl = Math.max(...a.timeline.map(t => t.n), 1);
  const maxDest = Math.max(...a.top_destinos.map(d => d.n), 1);
  const custoMedio = Math.round(a.custo_estimado / a.voos);

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <Link href="/ranking" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Ranking</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>{a.autoridade}</span>
        </div>
      </div>

      <div className="container" style={{ padding: "2.5rem 1.5rem", maxWidth: "54rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: ACCENT }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>Perfil de voos</span>
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", marginBottom: "0.5rem", lineHeight: 1.15 }}>{a.autoridade}</h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))" }}>
            <strong style={{ color: "hsl(var(--text-headline))" }}>{a.voos} voos</strong> em aeronaves da FAB ·
            custo estimado <strong style={{ color: ACCENT }}>{brlFull(a.custo_estimado)}</strong> ·
            média {brlFull(custoMedio)}/voo
          </p>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1px", backgroundColor: "hsl(var(--border))", border: "1px solid hsl(var(--border))", marginBottom: "2rem" }}>
          {[
            { l: "Voos totais", v: String(a.voos) },
            { l: "Fim de semana", v: `${a.fds} (${a.fds_pct}%)` },
            { l: "Noturnos", v: String(a.noturnos) },
            { l: "Internacionais", v: String(a.internacionais) },
            { l: "À disposição", v: String(a.a_disposicao) },
          ].map(k => (
            <div key={k.l} style={{ backgroundColor: "hsl(var(--card))", padding: "1rem" }}>
              <div style={{ fontSize: "0.625rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))" }}>{k.l}</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))", marginTop: "0.25rem" }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Split governo */}
        {(a.bolsonaro > 0 && a.lula > 0) && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>Por governo</div>
            <div style={{ display: "flex", height: "2rem", borderRadius: "3px", overflow: "hidden", fontSize: "0.75rem", fontWeight: 600 }}>
              <div style={{ width: `${a.bolsonaro / a.voos * 100}%`, backgroundColor: "hsl(210 50% 45%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "fit-content", padding: "0 0.5rem" }}>
                Bolsonaro {a.bolsonaro}
              </div>
              <div style={{ width: `${a.lula / a.voos * 100}%`, backgroundColor: "hsl(350 60% 45%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "fit-content", padding: "0 0.5rem" }}>
                Lula 3 {a.lula}
              </div>
            </div>
          </div>
        )}

        {/* Timeline */}
        {a.timeline.length > 1 && (
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem" }}>Linha do tempo (voos por mês)</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "80px", borderBottom: "1px solid hsl(var(--border))" }}>
              {a.timeline.map(t => (
                <div key={t.mes} title={`${t.mes}: ${t.n} voos`}
                  style={{ flex: 1, backgroundColor: ACCENT, opacity: 0.35 + 0.65 * (t.n / maxTl), height: `${Math.max(t.n / maxTl * 100, 3)}%`, minWidth: "2px" }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.625rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem", fontFamily: "var(--font-mono)" }}>
              <span>{a.timeline[0]?.mes}</span>
              <span>{a.timeline[a.timeline.length - 1]?.mes}</span>
            </div>
          </div>
        )}

        {/* Top destinos */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem" }}>Destinos mais frequentes</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            {a.top_destinos.map(d => (
              <div key={d.destino} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ width: "11rem", fontSize: "0.8125rem", color: "hsl(var(--text-body))", flexShrink: 0, textAlign: "right" }}>{d.destino}</div>
                <div style={{ flex: 1, height: "1.1rem", backgroundColor: "hsl(var(--surface))", borderRadius: "2px", overflow: "hidden" }}>
                  <div style={{ width: `${d.n / maxDest * 100}%`, height: "100%", backgroundColor: ACCENT, opacity: 0.8 }} />
                </div>
                <div style={{ width: "2.5rem", fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>{d.n}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de voos */}
        <div>
          <div style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.75rem" }}>
            Voos recentes {a.voos_lista.length >= 500 ? "(últimos 500)" : ""}
          </div>
          <div style={{ overflowX: "auto", maxHeight: "32rem", overflowY: "auto", border: "1px solid hsl(var(--border))", borderRadius: "3px" }}>
            <table className="bloomberg-table">
              <thead><tr><th>Data</th><th>Rota</th><th style={{ textAlign: "right" }}>Custo est.</th></tr></thead>
              <tbody>
                {a.voos_lista.map((v, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", whiteSpace: "nowrap", color: v.fds ? ACCENT : undefined }}>{v.data}</td>
                    <td style={{ fontSize: "0.8125rem" }}>{v.origem} → {v.destino}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{brlFull(v.custo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.75rem" }}>
            Datas em vermelho = fim de semana. Custo estimado — ver <Link href="/metodologia" style={{ color: ACCENT }}>metodologia</Link>.
          </p>
        </div>
      </div>
    </>
  );
}
