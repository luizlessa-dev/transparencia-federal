import { ImageResponse } from "next/og";

// Apple Touch Icon 180x180 — monograma fiel ao brinsider-logo.svg canônico.
// Usado em "Add to Home Screen" no iOS/iPadOS.

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        {/* SVG fiel ao brinsider-logo.svg: viewBox 300×300, círculo preenchido */}
        <svg width="180" height="180" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <circle cx="150" cy="150" r="110" fill="#1B1B1B" stroke="#FFFFFF" strokeWidth="1.5" />
          <circle cx="150" cy="150" r="100" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
          <text x="150" y="108" fontFamily="Georgia, serif" fontSize="18" fontWeight="400" fill="#FFFFFF" textAnchor="middle" fontStyle="italic">the</text>
          <text x="150" y="175" fontFamily="Georgia, serif" fontSize="68" fontWeight="700" fill="#FFFFFF" textAnchor="middle">BR</text>
          <text x="150" y="205" fontFamily="Georgia, serif" fontSize="18" fontWeight="400" fill="#FFFFFF" textAnchor="middle" letterSpacing="3">insider</text>
        </svg>
      </div>
    ),
    { ...size }
  );
}
