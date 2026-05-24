import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "ALMG — Despesas de gabinete dos deputados estaduais de Minas Gerais";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

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
              Transparência Federal · Estados
            </span>
            <span style={{ fontSize: 24, color: FG, fontWeight: 700, marginTop: 4 }}>
              ALMG — Minas Gerais
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

        {/* Footer */}
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
            almg.transparenciafederal.org
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
