/**
 * CheckoutButton — Client Component.
 * Chama POST /api/checkout e redireciona para o Stripe Checkout.
 */
"use client";
import { useState } from "react";

interface Props {
  plan: "monthly" | "annual";
  label?: string;
  style?: React.CSSProperties;
}

export function CheckoutButton({ plan, label = "Assinar agora", style }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();

      if (res.status === 401) {
        // Não logado → leva para cadastro
        window.location.href = data.redirect ?? "/cadastro?next=/planos";
        return;
      }
      if (!res.ok || !data.url) {
        setErro(data.erro ?? "Erro ao iniciar assinatura. Tente novamente.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: "block",
          width: "100%",
          textAlign: "center",
          padding: "0.625rem",
          backgroundColor: loading ? "hsl(var(--primary) / 0.7)" : "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "2px",
          fontSize: "0.875rem",
          fontWeight: 600,
          border: "none",
          cursor: loading ? "wait" : "pointer",
          ...style,
        }}
      >
        {loading ? "Aguarde..." : label}
      </button>
      {erro && (
        <p style={{ fontSize: "0.75rem", color: "hsl(var(--badge-danger-fg))", marginTop: "0.5rem", textAlign: "center" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
