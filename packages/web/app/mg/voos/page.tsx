/**
 * Voos oficiais do Governador de MG — quem voa, para onde.
 * Rota: /mg/voos
 */
import type { Metadata } from "next";
import Link from "next/link";
import { getMgVoos } from "~/services/mg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Voos oficiais do Governador de Minas Gerais — quem voa, para onde | The BR Insider",
  description:
    "Voos em aeronaves oficiais do Governo de Minas Gerais: passageiros, cargos, rotas e aeronaves, de 2021 a 2026.",
  alternates: { canonical: "https://www.thebrinsider.com/mg/voos" },
  openGraph: { title: "Voos oficiais do Governador de Minas Gerais", description: "Quem voa em aeronave oficial do Governo de MG, e para onde.", url: "https://www.thebrinsider.com/mg/voos", siteName: "The BR Insider", type: "website", locale: "pt_BR" },
};

type Row = { data_voo: string | null; aeronave: string | null; origem: string | null; destino: string | null; passageiro: string | null; cargo_passageiro: string | null };
const fmtNum = (v: number) => new Intl.NumberFormat("pt-BR").format(v);
const up = (s: string | null) => (s ?? "?").toUpperCase().trim();

export default async function MgVoosPage() {
  const { data: _voos } = await getMgVoos();
  const rows = _voos ?? [];
  const porPax = new Map<string, number>(); for (const r of rows) { const k = r.passageiro?.trim() || "?"; porPax.set(k, (porPax.get(k) ?? 0) + 1); }
  const pax = [...porPax.entries()].sort((a, b) => b[1] - a[1]);
  const porDest = new Map<string, number>(); for (const r of rows) { const k = up(r.destino); porDest.set(k, (porDest.get(k) ?? 0) + 1); }
  const dest = [...porDest.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <>
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem 1.5rem", maxWidth: "1000px" }}>
          <div style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginBottom: "1rem", display: "flex", gap: "0.375rem" }}>
            <Link href="/mg" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>Governo de MG</Link><span>/</span><span>Voos oficiais</span>
          </div>
          <h1 style={{ fontSize: "1.625rem", margin: 0, lineHeight: 1.2 }}>Voos oficiais do Governador: quem voa, para onde</h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", margin: "0.5rem 0 0", maxWidth: "700px", lineHeight: 1.6 }}>
            Trechos em <strong>aeronaves oficiais</strong> do Governo de Minas Gerais (2021–2026):
            passageiros, cargos e destinos.
          </p>
        </div>
      </section>
      <div className="container" style={{ padding: "1.5rem 1.5rem 4rem", maxWidth: "1000px" }}>
        <div className="bloomberg-kpi-grid" style={{ marginBottom: "1.5rem" }}>
          <Kpi label="Trechos voados" value={fmtNum(rows.length)} />
          <Kpi label="Passageiros distintos" value={fmtNum(pax.length)} />
          <Kpi label="Destinos" value={fmtNum(dest.length)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Quem mais voa</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}><thead><tr><th>Passageiro</th><th style={{ textAlign: "right" }}>Trechos</th></tr></thead>
                <tbody>{pax.slice(0, 12).map(([k, v], i) => (<tr key={i}><td style={{ fontSize: "0.8125rem" }}>{k}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtNum(v)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
          <div>
            <h2 style={{ fontSize: "0.9375rem", margin: "0 0 0.625rem" }}>Destinos mais frequentes</h2>
            <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="bloomberg-table" style={{ width: "100%" }}><thead><tr><th>Destino</th><th style={{ textAlign: "right" }}>Trechos</th></tr></thead>
                <tbody>{dest.slice(0, 12).map(([k, v], i) => (<tr key={i}><td style={{ fontSize: "0.8125rem" }}>{k}</td><td style={{ textAlign: "right", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{fmtNum(v)}</td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
        <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Voos recentes</h2>
        <div className="bloomberg-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="bloomberg-table" style={{ width: "100%" }}>
            <thead><tr><th>Data</th><th>Rota</th><th>Passageiro</th><th>Aeronave</th></tr></thead>
            <tbody>{rows.slice(0, 40).map((r, i) => (<tr key={i}><td style={{ fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}>{r.data_voo}</td><td style={{ fontSize: "0.75rem" }}>{up(r.origem)} → {up(r.destino)}</td><td style={{ fontSize: "0.75rem", color: "hsl(var(--text-headline))" }}>{r.passageiro}<div style={{ fontSize: "0.625rem", color: "hsl(var(--text-caption))" }}>{r.cargo_passageiro}</div></td><td style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))" }}>{r.aeronave}</td></tr>))}</tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "1.5rem", lineHeight: 1.6 }}>
          <strong>Fonte:</strong> Voos Oficiais do Governador (Gabinete Militar), Portal de Dados Abertos
          de MG, CC-BY-4.0. Cada linha é um trecho/passageiro. Projeto independente.
        </p>
      </div>
    </>
  );
}
function Kpi({ label, value }: { label: string; value: string }) {
  return (<div className="bloomberg-kpi"><div className="bloomberg-kpi-label">{label}</div><div className="bloomberg-kpi-value">{value}</div></div>);
}
