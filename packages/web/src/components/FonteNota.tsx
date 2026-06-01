import type { CSSProperties, ReactNode } from "react";

/** "2026-05-01" → "01/05/2026" (sem problema de fuso); Date também aceito. */
function fmtData(d?: string | Date | null): string | null {
  if (!d) return null;
  if (typeof d === "string") {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const dt = d instanceof Date ? d : new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt.toLocaleDateString("pt-BR");
}

/**
 * Rodapé de atribuição de um dataset: "Fonte: X · Atualizado em DD/MM/AAAA".
 * Parte da camada de confiança — torna a procedência explícita em toda seção.
 */
export function FonteNota({
  fonte,
  atualizadoEm,
  href,
  style,
}: {
  fonte?: string;
  atualizadoEm?: string | Date | null;
  href?: string;
  style?: CSSProperties;
}) {
  const data = fmtData(atualizadoEm);
  if (!fonte && !data) return null;

  const partes: ReactNode[] = [];
  if (fonte) {
    partes.push(
      href ? (
        <a
          key="f"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "underline" }}
        >
          Fonte: {fonte}
        </a>
      ) : (
        <span key="f">Fonte: {fonte}</span>
      ),
    );
  }
  if (data) partes.push(<span key="a">Atualizado em {data}</span>);

  return (
    <p
      style={{
        fontSize: "0.625rem",
        color: "hsl(var(--text-caption))",
        margin: "0.75rem 0 0",
        lineHeight: 1.5,
        ...style,
      }}
    >
      {partes.map((p, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {p}
        </span>
      ))}
    </p>
  );
}
