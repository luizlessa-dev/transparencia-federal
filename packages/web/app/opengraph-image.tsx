import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Transparência Federal — Observatório do Congresso Nacional";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Paleta dark do site (globals.css)
const BG = "#121212";
const FG = "#F3F3ED";
const FG_DIM = "#BDBDB6";
const CAPTION = "#80807A";
const BORDER = "#2A2A28";

export default async function OGImage() {
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
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header: badge + label */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: FG,
              color: BG,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 30,
              letterSpacing: "0.05em",
            }}
          >
            TF
          </div>
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span
              style={{
                fontSize: 15,
                color: CAPTION,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
                fontWeight: 600,
              }}
            >
              Observatório Parlamentar
            </span>
            <span style={{ fontSize: 24, color: FG, fontWeight: 700, marginTop: 4 }}>
              Transparência Federal
            </span>
          </div>
        </div>

        {/* Middle: título + tagline */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 36 }}>
          <div style={{ display: "flex", gap: 32, alignItems: "stretch", width: "100%" }}>
            <div style={{ width: 4, background: FG, flexShrink: 0, alignSelf: "stretch" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <h1
                style={{
                  fontSize: 92,
                  fontWeight: 800,
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  color: FG,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span>O poder público,</span>
                <span style={{ fontStyle: "italic", fontWeight: 700 }}>às claras.</span>
              </h1>
              <p
                style={{
                  fontSize: 28,
                  color: FG_DIM,
                  margin: 0,
                  lineHeight: 1.35,
                  maxWidth: 920,
                }}
              >
                Emendas, despesas e votações de 594 parlamentares do Congresso Nacional —
                organizados pra jornalistas, pesquisadores e cidadãos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer: URL + métricas */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 36,
            paddingTop: 24,
            borderTop: `1px solid ${BORDER}`,
            fontSize: 18,
            color: CAPTION,
          }}
        >
          <span style={{ fontFamily: "monospace", fontWeight: 600, color: FG }}>
            www.transparenciafederal.com
          </span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, background: FG }} />
            <span>75K emendas · 540k despesas · 2015–2026</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
