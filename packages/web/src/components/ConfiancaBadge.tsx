import type { CSSProperties } from "react";

/**
 * Badge de qualidade/confiança do dado. É a primitiva da camada de confiança:
 * todo dataset de match ou estimativa deve declarar seu nível.
 *
 *   exato    — valor oficial direto da fonte
 *   alta     — cruzamento de alta precisão (ex: casado por CPF + nome completo)
 *   estimado — valor inferido (ex: salário por nível de cargo), não nominal
 *   revisar  — vínculo por nome, sujeito a homônimo (verificar antes de publicar)
 */
export type ConfiancaNivel = "exato" | "alta" | "estimado" | "revisar";

const MAP: Record<ConfiancaNivel, { classe: string; label: string; titulo: string }> = {
  exato: { classe: "badge-success", label: "Dado exato", titulo: "Valor oficial, sem inferência." },
  alta: { classe: "badge-success", label: "Alta confiança", titulo: "Cruzamento de alta precisão." },
  estimado: { classe: "badge-warn", label: "Estimado", titulo: "Valor inferido (ex: por nível de cargo), não nominal." },
  revisar: { classe: "badge-warn", label: "A revisar", titulo: "Vínculo por nome, sujeito a homônimo. Verifique antes de publicar." },
};

export function ConfiancaBadge({
  nivel,
  label,
  style,
}: {
  nivel: ConfiancaNivel;
  label?: string;
  style?: CSSProperties;
}) {
  const m = MAP[nivel];
  return (
    <span className={m.classe} title={m.titulo} style={{ fontSize: "0.625rem", ...style }}>
      {label ?? m.label}
    </span>
  );
}
