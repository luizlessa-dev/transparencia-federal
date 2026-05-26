import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — The BR Insider",
  description:
    "Como o The BR Insider coleta, usa e protege seus dados pessoais. Em conformidade com a Lei Geral de Proteção de Dados (LGPD).",
  alternates: { canonical: "/privacidade" },
};

const VIGENCIA = "24 de maio de 2026";

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: "1.0625rem", margin: "2rem 0 0.625rem", color: "hsl(var(--text-headline))" }}>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, margin: "0 0 0.875rem" }}>
      {children}
    </p>
  );
}

interface DataItem {
  o: string;
  finalidade: string;
  base: string;
  retencao: string;
}

const DADOS: DataItem[] = [
  {
    o: "E-mail e senha (hash) da conta",
    finalidade: "Autenticação, comunicação operacional e ativação do plano",
    base: "Execução de contrato (art. 7º, V, LGPD)",
    retencao: "Enquanto a conta estiver ativa + 5 anos após cancelamento (CDC, art. 27)",
  },
  {
    o: "Plano contratado, status, código de ativação",
    finalidade: "Provisionamento de acesso pago",
    base: "Execução de contrato",
    retencao: "Enquanto a conta estiver ativa + 5 anos",
  },
  {
    o: "Dados de pagamento (Pix, cartão)",
    finalidade: "Cobrança e conciliação financeira",
    base: "Execução de contrato + obrigação legal fiscal",
    retencao: "5 anos (Decreto nº 3.000/1999, art. 195)",
  },
  {
    o: "Logs de acesso (IP, user-agent, timestamps)",
    finalidade: "Segurança, prevenção a fraude e cumprimento do Marco Civil",
    base: "Obrigação legal (Lei nº 12.965/2014, art. 15)",
    retencao: "6 meses",
  },
  {
    o: "Cookies estritamente necessários",
    finalidade: "Manter sessão autenticada",
    base: "Legítimo interesse",
    retencao: "Sessão ou até logout",
  },
];

