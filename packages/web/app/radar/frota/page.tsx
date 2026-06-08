import Link from "next/link";
import { getFrotaFAB, getFrotaPublica, type Aeronave } from "~/lib/radar-fab";

export const revalidate = 86400; // 24h — catálogo muda pouco

export const metadata = {
  title: "Frota Aérea Federal",
  description:
    "Catálogo da frota aérea das Forças Armadas (FAB, Marinha, Exército) e de órgãos públicos brasileiros: aeronave presidencial, caças, helicópteros. Modelos, custos e curiosidades.",
  alternates: { canonical: "/frota" },
};

const ACCENT = "hsl(350 73% 44%)";

function fmtKm(n?: number | null): string {
  if (!n) return "—";
  return `${n.toLocaleString("pt-BR")} km`;
}

function CardAeronave({ a }: { a: Aeronave }) {
  return (
    <div
      style={{
        border: a.destaque ? `1px solid ${ACCENT}` : "1px solid hsl(var(--border))",
        backgroundColor: "hsl(var(--card))",
        borderRadius: "3px",
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        position: "relative",
      }}
    >
      {a.destaque && (
        <span style={{
          position: "absolute", top: "-9px", left: "1rem", zIndex: 1,
          backgroundColor: ACCENT, color: "#fff", fontSize: "0.5625rem",
          fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
          padding: "0.125rem 0.5rem", borderRadius: "2px",
        }}>Destaque</span>
      )}

      {/* Foto (quando disponível) */}
      {a.imagem && (
        <div style={{ margin: "-1.25rem -1.25rem 0", position: "relative", overflow: "hidden", borderRadius: "3px 3px 0 0" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.imagem}
            alt={`${a.designacao} — ${a.modelo}`}
            loading="lazy"
            style={{ width: "100%", height: "160px", objectFit: "cover", display: "block" }}
          />
          {a.imagem_credito && (
            <span style={{
              position: "absolute", bottom: 0, right: 0,
              backgroundColor: "rgba(0,0,0,0.6)", color: "#fff",
              fontSize: "0.5625rem", padding: "0.125rem 0.375rem",
              borderTopLeftRadius: "3px",
            }}>
              📷 {a.imagem_credito}
            </span>
          )}
        </div>
      )}

      {/* Header: designação + modelo */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-headline))" }}>
            {a.designacao}
          </span>
          <span style={{ fontSize: "0.75rem", color: ACCENT, fontWeight: 600 }}>
            {a.quantidade}{a.quantidade_prevista ? ` de ${a.quantidade_prevista}` : ""} un.
          </span>
        </div>
        <div style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", marginTop: "0.125rem" }}>
          {a.modelo}
        </div>
        <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.125rem" }}>
          {a.fabricante} · desde {a.entrada_servico}
        </div>
      </div>

      {/* Specs grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.6875rem" }}>
        <Spec label="Capacidade" val={a.capacidade} />
        <Spec label="Velocidade" val={a.velocidade_kmh ? `${a.velocidade_kmh.toLocaleString("pt-BR")} km/h` : "—"} />
        <Spec label="Alcance" val={a.autonomia_h ? `${a.autonomia_h}h de voo` : fmtKm(a.alcance_km)} />
        <Spec label="Custo/hora" val={a.custo_hora.startsWith("não") ? "não divulgado" : a.custo_hora} />
      </div>

      {/* Curiosidade */}
      <div style={{
        fontSize: "0.75rem", lineHeight: 1.55, color: "hsl(var(--text-body))",
        borderTop: "1px solid hsl(var(--border))", paddingTop: "0.625rem",
      }}>
        {a.curiosidade}
      </div>
    </div>
  );
}

