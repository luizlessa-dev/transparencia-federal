/**
 * AuthButton — Server Component exibido no header.
 * Mostra "Entrar" para visitantes ou "Conta" para usuários autenticados.
 */

import Link from "next/link";
import { getUser } from "~/lib/supabase-auth";

export async function AuthButton() {
  const user = await getUser();

  if (user) {
    return (
      <Link
        href="/conta"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.375rem 0.75rem",
          fontSize: "0.75rem",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
          color: "hsl(var(--text-body))",
          textDecoration: "none",
          border: "1px solid hsl(var(--border))",
          borderRadius: "2px",
          backgroundColor: "hsl(var(--surface))",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: "hsl(var(--success))",
          flexShrink: 0,
        }} />
        Conta
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      style={{
        display: "inline-block",
        padding: "0.375rem 0.75rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        fontFamily: "var(--font-sans)",
        color: "hsl(var(--primary-foreground))",
        textDecoration: "none",
        borderRadius: "2px",
        backgroundColor: "hsl(var(--primary))",
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      Entrar
    </Link>
  );
}
