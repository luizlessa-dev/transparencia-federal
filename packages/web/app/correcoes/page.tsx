import Link from "next/link";

export const metadata = {
  title: "Política de Correção de Dados — The BR Insider",
  description:
    "Canal e processo para contestar dados publicados. Aberto a parlamentares, assessorias, jornalistas, pesquisadores e cidadãos.",
  alternates: { canonical: "/correcoes" },
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

export default function CorrecoesPage() {
  return (
    <>
      {/* Header */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "2rem 1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
            <div style={{ height: "2rem", width: "3px", flexShrink: 0, backgroundColor: "hsl(var(--primary))" }} />
            <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Política de Correção de Dados</h1>
          </div>
          <p style={{ fontSize: "0.8125rem", color: "hsl(var(--text-caption))", margin: "0 0 0 calc(3px + 0.75rem)", fontFamily: "var(--font-sans)" }}>
            Vigência: {VIGENCIA} · Aberta a qualquer cidadão, parlamentar, assessoria, redação ou instituição.
          </p>
        </div>
      </section>

      <div className="container" style={{ padding: "2rem 1.5rem 3rem", maxWidth: "780px" }}>

        <P>
          Trabalhar com dados públicos exige um compromisso público com a correção. Esta política descreve
          como o The BR Insider recebe, avalia e responde a contestações de dados publicados,
          com prazos previstos.
        </P>

        <H2>1. O que pode ser contestado</H2>
        <ul style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, paddingLeft: "1.25rem" }}>
          <li>
            <strong>Erros factuais</strong> em qualquer dado publicado (nome, partido, UF, valor de emenda,
            despesa, votação, presença).
          </li>
          <li>
            <strong>Divergências de identificação</strong> entre fontes (Câmara × Portal da Transparência ×
            TSE) que tenham resultado em atribuição incorreta a um parlamentar.
          </li>
          <li>
            <strong>Atribuições derivadas</strong> calculadas pelo Serviço (rankings, Score de Risco,
            dimensões) que apresentem erro de cálculo ou de premissa.
          </li>
          <li>
            <strong>Contexto faltante</strong> que torne um dado correto, mas enganoso (por exemplo:
            despesa devolvida pelo parlamentar e não refletida no agregado).
          </li>
          <li>
            <strong>Dados pessoais não-públicos</strong> de qualquer indivíduo (telefone privado, endereço
            residencial, dados sensíveis), publicados por erro de pipeline.
          </li>
        </ul>

        <H2>2. Quem pode contestar</H2>
        <P>
          <strong>Qualquer pessoa.</strong> Não exigimos vínculo institucional, identificação de
          jornalista, advogado constituído ou ofício formal. O canal é o mesmo para um parlamentar, uma
          assessoria, um pesquisador acadêmico, um jornalista de outro veículo ou um cidadão comum.
        </P>

        <H2>3. Como contestar</H2>
        <P>
          Envie um e-mail para{" "}
          <a href="mailto:contato@thebrinsider.com?subject=Corre%C3%A7%C3%A3o%20de%20Dados"
            style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            contato@thebrinsider.com
          </a>{" "}
          com assunto <strong>&quot;Correção de Dados&quot;</strong> e informe:
        </P>
        <ol style={{ fontSize: "0.9375rem", color: "hsl(var(--text-body))", lineHeight: 1.7, paddingLeft: "1.25rem" }}>
          <li>URL da página onde o dado aparece;</li>
          <li>Trecho exato contestado (copiar/colar ajuda);</li>
          <li>Qual é o erro, na sua avaliação;</li>
          <li>Qual seria o dado correto e por quê;</li>
          <li>Se possível, link para a fonte primária que comprova a correção (Portal da Transparência, Câmara, Senado, TSE);</li>
          <li>Seu nome e, se aplicável, sua função/instituição (opcional).</li>
        </ol>

        <H2>4. Prazos de resposta (SLA)</H2>
        <div style={{ overflowX: "auto", margin: "0.5rem 0 1rem" }}>
          <table className="bloomberg-table" style={{ minWidth: "560px" }}>
            <thead>
              <tr>
                <th>Severidade</th>
                <th>Exemplo</th>
                <th>1ª resposta</th>
                <th>Correção</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Alta</td>
                <td style={{ fontSize: "0.8125rem" }}>
                  Atribuição incorreta a parlamentar identificado; dado pessoal não-público vazado;
                  erro material em ranking público.
                </td>
                <td style={{ fontSize: "0.8125rem" }}>até 24h</td>
                <td style={{ fontSize: "0.8125rem" }}>até 72h</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Média</td>
                <td style={{ fontSize: "0.8125rem" }}>
                  Divergência de valor, partido ou UF; defasagem identificável; falha em normalização.
                </td>
                <td style={{ fontSize: "0.8125rem" }}>até 5 dias úteis</td>
                <td style={{ fontSize: "0.8125rem" }}>até 15 dias úteis</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Baixa</td>
                <td style={{ fontSize: "0.8125rem" }}>
                  Contexto faltante; sugestão de melhoria metodológica; correção tipográfica.
                </td>
                <td style={{ fontSize: "0.8125rem" }}>até 10 dias úteis</td>
                <td style={{ fontSize: "0.8125rem" }}>próximo ciclo de revisão</td>
              </tr>
            </tbody>
          </table>
        </div>

        <H2>5. Como a correção é feita</H2>
        <P>
          <strong>Erros factuais confirmados</strong> são corrigidos diretamente no banco e propagados ao
          site em até 24h após a correção. Quando a origem do erro está na fonte primária e ela já corrigiu,
          basta aguardar o próximo ciclo de ingestão (1 a 7 dias, dependendo da base) — informaremos o
          prazo na resposta.
        </P>
        <P>
          <strong>Quando a correção altera material já citado publicamente</strong> (ranking, dossiê,
          relatório), publicamos uma nota de correção visível na página afetada, com data, natureza do
          erro e descrição do conserto. Não removemos o conteúdo original — preservamos a transparência
          do histórico.
        </P>
        <P>
          <strong>Quando discordamos da contestação</strong>, respondemos por escrito justificando, com
          referência à fonte e à metodologia. O contestante pode apresentar contra-argumentos.
        </P>

        <H2>6. Direito de resposta de parlamentar identificado</H2>
        <P>
          Se um parlamentar entender que dados ou análises publicadas afetam injustamente sua reputação,
          tem direito a enviar manifestação formal, que será publicada integralmente em campo de resposta
          na própria página do perfil — independentemente de o Serviço concordar ou não com o argumento.
          Esse direito segue o espírito da Lei nº 13.188/2015 (Direito de Resposta), adaptado ao contexto
          de dados.
        </P>

        <H2>7. Sobre o Score de Risco</H2>
        <P>
          O Score de Risco é um <strong>indicador analítico composto</strong>, calculado a partir de cinco
          dimensões públicas (CEAP, ausência, produção legislativa, financiamento e RP9). Ele{" "}
          <strong>não constitui acusação</strong> de irregularidade, improbidade ou ilegalidade — é um
          alerta para investigação posterior, em linha com o que fazem agências de rating, observatórios
          internacionais e think tanks.
        </P>
        <P>
          Contestações sobre o <em>cálculo</em> do Score (erro de fórmula, peso indevido, dimensão mal
          atribuída) são tratadas com severidade Alta. Contestações sobre a <em>existência</em> do índice
          (&quot;não quero ser avaliado&quot;) são respondidas com a metodologia pública e referência ao
          interesse público da fiscalização parlamentar — mas o direito de resposta acima continua
          aberto. A metodologia completa está em{" "}
          <Link href="/risco/metodologia" style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}>
            /risco/metodologia
          </Link>.
        </P>

        <H2>8. Histórico público de correções</H2>
        <P>
          Estamos construindo um changelog público de correções materiais, que será publicado em{" "}
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "hsl(var(--primary))" }}>
            thebrinsider.com/correcoes/historico
          </code>{" "}
          assim que a primeira correção formal for processada. Até lá, qualquer correção é registrada
          internamente com data e justificativa, disponíveis sob solicitação.
        </P>

        <p style={{ fontSize: "0.75rem", color: "hsl(var(--text-caption))", marginTop: "2.5rem", borderTop: "1px solid hsl(var(--border))", paddingTop: "1rem" }}>
          Última atualização: {VIGENCIA} · Editor responsável: Luiz Lessa ·{" "}
          <a href="mailto:contato@thebrinsider.com" style={{ color: "hsl(var(--primary))" }}>
            contato@thebrinsider.com
          </a>
        </p>
      </div>
    </>
  );
}
