import type { CSSProperties } from "react";

type Variant = "strip" | "card";

interface Props {
  variant?: Variant;
  /** Texto curto extra ao final (opcional, só na variante `card`). */
  context?: string;
}

const STRIP_STYLE: CSSProperties = {
  backgroundColor: "hsl(var(--surface))",
  borderBottom: "1px solid hsl(var(--border))",
  fontSize: "0.6875rem",
  color: "hsl(var(--text-caption))",
  textAlign: "center",
  padding: "0.375rem 1rem",
  letterSpacing: "0.01em",
  lineHeight: 1.5,
};

const CARD_STYLE: CSSProperties = {
  padding: "0.875rem 1rem",
  backgroundColor: "hsl(var(--surface))",
  border: "1px solid hsl(var(--border))",
  borderLeft: "3px solid hsl(var(--warning))",
  borderRadius: "2px",
  fontSize: "0.8125rem",
  color: "hsl(var(--text-body))",
  lineHeight: 1.6,
};

export function IndependenceNotice({ variant = "strip", context }: Props) {
  if (variant === "strip") {
    return (
      <div role="note" style={STRIP_STYLE}>
        <strong style={{ color: "hsl(var(--text-body))" }}>Projeto independente.</strong>{" "}
        Sem vínculo com o Governo Federal. Dados de fontes públicas oficiais.
      </div>
    );
  }

  return (
    <div role="note" style={CARD_STYLE}>
      <div
        style={{
          fontSize: "0.625rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: "hsl(var(--warning))",
          marginBottom: "0.375rem",
        }}
      >
        Aviso de independência
      </div>
      <p style={{ margin: 0 }}>
        O <strong>The BR Insider</strong> é um projeto jornalístico independente, sem
        vínculo com o Governo Federal, a Câmara, o Senado ou qualquer órgão público. Os dados
        são coletados de fontes oficiais (Portal da Transparência, APIs da Câmara e do Senado)
        e organizados sob responsabilidade editorial própria.
        {context ? ` ${context}` : ""}
      </p>
    </div>
  );
}
