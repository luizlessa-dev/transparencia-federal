import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "The BR Insider — Inteligência sobre o poder público";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── Paleta The BR Insider (sync com globals.css dark) ──────────────
const BG          = "#1A1A1A";   // grafite (--background dark)
const FG          = "#F2EFE5";   // off-white (--foreground dark)
const FG_DIM      = "#B8B4A6";   // creme atenuado
const CAPTION     = "#7A776E";   // caption
const BORDER      = "#2E2C26";   // separator
const BRAND_NAVY  = "#1F4870";   // azul-marinho institucional
const BRAND_RUST  = "#C76E45";   // laranja-ferrugem
const BRAND_GREEN = "#3B7553";   // verde-musgo
const BRAND_STEEL = "#4188B5";   // azul-aço

// ── Monograma circular (SVG inline, fiel ao componente Logo) ──────
function Monograma({ size: s = 140, color = FG }: { size?: number; color?: string }) {
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="47" stroke={color} strokeWidth="1.2" fill="none" />
      <circle cx="50" cy="50" r="44" stroke={color} strokeWidth="0.6" fill="none" />
      <text x="50" y="27" textAnchor="middle" fill={color} fontFamily="serif" fontStyle="italic" fontWeight={400} fontSize="11">
        the
      </text>
      <text x="50" y="60" textAnchor="middle" fill={color} fontFamily="serif" fontWeight={700} fontSize="34" letterSpacing="-1">
        BR
      </text>
      <text x="50" y="78" textAnchor="middle" fill={color} fontFamily="serif" fontWeight={400} fontSize="11">
        insider
      </text>
    </svg>
  );
}

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
          padding: "56px 64px 40px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Header: monograma + nome + tagline */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Monograma size={120} color={FG} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span style={{ fontSize: 38, color: FG, fontWeight: 700, letterSpacing: "-0.01em" }}>
              The BR Insider
            </span>
            <span style={{ fontSize: 19, color: FG_DIM, fontStyle: "italic", marginTop: 6 }}>
              Inteligência sobre o poder público
            </span>
          </div>
        </div>

        {/* Centro: claim editorial */}
        <div style={{ display: "flex", flex: 1, alignItems: "center", marginTop: 40 }}>
          <div style={{ display: "flex", gap: 32, alignItems: "stretch", width: "100%" }}>
            <div style={{ width: 3, background: BRAND_RUST, flexShrink: 0, alignSelf: "stretch" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
              <h1
                style={{
                  fontSize: 88,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: "-0.025em",
                  margin: 0,
                  color: FG,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span>O poder público,</span>
                <span style={{ fontStyle: "italic", color: BRAND_RUST }}>às claras.</span>
              </h1>
              <p
                style={{
                  fontSize: 26,
                  color: FG_DIM,
                  margin: 0,
                  lineHeight: 1.4,
                  maxWidth: 900,
                  fontFamily: "sans-serif",
                }}
              >
                Emendas, despesas, votações e financiamento de 594 parlamentares —
                jornalismo de dados independente sobre o Congresso Nacional.
              </p>
            </div>
          </div>
        </div>

        {/* Faixa de cores institucional */}
        <div style={{ display: "flex", height: 5, marginTop: 28 }}>
          <div style={{ flex: 1, background: BRAND_RUST }} />
          <div style={{ flex: 1, background: BRAND_GREEN }} />
          <div style={{ flex: 1, background: BRAND_STEEL }} />
          <div style={{ flex: 1, background: BRAND_NAVY }} />
        </div>

        {/* Footer: URL + assinatura independência */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 18,
            fontSize: 17,
            color: CAPTION,
            fontFamily: "sans-serif",
          }}
        >
          <span style={{ fontFamily: "monospace", fontWeight: 600, color: FG }}>
            www.thebrinsider.com
          </span>
          <span style={{ fontStyle: "italic" }}>
            Projeto independente · Sem vínculo com o Governo Federal
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
