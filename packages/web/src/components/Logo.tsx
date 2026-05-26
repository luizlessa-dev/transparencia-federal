/**
 * Logo do The BR Insider — duas variantes:
 *
 *  - <LogoMonograma />  : selo circular "the BR insider"           (header, favicons, badges)
 *  - <LogoWordmark />   : marca empilhada com tagline opcional     (footer, about, OG image)
 *
 * Implementado como SVG inline pra:
 *  - não depender de assets binários no /public
 *  - escalar perfeitamente em qualquer DPI
 *  - herdar cor do `color` do contexto (pinta em currentColor)
 *
 * Quando o time de marca entregar o SVG vetorial oficial,
 * basta substituir os <path>/<text> aqui.
 */

interface MonogramaProps {
  size?: number;
  /** Cor do traço/texto. Default: currentColor (herda do contexto). */
  color?: string;
  ariaLabel?: string;
}

export function LogoMonograma({
  size = 36,
  color = "currentColor",
  ariaLabel = "The BR Insider",
}: MonogramaProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ariaLabel}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Anel duplo */}
      <circle cx="50" cy="50" r="47" stroke={color} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="44" stroke={color} strokeWidth="0.6" />

      {/* "the" no arco superior */}
      <text
        x="50"
        y="27"
        textAnchor="middle"
        fill={color}
        fontFamily="Playfair Display, Georgia, serif"
        fontStyle="italic"
        fontWeight={400}
        fontSize="11"
      >
        the
      </text>

      {/* "BR" no centro */}
      <text
        x="50"
        y="60"
        textAnchor="middle"
        fill={color}
        fontFamily="Playfair Display, Georgia, serif"
        fontWeight={700}
        fontSize="34"
        letterSpacing="-1"
      >
        BR
      </text>

      {/* "insider" no arco inferior */}
      <text
        x="50"
        y="78"
        textAnchor="middle"
        fill={color}
        fontFamily="Playfair Display, Georgia, serif"
        fontWeight={400}
        fontSize="11"
      >
        insider
      </text>
    </svg>
  );
}

interface WordmarkProps {
  /** Mostra a tagline "Inteligência sobre o poder público" embaixo. */
  withTagline?: boolean;
  color?: string;
  ariaLabel?: string;
}

export function LogoWordmark({
  withTagline = false,
  color = "currentColor",
  ariaLabel = "The BR Insider",
}: WordmarkProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        lineHeight: 1,
        color,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: "0.875rem",
          letterSpacing: "0.01em",
        }}
      >
        the
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "1.5rem",
          letterSpacing: "-0.015em",
        }}
      >
        BR <span style={{ borderBottom: `1px solid ${color}`, paddingBottom: "1px" }}>insider</span>
      </span>
      {withTagline && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: "0.6875rem",
            opacity: 0.7,
            marginTop: "0.375rem",
            letterSpacing: "0.01em",
          }}
        >
          Inteligência sobre o poder público
        </span>
      )}
    </div>
  );
}
