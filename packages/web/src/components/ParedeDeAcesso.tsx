import Link from "next/link";

/**
 * Parede de acesso (freemium-SEO): o conteúdo público/teaser fica visível e
 * indexável; os dados profundos são substituídos por este CTA para quem não
 * está logado. Reutilizável em qualquer seção (perfil, folha, leads...).
 */
export function ParedeDeAcesso({
  titulo = "Conteúdo completo para usuários cadastrados",
  descricao = "Crie uma conta gratuita ou entre para ver todos os dados desta seção.",
  next,
  tipo = "login",
}: {
  titulo?: string;
  descricao?: string;
  /** Caminho de retorno após login/cadastro. */
  next?: string;
  /** "login" = cadastro grátis; "pago" = upgrade de plano. */
  tipo?: "login" | "pago";
}) {
  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  const primario =
    tipo === "pago"
      ? { href: `/planos${q}`, label: "Ver planos" }
      : { href: `/cadastro${q}`, label: "Criar conta grátis" };
  return (
    <div
      className="bloomberg-card"
      style={{
        textAlign: "center",
        padding: "2rem 1.5rem",
        borderStyle: "dashed",
        borderColor: "hsl(var(--border))",
      }}
    >
      <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }} aria-hidden>
        🔒
      </div>
      <h3
        style={{
          fontSize: "0.9375rem",
          fontWeight: 700,
          color: "hsl(var(--text-headline))",
          margin: "0 0 0.375rem",
        }}
      >
        {titulo}
      </h3>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "hsl(var(--text-body))",
          margin: "0 auto 1rem",
          maxWidth: "30rem",
          lineHeight: 1.5,
        }}
      >
        {descricao}
      </p>
      <div style={{ display: "flex", gap: "0.625rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href={primario.href}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            padding: "0.5rem 1rem",
            borderRadius: "2px",
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            textDecoration: "none",
          }}
        >
          {primario.label}
        </Link>
        <Link
          href={`/login${q}`}
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            padding: "0.5rem 1rem",
            borderRadius: "2px",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--text-body))",
            textDecoration: "none",
          }}
        >
          Entrar
        </Link>
      </div>
    </div>
  );
}
