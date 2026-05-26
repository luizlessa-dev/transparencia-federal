import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ALMG — Despesas de gabinete dos deputados estaduais de Minas Gerais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Paleta The BR Insider (sync com globals.css)
const BG          = "#1A1A1A";
const FG          = "#F2EFE5";
const FG_DIM      = "#B8B4A6";
const CAPTION     = "#7A776E";
const BORDER      = "#2E2C26";
const BRAND_NAVY  = "#1F4870";
const BRAND_RUST  = "#C76E45";
const BRAND_GREEN = "#3B7553";
const BRAND_STEEL = "#4188B5";

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
        {/* Header: badge MG + label */}
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
            MG
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
              The BR Insider · Estados
            </span>
            <span style={{ fontSize: 24, color: FG, fontWeight: 700, marginTop: 4 }}>
              ALMG — Minas Gerais
            </span>
          </div>
        </div>

        {/* Middle: título + tagline */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 36 }}>
          <div style={{ display: "flex", gap: 32, alignItems: "stretch", width: "100%" }}>
            <div style={{ width: 3, background: BRAND_RUST, flexShrink: 0, alignSelf: "stretch" }} />
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
                <span>77 deputados.</span>
                <span style={{ fontStyle: "italic", fontWeight: 700 }}>Nota a nota.</span>
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
                Despesas de gabinete da Assembleia Legislativa de Minas Gerais —
                fornecedor a fornecedor, com CNPJ e detalhamento por categoria.
              </p>
            </div>
          </div>
        </div>

        {/* Faixa institucional The BR Insider */}
        <div style={{ display: "flex", height: 5, marginTop: 28 }}>
          <div style={{ flex: 1, background: BRAND_RUST }} />
          <div style={{ flex: 1, background: BRAND_GREEN }} />
          <div style={{ flex: 1, background: BRAND_STEEL }} />
          <div style={{ flex: 1, background: BRAND_NAVY }} />
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
            fontSize: 17,
            color: CAPTION,
          }}
        >
          <span style={{ fontFamily: "monospace", fontWeight: 600, color: FG }}>
            almg.thebrinsider.com
          </span>
          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ width: 8, height: 8, background: FG }} />
            <span>Câmara estadual · Dados públicos · LAI</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
