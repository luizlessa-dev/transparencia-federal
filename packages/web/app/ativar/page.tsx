import { redirect } from "next/navigation";
import { getUser } from "~/lib/supabase-auth";
import { ativarCodigoAction } from "./actions";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ativar plano — Transparência Federal",
};

export default async function AtivarPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect("/login?next=/ativar");

  const { error } = await searchParams;

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
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ marginBottom: "2rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "hsl(var(--text-headline))", margin: "0 0 0.375rem" }}>
            Ativar código de acesso
          </h1>
          <p style={{ fontSize: "0.875rem", color: "hsl(var(--text-caption))", margin: 0 }}>
            Insira o código enviado por e-mail para ativar seu plano.
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

          <form action={ativarCodigoAction}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                htmlFor="codigo"
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
                Código de acesso
              </label>
              <input
                id="codigo"
                name="codigo"
                type="text"
                required
                autoComplete="off"
                placeholder="Ex: TF-2026-XXXX"
                style={{
                  width: "100%",
                  padding: "0.75rem 0.875rem",
                  fontSize: "1rem",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  backgroundColor: "hsl(var(--surface))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "2px",
                  color: "hsl(var(--text-headline))",
                  outline: "none",
                  boxSizing: "border-box",
                  textAlign: "center",
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
              }}
            >
              Ativar plano
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>
          Não tem um código?{" "}
          <a
            href="mailto:lc.lessa@gmail.com?subject=Acesso%20Transparência%20Federal"
            style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
          >
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  );
}
