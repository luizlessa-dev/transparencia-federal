import { redirect } from "next/navigation";
import Link from "next/link";
import { getUser, getPlano } from "~/lib/supabase-auth";
import { getSupabase } from "~/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Minha Conta — Transparência Federal",
};

interface Props {
  searchParams: Promise<{ ativado?: string; confirmado?: string }>;
}

const PLANO_LABEL: Record<string, string> = {
  free: "Gratuito",
  individual: "Individual",
  institucional: "Institucional",
};

const PLANO_COR: Record<string, string> = {
  free: "hsl(var(--text-caption))",
  individual: "hsl(var(--primary))",
  institucional: "hsl(var(--success))",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function ContaPage({ searchParams }: Props) {
  const user = await getUser();
  if (!user) redirect("/login?next=/conta");

  const { ativado, confirmado } = await searchParams;

  const plano = await getPlano(user.id);

  // Busca validade
  const sb = getSupabase();
  const { data: profile } = await sb
    .from("user_profiles")
    .select("plano_valido_ate, criado_em")
    .eq("id", user.id)
    .single();

  const validoAte = profile?.plano_valido_ate ?? null;
  const criadoEm = profile?.criado_em ?? null;

  return (
    <div
      style={{
        minHeight: "calc(100vh - 4rem)",
        backgroundColor: "hsl(var(--background))",
        padding: "2.5rem 1rem",
      }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>

        {/* Banner de confirmação de e-mail */}
        {confirmado && (
          <div
            style={{
              backgroundColor: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.3)",
              borderRadius: "2px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              fontSize: "0.8125rem",
              color: "hsl(var(--primary))",
              fontWeight: 600,
            }}
          >
            ✓ E-mail confirmado. Bem-vindo ao Transparência Federal!
          </div>
        )}

        {/* Banner de ativação de código */}
        {ativado && (
          <div
            style={{
              backgroundColor: "hsl(var(--success) / 0.1)",
              border: "1px solid hsl(var(--success) / 0.3)",
              borderRadius: "2px",
              padding: "0.75rem 1rem",
              marginBottom: "1.5rem",
              fontSize: "0.8125rem",
              color: "hsl(var(--success))",
              fontWeight: 600,
            }}
          >
            ✓ Plano ativado com sucesso! Bom trabalho.
          </div>
        )}

        {/* Cabeçalho */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontSize: "1.375rem", fontWeight: 700, color: "hsl(var(--text-headline))", margin: "0 0 0.25rem" }}>
            Minha conta
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: 0 }}>
            {user.email}
          </p>
        </div>

        {/* Card de plano */}
        <div
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            padding: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--text-caption))", marginBottom: "1rem" }}>
            Plano atual
          </p>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <span style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: PLANO_COR[plano] ?? "hsl(var(--text-headline))",
            }}>
              {PLANO_LABEL[plano] ?? plano}
            </span>
            {plano === "free" && (
              <Link
                href="/planos"
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  color: "hsl(var(--primary))",
                  textDecoration: "none",
                  border: "1px solid hsl(var(--primary))",
                  borderRadius: "2px",
                  padding: "0.25rem 0.75rem",
                }}
              >
                Ver planos
              </Link>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {validoAte && plano !== "free" && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                <span style={{ color: "hsl(var(--text-caption))" }}>Válido até</span>
                <span style={{ color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                  {fmtDate(validoAte)}
                </span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "hsl(var(--text-caption))" }}>Conta criada</span>
              <span style={{ color: "hsl(var(--text-body))", fontFamily: "var(--font-mono)" }}>
                {fmtDate(criadoEm)}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span style={{ color: "hsl(var(--text-caption))" }}>E-mail</span>
              <span style={{ color: "hsl(var(--text-body))" }}>{user.email}</span>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div
          style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            overflow: "hidden",
            marginBottom: "1rem",
          }}
        >
          <Link
            href="/ativar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.875rem 1.25rem",
              textDecoration: "none",
              borderBottom: "1px solid hsl(var(--border))",
            }}
          >
            <span style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>Ativar código de acesso</span>
            <span style={{ color: "hsl(var(--text-caption))", fontSize: "0.875rem" }}>→</span>
          </Link>
          <Link
            href="/planos"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.875rem 1.25rem",
              textDecoration: "none",
            }}
          >
            <span style={{ fontSize: "0.875rem", color: "hsl(var(--text-body))" }}>Ver planos e preços</span>
            <span style={{ color: "hsl(var(--text-caption))", fontSize: "0.875rem" }}>→</span>
          </Link>
        </div>

        {/* Logout */}
        <form action="/logout" method="POST">
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "0.625rem",
              backgroundColor: "transparent",
              border: "1px solid hsl(var(--border))",
              borderRadius: "2px",
              fontSize: "0.875rem",
              color: "hsl(var(--text-caption))",
              cursor: "pointer",
            }}
          >
            Sair da conta
          </button>
        </form>

      </div>
    </div>
  );
}