export default function PrivacidadePage() {
  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Política de Privacidade</h1>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0 0 0 calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Vigência: {VIGENCIA} · LGPD (Lei nº 13.709/2018)
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem", maxWidth: "780px" }}>

        <H2>1. Quem somos e quem é o controlador</H2>
        <P>
          O controlador dos dados pessoais coletados no The BR Insider é{" "}
          <strong>Lessa Labs Tecnologia Ltda.</strong>, inscrita no CNPJ <strong>65.659.055/0001-53</strong>, com
          sede em Belo Horizonte (MG). O encarregado pelo tratamento de dados (DPO) é{" "}
          <strong>Luiz Lessa</strong>, contatável em{" "}
          <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            contato@thebrinsider.com
          </a>.
        </P>

        <H2>2. Dados de parlamentares vs. dados de usuários</H2>
        <P>
          É importante distinguir duas categorias:
        </P>
        <P>
          <strong>(a) Dados sobre parlamentares</strong>: nome, partido, mandato, votações, emendas,
          despesas de gabinete e financiamento eleitoral são <strong>informações públicas</strong>{" "}
          relativas a agentes públicos no exercício de função pública. Não estão protegidos pelo sigilo
          previsto na LGPD (art. 4º, II e art. 7º, II e VI), conforme entendimento consolidado.
          Esses dados são tratados como insumo jornalístico, em conformidade com o art. 4º, II, &quot;a&quot;
          (tratamento para fins exclusivamente jornalísticos).
        </P>
        <P>
          <strong>(b) Dados de usuários do Serviço</strong>: e-mail, senha, plano contratado, dados de
          pagamento e logs de acesso. Esses sim estão integralmente sujeitos à LGPD e são detalhados
          abaixo.
        </P>

        <H2>3. Quais dados coletamos, para quê, com qual base e por quanto tempo</H2>

        <div style={{ overflowX: "auto", margin: "0.5rem 0 1rem" }}>
          <table className="bloomberg-table" style={{ minWidth: "560px" }}>
            <thead>
              <tr>
                <th>Dado</th>
                <th>Finalidade</th>
                <th>Base legal</th>
                <th>Retenção</th>
              </tr>
            </thead>
            <tbody>
              {DADOS.map((d) => (
                <tr key={d.o}>
                  <td style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{d.o}</td>
                  <td style={{ fontSize: "0.8125rem", color: "hsl(var(--text-body))" }}>{d.finalidade}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{d.base}</td>
                  <td style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))" }}>{d.retencao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H2>4. Operadores e compartilhamento</H2>
        <P>Compartilhamos dados estritamente necessários com os seguintes operadores:</P>
        <ul style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, paddingLeft: "1.25rem" }}>
          <li><strong>Supabase</strong> (autenticação e banco de dados) — dados hospedados em região AWS.</li>
          <li><strong>Vercel</strong> (hospedagem e logs de aplicação).</li>
          <li><strong>Provedores de pagamento</strong> (Pix via instituição bancária autorizada pelo Banco Central; cartão via gateway acordado com o usuário antes da transação).</li>
        </ul>
        <P>
          Não vendemos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing.
          Não usamos cookies de rastreamento de terceiros nem ferramentas de analytics que coletem
          identificadores pessoais.
        </P>

        <H2>5. Cookies</H2>
        <P>
          Utilizamos apenas cookies estritamente necessários — sessão autenticada e preferências básicas
          de navegação. Não utilizamos cookies de publicidade, retargeting ou analytics de terceiros.
        </P>

        <H2>6. Transferência internacional</H2>
        <P>
          Os operadores Supabase e Vercel armazenam dados em servidores nos Estados Unidos. A transferência
          internacional é amparada pelo art. 33, V, da LGPD (necessária para execução de contrato com o
          titular), com cláusulas contratuais padrão de proteção de dados.
        </P>

        <H2>7. Seus direitos como titular (art. 18, LGPD)</H2>
        <P>Você pode, a qualquer tempo e gratuitamente, solicitar:</P>
        <ul style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, paddingLeft: "1.25rem" }}>
          <li>Confirmação da existência de tratamento;</li>
          <li>Acesso aos seus dados;</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
          <li>Portabilidade dos dados;</li>
          <li>Eliminação dos dados tratados com seu consentimento (ressalvadas hipóteses do art. 16);</li>
          <li>Informação sobre compartilhamento;</li>
          <li>Revogação do consentimento.</li>
        </ul>
        <P>
          Para exercer qualquer desses direitos, envie e-mail para{" "}
          <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            contato@thebrinsider.com
          </a>{" "}
          com o assunto &quot;LGPD — Direito do titular&quot;. O prazo de resposta é de até 15 dias.
        </P>

        <H2>8. Segurança</H2>
        <P>
          Adotamos medidas técnicas e organizacionais para proteger os dados: senhas armazenadas como hash
          (nunca em texto claro), HTTPS obrigatório, controle de acesso ao banco via service role key,
          backups periódicos e logs auditáveis. Mesmo assim, nenhum sistema é absolutamente impenetrável —
          em caso de incidente que possa causar risco ou dano relevante, comunicaremos os titulares afetados
          e a ANPD conforme o art. 48 da LGPD.
        </P>

        <H2>9. Crianças e adolescentes</H2>
        <P>
          O Serviço não se destina a menores de 18 anos. Não coletamos intencionalmente dados pessoais
          de crianças e adolescentes. Caso identificado o cadastro de menor, removeremos os dados
          imediatamente.
        </P>

        <H2>10. Alterações desta política</H2>
        <P>
          Esta política pode ser atualizada periodicamente. Alterações materiais serão comunicadas por
          e-mail aos usuários cadastrados. A versão vigente está sempre disponível em{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "hsl(var(--primary))" }}>
            thebrinsider.com/privacidade
          </code>.
        </P>

        <H2>11. Reclamações à ANPD</H2>
        <P>
          O titular tem o direito de peticionar à Autoridade Nacional de Proteção de Dados (ANPD), órgão
          regulador da LGPD, em{" "}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer"
            style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            gov.br/anpd
          </a>.
        </P>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "2.5rem", borderTop: "1px solid hsl(var(--border))", paddingTop: "1rem" }}>
          Última atualização: {VIGENCIA} · Encarregado:{" "}
          <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))" }}>
            contato@thebrinsider.com
          </a>{" "}
          ·{" "}
          <Link href="/termos" style={{ color: "hsl(var(--primary))" }}>Termos de Uso</Link>
        </p>
      </div>
    </>
  );
}
