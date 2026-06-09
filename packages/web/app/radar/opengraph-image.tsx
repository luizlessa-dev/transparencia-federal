import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Radar FAB — Quem voa com dinheiro público";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG       = "#1A1A1A";
const FG       = "#F2EFE5";
const FG_DIM   = "#B8B4A6";
const CAPTION  = "#7A776E";
const ACCENT   = "#C41E3A"; // vermelho Radar FAB

export default async function RadarOGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          color: FG,
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px 40px",
          fontFamily: "serif",
        }}
      >
        {/* Header: selo RF + nome */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 84, height: 84, borderRadius: 8, background: ACCENT,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 34, color: "#fff", letterSpacing: 1,
            }}
          >
            RF
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.01em" }}>Radar FAB</span>
            <span style={{ fontSize: 19, color: FG_DIM, fontStyle: "italic", marginTop: 6 }}>
              Voos de autoridades na Força Aérea Brasileira
            </span>
          </div>
        </div>

        {/* Centro: claim */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 36 }}>
          <div style={{ display: "flex", gap: 32, alignItems: "stretch", width: "100%" }}>
            <div style={{ width: 3, background: ACCENT, flexShrink: 0, alignSelf: "stretch" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <h1
                style={{
                  fontSize: 84, fontWeight: 700, lineHeight: 1.05,
                  letterSpacing: "-0.025em", margin: 0, color: FG,
                  display: "flex", flexDirection: "column",
                }}
              >
                <span>Quem voa com</span>
                <span style={{ fontStyle: "italic", color: ACCENT }}>dinheiro público.</span>
              </h1>
              <p style={{ fontSize: 25, color: FG_DIM, margin: 0, lineHeight: 1.4, maxWidth: 920, fontFamily: "sans-serif" }}>
                10.012 voos de autoridades catalogados desde 2020. Ranking, custo estimado,
                destinos e a frota completa — dados abertos, metodologia aberta.
              </p>
            </div>
          </div>
        </div>

        {/* Faixa de stat */}
        <div style={{ display: "flex", gap: 48, marginTop: 24, fontFamily: "sans-serif" }}>
          {[
            ["10.012", "voos"],
            ["R$ 614 mi", "custo estimado"],
            ["214", "autoridades"],
            ["49", "aeronaves no catálogo"],
          ].map(([v, l]) => (
            <div key={l} style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: FG }}>{v}</span>
              <span style={{ fontSize: 15, color: CAPTION }}>{l}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", height: 5, marginTop: 24, background: ACCENT }} />

        {/* Footer */}
        <div
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 16, fontSize: 17, color: CAPTION, fontFamily: "sans-serif",
          }}
        >
          <span style={{ fontFamily: "monospace", fontWeight: 600, color: FG }}>
            radar.thebrinsider.com
          </span>
          <span style={{ fontStyle: "italic" }}>
            Fonte: GABAER/COMAER · Decreto 10.267/2020
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
