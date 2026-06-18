import Link from "next/link";
import { CheckoutButton } from "~/components/CheckoutButton";

export const metadata = {
  title: "Planos — The BR Insider",
  description: "Acesso completo aos dados do Congresso Nacional. Planos para indivíduos e redações.",
  alternates: { canonical: "/planos" },
};

const FEATURES_FREE = [
  "Top 10 do Score de Risco",
  "Listagem de Frentes Parlamentares",
  "Visão geral do projeto",
];

const FEATURES_INDIVIDUAL = [
  "Ranking completo (513 deputados)",
  "Perfil detalhado de cada parlamentar",
  "Dados de patrimônio e bens declarados",
  "Histórico de votações plenárias",
  "Emendas RP9 e Pix detalhadas",
  "Gastos CEAP com fornecedores",
  "Frentes parlamentares com membros",
  "Exportação de dados em CSV",
  "Atualizações mensais",
];

const FEATURES_INSTITUCIONAL = [
  "Tudo do plano Individual",
  "Múltiplos usuários (até 10 acessos)",
  "Dados brutos via API REST",
  "Alertas semanais por e-mail",
  "Suporte prioritário por e-mail",
  "Briefings customizados sob demanda",
  "Acesso antecipado a novos dados",
];

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
      <circle cx="7" cy="7" r="7" fill="hsl(var(--success) / 0.15)" />
      <path d="M4 7l2 2 4-4" stroke="hsl(var(--success))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PlanosPage() {
  return (
    <>
      {/* Cabeçalho */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2.5rem 1.5rem 2rem", textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
            <span style={{ fontSize: "0.6875rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))" }}>
              Acesso
            </span>
            <div style={{ height: "2px", width: "2rem", backgroundColor: "hsl(var(--primary))" }} />
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: "0 0 0.75rem", fontFamily: "var(--font-display)" }}>
            Dados que mudam o debate
          </h1>
          <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", maxWidth: "36rem", margin: "0 auto", lineHeight: 1.6 }}>
            Do gratuito ao institucional — escolha o nível de acesso certo para sua pesquisa, reportagem ou monitoramento.
          </p>
        </div>
      </section>

      {/* Cards de planos */}
      <div className="container" style={{ padding: "2.5rem 1.5rem 4rem" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          maxWidth: "900px",
          margin: "0 auto",
        }}>

          {/* Free */}
          <div style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
                Gratuito
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>R$ 0</span>
                <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>/mês</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: 0, lineHeight: 1.5 }}>
                Para explorar o projeto e validar a qualidade dos dados.
              </p>
            </div>

            <div style={{ flex: 1, marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {FEATURES_FREE.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <CheckIcon />
                    <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/cadastro"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.625rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "hsl(var(--text-body))",
                textDecoration: "none",
                backgroundColor: "hsl(var(--surface))",
              }}
            >
              Criar conta gratuita
            </Link>
          </div>

          {/* Individual */}
          <div style={{
            backgroundColor: "hsl(var(--card))",
            border: "2px solid hsl(var(--primary))",
            borderRadius: "4px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}>
            <div style={{
              position: "absolute",
              top: "-1px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              fontSize: "0.625rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              padding: "0.25rem 0.875rem",
              borderRadius: "0 0 4px 4px",
            }}>
              Mais popular
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--primary))", marginBottom: "0.5rem" }}>
                Individual
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>R$ 99</span>
                <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))" }}>/mês</span>
              </div>
              <p style={{ fontSize: "0.75rem", color: "hsl(var(--primary))", margin: "0 0 0.375rem", fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                ou R$ 990/ano · 2 meses grátis
              </p>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: 0, lineHeight: 1.5 }}>
                Para jornalistas, pesquisadores e ativistas independentes.
              </p>
            </div>

            <div style={{ flex: 1, marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {FEATURES_INDIVIDUAL.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <CheckIcon />
                    <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <CheckoutButton plan="monthly" label="Assinar por R$ 99/mês" />
              <CheckoutButton
                plan="annual"
                label="Assinar por R$ 990/ano (2 meses grátis)"
                style={{ backgroundColor: "transparent", border: "1px solid hsl(var(--primary))", color: "hsl(var(--primary))" }}
              />
            </div>
            <p style={{ fontSize: "0.6875rem", color: "hsl(var(--text-caption))", textAlign: "center", margin: "0.625rem 0 0", fontFamily: "var(--font-sans)" }}>
              Cartão de crédito • Cancele quando quiser
            </p>
          </div>

          {/* Institucional */}
          <div style={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "4px",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ fontSize: "0.625rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", color: "hsl(var(--text-caption))", marginBottom: "0.5rem" }}>
                Institucional
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.375rem", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "2rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>Contrato anual</span>
              </div>
              <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: 0, lineHeight: 1.5 }}>
                Para redações, veículos de imprensa e organizações de monitoramento.
              </p>
            </div>

            <div style={{ flex: 1, marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {FEATURES_INSTITUCIONAL.map((f) => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <CheckIcon />
                    <span style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))", lineHeight: 1.4 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <a
              href="mailto:contato@thebrinsider.com?subject=Acesso%20Institucional%20%E2%80%94%20Transparência%20Federal"
              style={{
                display: "block",
                textAlign: "center",
                padding: "0.625rem",
                border: "1px solid hsl(var(--border))",
                borderRadius: "2px",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "hsl(var(--text-body))",
                textDecoration: "none",
                backgroundColor: "hsl(var(--surface))",
              }}
            >
              Falar com a equipe
            </a>
          </div>

        </div>

        {/* Nota */}
        <p style={{ textAlign: "center", marginTop: "2.5rem", fontSize: "0.8125rem", color: "hsl(var(--text-caption))", fontFamily: "var(--font-sans)" }}>
          Já tem um código de acesso?{" "}
          <Link href="/ativar" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
            Ativar código
          </Link>
          {" · "}
          Dúvidas?{" "}
          <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))", textDecoration: "none" }}>
            Fale conosco
          </a>
        </p>
      </div>
    </>
  );
}
