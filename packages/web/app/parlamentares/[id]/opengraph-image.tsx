import { ImageResponse } from "next/og";
import { getSupabase } from "~/lib/supabase-server";

export const alt = "Perfil de parlamentar — The BR Insider";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#1A1A1A";
const FG = "#F2EFE5";
const FG_DIM = "#B8B4A6";
const CAPTION = "#7A776E";
const BRAND_RUST = "#C76E45";
const BRAND_GREEN = "#3B7553";
const BRAND_STEEL = "#4188B5";
const BRAND_NAVY = "#1F4870";

// Selo da marca em HTML/CSS (Satori não suporta <text> em SVG).
function Selo() {
  return (
    <div
      style={{
        width: 88,
        height: 88,
        borderRadius: "50%",
        border: `1.5px solid ${FG}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "serif",
        color: FG,
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: 11, fontStyle: "italic" }}>the</span>
      <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1 }}>BR</span>
      <span style={{ fontSize: 11 }}>insider</span>
    </div>
  );
}

export default async function OG({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let nome = "Parlamentar";
  let cargo = "Congresso Nacional";
  let pu = "";
  try {
    const sb = getSupabase();
    const { data: p } = await sb
      .from("parlamentares")
      .select("nome, nome_parlamentar, partido, uf, casa_legislativa")
      .eq("id", id)
      .single();
    if (p) {
      nome = p.nome_parlamentar || p.nome || nome;
      cargo = p.casa_legislativa === "senado" ? "Senador(a)" : "Deputado(a) Federal";
      pu = [p.partido, p.uf].filter(Boolean).join(" · ");
    }
  } catch {
    /* fallback genérico */
  }

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 22, color: FG_DIM, fontStyle: "italic" }}>{cargo}</span>
          <Selo />
        </div>

        <div style={{ display: "flex", flex: 1, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 32, alignItems: "stretch", width: "100%" }}>
            <div style={{ width: 4, background: BRAND_RUST, flexShrink: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <h1 style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.025em", margin: 0, color: FG }}>
                {nome}
              </h1>
              {pu ? (
                <span style={{ fontSize: 34, color: BRAND_RUST, fontWeight: 700, fontFamily: "sans-serif" }}>{pu}</span>
              ) : null}
              <p style={{ fontSize: 24, color: FG_DIM, margin: 0, fontFamily: "sans-serif", maxWidth: 920, lineHeight: 1.4 }}>
                Emendas, despesas, votações, financiamento e folha de gabinete — dados públicos.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: 5, marginTop: 24 }}>
          <div style={{ flex: 1, background: BRAND_RUST }} />
          <div style={{ flex: 1, background: BRAND_GREEN }} />
          <div style={{ flex: 1, background: BRAND_STEEL }} />
          <div style={{ flex: 1, background: BRAND_NAVY }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: 17, color: CAPTION, fontFamily: "sans-serif" }}>
          <span style={{ fontFamily: "monospace", fontWeight: 600, color: FG }}>www.thebrinsider.com</span>
          <span style={{ fontStyle: "italic" }}>Projeto independente</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
