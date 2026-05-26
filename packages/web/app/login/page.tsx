import Link from "next/link";
import { loginAction } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>;
}

export const metadata = {
  title: "Entrar — The BR Insider",
};

export default async function LoginPage({ searchParams }: Props) {
  const { error, next } = await searchParams;

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
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
        }}
      >
        {/* Cabeçalho */}
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
          <h1
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              color: "hsl(var(--text-headline))",
              margin: "0 0 0.375rem",
            }}
          >
            Entrar na plataforma
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0 }}>
            Acesso completo ao banco de dados do Congresso Nacional
          </p>
        </div>

        {/* Card do formulário */}
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

          <form action={loginAction}>
            <input type="hidden" name="next" value={next ?? "/risco"} />

            <div style={{ marginBottom: "1.25rem" }}>
              <label
                htmlFor="email"
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "hsl(var(--text-caption))",
                  marginBottom: "0.5rem",
                }}
              >
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                style={{
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.875rem",
                  backgroundColor: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  color: "hsl(var(--text-headline))",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="password"
                style={{
                  display: "block",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "hsl(var(--text-caption))",
                  marginBottom: "0.5rem",
                }}
              >
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.875rem",
                  backgroundColor: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  color: "hsl(var(--text-headline))",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: "100%",
                padding: "0.75rem",
                backgroundColor: "hsl(var(--primary))",
                color: "hsl(var(--primary-foreground))",
                border: "none",
                borderRadius: "2px",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
                letterSpacing: "0.03em",
              }}
            >
              Entrar
            </button>
          </form>
        </div>

        {/* Links */}
        <div
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.8125rem",
            color: "hsl(var(--text-caption))",
          }}
        >
          Não tem conta?{" "}
          <Link
            href="/planos"
            style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}
          >
            Ver planos
          </Link>{" "}
          ·{" "}
          <Link
            href="/cadastro"
            style={{ color: "hsl(var(--text-body))", textDecoration: "none" }}
          >
            Criar conta gratuita
          </Link>
        </div>
      </div>
    </div>
  );
}
