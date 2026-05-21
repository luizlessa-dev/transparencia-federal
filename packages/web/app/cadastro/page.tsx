import Link from "next/link";
import { cadastroAction } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string; ok?: string }>;
}

export const metadata = {
  title: "Criar conta — Transparência Federal",
};

export default async function CadastroPage({ searchParams }: Props) {
  const { error, ok } = await searchParams;

  if (ok) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 4rem)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1rem",
        }}
      >
        <div style={{ maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✉️</div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "hsl(var(--text-headline))", marginBottom: "0.75rem" }}>
            Confirme seu e-mail
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Enviamos um link de confirmação para o seu e-mail. Clique no link para ativar sua conta e depois faça login.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "0.625rem 1.5rem",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderRadius: "2px",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: 600,
            }}
          >
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 4rem)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        backgroundColor: "hsl(var(--background))",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "3rem",
              height: "3rem",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderRadius: "2px",
              fontWeight: 700,
              fontSize: "1rem",
              marginBottom: "1rem",
            }}
          >
            TF
          </div>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "hsl(var(--text-headline))", margin: "0 0 0.375rem" }}>
            Criar conta gratuita
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0 }}>
            Acesso ao top 10. Para dados completos, assine um plano.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            padding: "2rem",
          }}
        >
          {error && (
            <div
              style={{
                backgroundColor: "hsl(var(--danger) / 0.1)",
                border: "1px solid hsl(var(--danger) / 0.3)",
                borderRadius: "2px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                fontSize: "0.8125rem",
                color: "hsl(var(--danger))",
              }}
            >
              {error}
            </div>
          )}

          <form action={cadastroAction}>
            <div style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="email" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
                E-mail
              </label>
              <input
                id="email" name="email" type="email" required autoComplete="email"
                placeholder="seu@email.com"
                style={{ width: "100%", padding: "0.625rem 0.875rem", fontSize: "0.875rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", color: "hsl(var(--text-headline))", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <label htmlFor="password" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
                Senha
              </label>
              <input
                id="password" name="password" type="password" required autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                style={{ width: "100%", padding: "0.625rem 0.875rem", fontSize: "0.875rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", color: "hsl(var(--text-headline))", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label htmlFor="confirm" style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
                Confirmar senha
              </label>
              <input
                id="confirm" name="confirm" type="password" required autoComplete="new-password"
                placeholder="Repita a senha"
                style={{ width: "100%", padding: "0.625rem 0.875rem", fontSize: "0.875rem", backgroundColor: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", borderRadius: "2px", color: "hsl(var(--text-headline))", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              style={{ width: "100%", padding: "0.75rem", backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "2px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer", letterSpacing: "0.03em" }}
            >
              Criar conta
            </button>
          </form>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          Já tem conta?{" "}
          <Link href="/login" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            Entrar
          </Link>
          {" · "}
          <Link href="/planos" style={{ color: "hsl(var(--text-body))", textDecoration: "none" }}>
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