function Spec({ label, val }: { label: string; val: string }) {
  return (
    <div>
      <div style={{ color: "hsl(var(--text-caption))", textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.625rem" }}>{label}</div>
      <div style={{ color: "hsl(var(--text-headline))", fontWeight: 500, marginTop: "0.0625rem" }}>{val}</div>
    </div>
  );
}

export default async function FrotaPage() {
  const [frota, pub] = await Promise.all([getFrotaFAB(), getFrotaPublica()]);

  if (!frota) {
    return (
      <div className="container" style={{ padding: "3rem 1.5rem", textAlign: "center", color: "hsl(var(--text-caption))" }}>
        Catálogo de frota indisponível no momento.
      </div>
    );
  }

  const todas = frota.categorias.flatMap(c => c.aeronaves);
  const totalUnidades = todas.reduce((s, a) => s + a.quantidade, 0);

  return (
    <>
      {/* Breadcrumb */}
      <div style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          <Link href="/" style={{ color: "hsl(var(--text-caption))", textDecoration: "none" }}>Radar FAB</Link>
          <span>›</span>
          <span style={{ color: "hsl(var(--text-body))", fontWeight: 500 }}>Frota</span>
        </div>
      </div>

      {/* Hero */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div style={{ height: "2px", width: "1.5rem", backgroundColor: ACCENT }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.2em", color: ACCENT }}>
              Catálogo
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", marginBottom: "0.75rem", lineHeight: 1.15 }}>
            A frota que voa<br />
            <em style={{ fontStyle: "normal", color: ACCENT }}>com dinheiro público</em>
          </h1>
          <p style={{ fontSize: "1rem", color: "hsl(var(--text-body))", maxWidth: "40rem", lineHeight: 1.6 }}>
            Do avião presidencial ao último caça A-4 Skyhawk em operação no mundo —
            conheça as aeronaves das três Forças Armadas (FAB, Marinha e Exército)
            e dos órgãos públicos brasileiros. Modelos, capacidade, custo e as
            curiosidades por trás de cada uma.
          </p>
        </div>
      </section>

      {/* KPIs */}
      <div className="bloomberg-kpi-grid">
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Frota FAB total</div>
          <div className="bloomberg-kpi-value">~{frota._meta.total_aproximado_fab}</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>aeronaves</div>
        </div></div>
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">No catálogo</div>
          <div className="bloomberg-kpi-value">{todas.length}</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>modelos detalhados</div>
        </div></div>
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Frota VIP</div>
          <div className="bloomberg-kpi-value">{frota.categorias.find(c => c.id === "vip")?.aeronaves.reduce((s, a) => s + a.quantidade, 0) ?? 0}</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>levam autoridades</div>
        </div></div>
        <div className="bloomberg-kpi"><div>
          <div className="bloomberg-kpi-label">Outros órgãos</div>
          <div className="bloomberg-kpi-value">{pub?._meta.total_aeronaves ?? "—"}</div>
          <div style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.25rem" }}>PF, PRF, estados (RAB)</div>
        </div></div>
      </div>

      {/* Catálogo por categoria */}
      <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
        {frota.categorias.map(cat => (
          <section key={cat.id} style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
              <div style={{ height: "1.75rem", width: "3px", flexShrink: 0, backgroundColor: ACCENT }} />
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>{cat.nome}</h2>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                {cat.aeronaves.length} modelos
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem 1rem" }}>
              {cat.descricao}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {cat.aeronaves.map(a => <CardAeronave key={a.designacao} a={a} />)}
            </div>
          </section>
        ))}

        {/* Aposentadas */}
        {frota.aposentadas?.length > 0 && (
          <section style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ height: "1.75rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--text-caption))" }} />
              <h2 style={{ fontSize: "1.25rem", margin: 0, color: "hsl(var(--text-caption))" }}>Aposentadas</h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
              {frota.aposentadas.map(a => (
                <div key={a.designacao} style={{ border: "1px dashed hsl(var(--border))", backgroundColor: "hsl(var(--surface))", borderRadius: "3px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "hsl(var(--text-body))" }}>{a.designacao}</div>
                  <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>{a.modelo} · {a.status}</div>
                  <div style={{ fontSize: "0.75rem", lineHeight: 1.55, color: "hsl(var(--text-body))" }}>{a.curiosidade}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Frota dos órgãos públicos (RAB) */}
      {pub && (
        <section style={{ borderTop: "1px solid hsl(var(--border))" }}>
          <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.375rem" }}>
              <div style={{ height: "1.75rem", width: "3px", flexShrink: 0, backgroundColor: ACCENT }} />
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Frota dos órgãos públicos</h2>
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                {pub._meta.total_aeronaves} aeronaves
              </span>
            </div>
            <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: "0 0 1.25rem 1rem", maxWidth: "44rem" }}>
              Além da FAB, o Estado brasileiro opera aeronaves por meio de polícias,
              bombeiros, governos estaduais e agências federais civis. Mapeadas via
              Registro Aeronáutico Brasileiro (RAB/ANAC) — dados de {pub._meta.data_rab}.
            </p>

            <div style={{ overflowX: "auto" }}>
              <table className="bloomberg-table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th style={{ textAlign: "right" }}>Aeronaves</th>
                    <th style={{ textAlign: "right" }}>Órgãos</th>
                    <th>Modelos mais comuns</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(pub.frotas)
                    .map(([cat, orgs]) => {
                      const aeronaves = Object.values(orgs).flat();
                      const modelos = new Map<string, number>();
                      for (const a of aeronaves) {
                        const m = a.modelo || "—";
                        modelos.set(m, (modelos.get(m) ?? 0) + 1);
                      }
                      const top = [...modelos.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3);
                      return { cat, n: aeronaves.length, orgs: Object.keys(orgs).length, top };
                    })
                    .sort((a, b) => b.n - a.n)
                    .map(row => (
                      <tr key={row.cat}>
                        <td style={{ fontWeight: 600 }}>{row.cat}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{row.n}</td>
                        <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", color: "hsl(var(--text-caption))" }}>{row.orgs}</td>
                        <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>
                          {row.top.map(([m, c]) => `${m} (${c})`).join(" · ")}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", marginTop: "0.75rem", fontStyle: "italic" }}>
              Aeronaves militares da FAB não constam no RAB (registro civil) — por isso
              aparecem só no catálogo acima. Esta tabela cobre os demais órgãos.
            </p>
          </div>
        </section>
      )}

      {/* Tabela comparativa */}
      <section style={{ borderTop: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--surface))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <div style={{ height: "1.75rem", width: "3px", flexShrink: 0, backgroundColor: ACCENT }} />
            <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Tabela comparativa</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="bloomberg-table">
              <thead>
                <tr>
                  <th>Designação</th><th>Modelo</th><th>Categoria</th>
                  <th style={{ textAlign: "right" }}>Qtd.</th>
                  <th style={{ textAlign: "right" }}>Velocidade</th>
                  <th style={{ textAlign: "right" }}>Alcance</th>
                  <th style={{ textAlign: "right" }}>Desde</th>
                </tr>
              </thead>
              <tbody>
                {todas.sort((a, b) => b.quantidade - a.quantidade).map(a => (
                  <tr key={a.designacao}>
                    <td style={{ fontWeight: 600 }}>{a.designacao}</td>
                    <td style={{ color: "hsl(var(--text-caption))" }}>{a.modelo}</td>
                    <td style={{ fontSize: "0.75rem" }}>{a.categoria}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{a.quantidade}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{a.velocidade_kmh ? `${a.velocidade_kmh}` : "—"}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>{a.alcance_km ? a.alcance_km.toLocaleString("pt-BR") : (a.autonomia_h ? `${a.autonomia_h}h` : "—")}</td>
                    <td style={{ textAlign: "right", fontFamily: "var(--font-mono)" }}>{a.entrada_servico}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Avisos metodológicos */}
          <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", border: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--card))", borderRadius: "3px" }}>
            <div style={{ fontSize: "0.6875rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
              Notas metodológicas
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {frota._meta.avisos.map((av, i) => (
                <li key={i} style={{ fontSize: "0.75rem", color: "hsl(var(--text-body))", lineHeight: 1.5 }}>{av}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
