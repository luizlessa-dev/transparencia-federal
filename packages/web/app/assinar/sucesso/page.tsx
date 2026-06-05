/**
 * /assinar/sucesso — página de confirmação pós-checkout Stripe.
 * Stripe redireciona aqui com ?session_id=cs_... após pagamento aprovado.
 */
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assinatura confirmada — The BR Insider",
  robots: { index: false },
};

export default function AssinaturaSuccessPage() {
  return (
    <div
      className="container"
      style={{
        maxWidth: "520px",
        padding: "4rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>✅</div>
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          margin: "0 0 0.75rem",
          color: "hsl(var(--text-headline))",
        }}
      >
        Assinatura confirmada!
      </h1>
      <p
        style={{
          fontSize: "0.9375rem",
          color: "hsl(var(--text-body))",
          lineHeight: 1.6,
          margin: "0 0 1.5rem",
        }}
      >
        Bem-vindo ao plano Individual do The BR Insider. Você agora tem acesso
        completo aos dados de investigação — doadores, cruzamentos de gabinete,
        exportação CSV e quota ampla de IA.
      </p>
      <p
        style={{
          fontSize: "0.8125rem",
          color: "hsl(var(--text-caption))",
          margin: "0 0 2rem",
        }}
      >
        O acesso pode levar alguns segundos para ativar enquanto processamos o pagamento.
        Recarregue a página se necessário.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link
          href="/risco"
          style={{
            padding: "0.625rem 1.25rem",
            backgroundColor: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            borderRadius: "2px",
            fontWeight: 600,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          Ver ranking de risco →
        </Link>
        <Link
          href="/conta"
          style={{
            padding: "0.625rem 1.25rem",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--text-body))",
            borderRadius: "2px",
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          Minha conta
        </Link>
      </div>
    </div>
  );
}
