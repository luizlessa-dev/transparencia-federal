import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ConfiancaBadge, type ConfiancaNivel } from "./ConfiancaBadge";
import { FonteNota } from "./FonteNota";

const tituloStyle: CSSProperties = {
  fontSize: "0.625rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "hsl(var(--text-caption))",
  margin: 0,
};

/**
 * Contrato único de "seção de dataset". Toda fonte de dado (emendas, CEAP,
 * folha, doador, nepotismo, custo...) se apresenta por aqui: título, badge de
 * confiança, CTA de detalhe e rodapé de fonte/atualização. Substitui os
 * cabeçalhos de seção inline copy-pasted e garante a camada de confiança.
 */
export function DatasetSection({
  titulo,
  confianca,
  fonte,
  fonteHref,
  atualizadoEm,
  verDetalheHref,
  verDetalheLabel = "Ver detalhe →",
  semCard = false,
  children,
  style,
}: {
  titulo: string;
  confianca?: ConfiancaNivel;
  fonte?: string;
  fonteHref?: string;
  atualizadoEm?: string | Date | null;
  verDetalheHref?: string;
  verDetalheLabel?: string;
  /** Renderiza sem o wrapper .bloomberg-card (quando já está dentro de um). */
  semCard?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const conteudo = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          marginBottom: "0.875rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
          <h3 style={tituloStyle}>{titulo}</h3>
          {confianca && <ConfiancaBadge nivel={confianca} />}
        </div>
        {verDetalheHref && (
          <Link
            href={verDetalheHref}
            style={{
              fontSize: "0.6875rem",
              color: "hsl(var(--primary))",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {verDetalheLabel}
          </Link>
        )}
      </div>
      {children}
      <FonteNota fonte={fonte} atualizadoEm={atualizadoEm} href={fonteHref} />
    </>
  );

  return semCard ? (
    <section style={style}>{conteudo}</section>
  ) : (
    <section className="bloomberg-card" style={style}>
      {conteudo}
    </section>
  );
}
