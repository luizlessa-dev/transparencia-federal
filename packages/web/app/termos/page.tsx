import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — The BR Insider",
  description:
    "Termos de Uso do The BR Insider: condições de acesso ao serviço, planos pagos, propriedade intelectual, limitações e foro.",
  alternates: { canonical: "/termos" },
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

export default function TermosPage() {
  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Termos de Uso</h1>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0 0 0 calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Vigência: {VIGENCIA} · Aplicável a todo o serviço acessível em thebrinsider.com
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem", maxWidth: "780px" }}>

        <P>
          Estes Termos regulam o uso do <strong>The BR Insider</strong> (&quot;Serviço&quot;), operado por{" "}
          <strong>Lessa Labs Tecnologia Ltda.</strong>, inscrita no CNPJ <strong>65.659.055/0001-53</strong>, com sede em
          Belo Horizonte (MG). Ao acessar ou usar o Serviço, você concorda integralmente com estas condições.
          Se não concordar, não utilize o Serviço.
        </P>

        <H2>1. O que é o Serviço</H2>
        <P>
          O The BR Insider é um projeto de jornalismo de dados que coleta informações públicas sobre
          a atividade parlamentar do Congresso Nacional, normaliza, cruza, analisa e disponibiliza esses
          dados por meio de página web, ferramentas de busca, rankings, perfis individuais, alertas e API.
        </P>
        <P>
          Os dados de origem são <strong>públicos</strong> e permanecem públicos. O que cobramos, nos planos
          pagos, é pelo serviço de curadoria, limpeza, cruzamento, busca, infraestrutura, suporte e análise —
          não pelos dados em si.
        </P>

        <H2>2. Aviso de independência institucional</H2>
        <P>
          O The BR Insider é um <strong>projeto independente</strong>, sem qualquer vínculo com o
          Governo Federal, com a Câmara dos Deputados, com o Senado Federal, com partidos políticos,
          campanhas, mandatos parlamentares ou órgãos públicos de qualquer esfera. O nome contém o termo
          &quot;federal&quot; em referência ao escopo dos dados (Congresso Nacional) — não a qualquer vínculo
          institucional com o Estado.
        </P>

        <H2>3. Conta de usuário</H2>
        <P>
          Para acessar funcionalidades pagas, é necessário criar uma conta com e-mail e senha. Você é
          responsável por manter a confidencialidade das credenciais e por todas as atividades realizadas
          em sua conta. Notifique-nos imediatamente em caso de acesso não autorizado.
        </P>
        <P>
          Reservamos o direito de suspender ou encerrar contas que violem estes Termos, façam uso indevido
          do Serviço ou tentem contornar limites técnicos e comerciais (incluindo scraping não autorizado
          das páginas pagas).
        </P>

        <H2>4. Planos, pagamento e cancelamento</H2>
        <P>
          O plano gratuito oferece acesso limitado a uma amostra dos dados. Os planos pagos
          (Individual e Institucional) oferecem acesso completo conforme descrito em{" "}
          <Link href="/planos" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>/planos</Link>.
        </P>
        <P>
          O pagamento é feito por Pix ou cartão de crédito. O acesso é ativado em até 24 horas úteis após a
          confirmação. Em caso de cobrança recorrente, o cancelamento pode ser solicitado a qualquer momento
          por e-mail (<a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))" }}>contato@thebrinsider.com</a>) e
          interrompe a próxima renovação — sem multa.
        </P>
        <P>
          <strong>Direito de arrependimento (CDC, art. 49):</strong> consumidores pessoa física que
          contratarem o Serviço integralmente fora de estabelecimento físico têm até 7 dias corridos para
          desistir e receber reembolso integral, mediante solicitação por e-mail.
        </P>

        <H2>5. Plano institucional e API</H2>
        <P>
          O plano Institucional inclui acesso à API REST e suporte por e-mail. Limites de uso (rate limit,
          volume de chamadas, número de usuários) são acordados em contrato individual, que prevalece sobre
          estes Termos no que for específico.
        </P>

        <H2>6. Uso permitido dos dados</H2>
        <P>
          Os dados públicos consolidados pelo Serviço podem ser utilizados livremente para finalidades
          jornalísticas, acadêmicas, de pesquisa e de fiscalização cidadã, com atribuição da fonte:
          <em> &quot;The BR Insider — thebrinsider.com&quot;</em>.
        </P>
        <P>
          É <strong>vedado</strong>: (i) republicar o conteúdo agregado ou os índices proprietários
          (Score de Risco, rankings) sem atribuição visível; (ii) revender o acesso ao Serviço a terceiros
          sem autorização escrita; (iii) usar o Serviço para qualquer atividade ilegal, difamatória ou que
          atribua, sem base factual, conduta ilícita a parlamentar identificado.
        </P>

        <H2>7. Limitação de responsabilidade</H2>
        <P>
          O Serviço é oferecido &quot;como está&quot;. Embora haja esforço contínuo de validação, não
          garantimos a precisão absoluta, a completude ou a atualidade dos dados, que dependem da
          publicação pelos órgãos públicos originais. Erros e atrasos nas fontes oficiais são refletidos
          aqui — para decisões críticas, consulte a fonte primária.
        </P>
        <P>
          Os índices proprietários (Score de Risco, rankings) são <strong>alertas analíticos</strong> e
          <strong> não constituem</strong> conclusão de ilegalidade, improbidade administrativa ou
          irregularidade. Sua interpretação como acusação a parlamentar identificado é responsabilidade
          exclusiva de quem o faz.
        </P>
        <P>
          Na máxima extensão permitida em lei, o The BR Insider e seu responsável legal não
          respondem por danos indiretos, lucros cessantes ou perdas decorrentes do uso ou da impossibilidade
          de uso do Serviço.
        </P>

        <H2>8. Propriedade intelectual</H2>
        <P>
          A interface, o código fonte (publicado em código aberto), o design, os textos editoriais, os
          índices proprietários e as marcas são protegidos por direitos autorais e de propriedade
          intelectual. Os <strong>dados públicos</strong> em si não são propriedade do Serviço — pertencem
          ao domínio público.
        </P>

        <H2>9. Política de correção</H2>
        <P>
          Erros factuais identificados serão corrigidos com a maior agilidade possível, conforme descrito
          em{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            /correcoes
          </Link>
          . Parlamentares e cidadãos podem contestar dados publicados — o canal e os prazos estão na
          mesma página.
        </P>

        <H2>10. Privacidade</H2>
        <P>
          O tratamento de dados pessoais (de usuários do Serviço, não de parlamentares no exercício de
          função pública) é regido pela{" "}
          <Link href="/privacidade" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            Política de Privacidade
          </Link>
          , em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018).
        </P>

        <H2>11. Alterações destes Termos</H2>
        <P>
          Estes Termos podem ser atualizados a qualquer momento. Em caso de alteração material que afete
          direitos de usuários pagantes, comunicaremos por e-mail com pelo menos 30 dias de antecedência.
          A continuidade do uso após a vigência da nova versão implica concordância.
        </P>

        <H2>12. Foro</H2>
        <P>
          Fica eleito o foro da Comarca de Belo Horizonte (MG) para dirimir quaisquer controvérsias
          decorrentes destes Termos, com exclusão de qualquer outro, por mais privilegiado que seja —
          ressalvada a competência dos juizados especiais para causas que atendam aos requisitos legais.
        </P>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "2.5rem", borderTop: "1px solid hsl(var(--border))", paddingTop: "1rem" }}>
          Última atualização: {VIGENCIA} · Dúvidas:{" "}
          <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))" }}>
            contato@thebrinsider.com
          </a>
        </p>
      </div>
    </>
  );
}
