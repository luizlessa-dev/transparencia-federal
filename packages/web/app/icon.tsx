import { ImageResponse } from "next/og";

// Favicon 32x32 — monograma simplificado do The BR Insider.
// Em 32px só dá pra ler "BR"; versões maiores estão em apple-icon.tsx.

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

const BG = "#1A1A1A";
const FG = "#F2EFE5";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          {/* anel duplo */}
          <circle cx="16" cy="16" r="15" stroke={FG} strokeWidth="1" fill="none" />
          <circle cx="16" cy="16" r="13.5" stroke={FG} strokeWidth="0.4" fill="none" />
          {/* "BR" centralizado */}
          <text
            x="16"
            y="22"
            textAnchor="middle"
            fill={FG}
            fontFamily="serif"
            fontWeight={700}
            fontSize="16"
            letterSpacing="-0.5"
          >
            BR
          </text>
        </svg>
      </div>
    ),
    { ...size }
  );
}
