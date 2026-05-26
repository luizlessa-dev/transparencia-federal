import { ImageResponse } from "next/og";

// Apple Touch Icon 180x180 — monograma completo "the BR insider".
// Usado em "Add to Home Screen" no iOS/iPadOS.

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BG = "#1A1A1A";
const FG = "#F2EFE5";

export default function AppleIcon() {
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
        <svg width="160" height="160" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* anel duplo */}
          <circle cx="50" cy="50" r="47" stroke={FG} strokeWidth="1.2" fill="none" />
          <circle cx="50" cy="50" r="44" stroke={FG} strokeWidth="0.6" fill="none" />
          {/* the */}
          <text x="50" y="27" textAnchor="middle" fill={FG} fontFamily="serif" fontStyle="italic" fontWeight={400} fontSize="11">
            the
          </text>
          {/* BR */}
          <text x="50" y="60" textAnchor="middle" fill={FG} fontFamily="serif" fontWeight={700} fontSize="34" letterSpacing="-1">
            BR
          </text>
          {/* insider */}
          <text x="50" y="78" textAnchor="middle" fill={FG} fontFamily="serif" fontWeight={400} fontSize="11">
            insider
          </text>
        </svg>
      </div>
    ),
    { ...size }
  );
}
