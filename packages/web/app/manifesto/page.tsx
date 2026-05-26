import Link from "next/link";
import { IndependenceNotice } from "~/components/IndependenceNotice";

export const metadata = {
  title: "Manifesto editorial — The BR Insider",
  description:
    "Por que The BR Insider existe: diagnóstico do estado da transparência parlamentar, compromissos verificáveis e o que prometemos não fazer.",
  alternates: { canonical: "/manifesto" },
};

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: "1.5rem",
        margin: "2.5rem 0 0.875rem",
        color: "hsl(var(--text-headline))",
        fontFamily: "var(--font-display)",
        fontWeight: 700,
        letterSpacing: "-0.015em",
      }}
    >
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: "1.0625rem",
        color: "hsl(var(--text-body))",
        lineHeight: 1.75,
        margin: "0 0 1.125rem",
      }}
    >
      {children}
    </p>
  );
}

export default function ManifestoPage() {
  return (
    <>
      {/* Header sóbrio, sem fanfarra */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))", backgroundColor: "hsl(var(--background))" }}>
        <div className="container" style={{ padding: "3rem 1.5rem 2rem", maxWidth: "740px" }}>
          <p
            style={{
              fontSize: "0.6875rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              color: "hsl(var(--brand-rust))",
              margin: "0 0 0.875rem",
            }}
          >
            Manifesto editorial
          </p>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 2.75rem)",
              margin: 0,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
            }}
          >
            Por que The BR Insider.
          </h1>
          <p
            style={{
              fontSize: "0.875rem",
              color: "hsl(var(--text-caption))",
              marginTop: "0.875rem",
              fontFamily: "var(--font-sans)",
              fontStyle: "italic",
            }}
          >
            Luiz Lessa · Belo Horizonte, MG · 25 de maio de 2026
          </p>
        </div>
      </section>

      <article
        className="container"
        style={{
          padding: "2.5rem 1.5rem 4rem",
          maxWidth: "740px",
          fontFamily: "var(--font-display)",
        }}
      >
        {/* Lead — hook estatístico */}
        <P>
          <strong style={{ color: "hsl(var(--text-headline))" }}>
            Entre 2023 e 2025, o Congresso Nacional empenhou cerca de R$ 34,7 bilhões em emendas parlamentares.
          </strong>{" "}
          Distribuídos em mais de 75 mil registros, levados a milhares de municípios brasileiros,
          assinados por 594 deputados e senadores. Cada centavo é informação pública —
          determinada pela Lei de Acesso à Informação desde 2011 e pela Política de Dados Abertos
          desde 2016.
        </P>
        <P>
          Quase nada é encontrável.
        </P>

        <H2>O paradoxo brasileiro</H2>
        <P>
          O dado existe. Está nos portais oficiais do Governo Federal, da Câmara dos Deputados,
          do Senado, do TSE, do Tesouro Nacional, do IBGE. Está fragmentado em ao menos quatro
          plataformas com formatos diferentes, taxonomias incompatíveis, atualizações dessincronizadas,
          e sem nenhuma camada de cruzamento entre fontes.
        </P>
        <P>
          O resultado prático é direto: só quem tem tempo, equipe ou orçamento consegue fiscalizar.
          O cidadão comum abre o Portal da Transparência, não acha o que procura e desiste. O jornalista
          solo se afoga em CSV de 200 mil linhas. O pesquisador acadêmico recomeça do zero a cada
          projeto. A assessoria de imprensa de uma ONG passa três dias produzindo um cruzamento que
          deveria ser uma consulta de cinco minutos.
        </P>
        <P>
          A transparência cumpriu a lei. Mas a transparência não virou informação.
        </P>

        <H2>O que falta</H2>
        <P>
          Não falta dado. Falta interface jornalística sobre o dado.
        </P>
        <P>
          Não falta lei — a LAI existe desde 2011, a Política de Dados Abertos desde 2016. Falta
          trabalho editorial contínuo que transforme essas obrigações formais em rotina de uso.
        </P>
        <P>
          Não falta órgão fiscalizador — temos CGU, TCU, Ministério Público, ANPD. Falta um
          observatório civil independente que sirva de ponto único de consulta, sem agenda
          partidária, sem captura comercial, sem advocacy de causa.
        </P>

        <H2>O que The BR Insider é</H2>
        <P>
          Um projeto de jornalismo de dados sobre o poder público brasileiro, começando pelo
          Congresso Nacional. A cobertura é estruturada em camadas verificáveis: emendas
          parlamentares de 2015 a 2026, despesas de gabinete da Câmara e do Senado de 2019 em
          diante, votações nominais desde fevereiro de 2023, financiamento eleitoral de 2018
          e 2022, patrimônio declarado, frentes parlamentares e o Score de Risco G5 — um
          indicador composto que sinaliza padrões merecedores de inspeção jornalística.
        </P>
        <P>
          A operação é solo por desenho — apoiada em automação e ferramentas de inteligência
          artificial, sob responsabilidade editorial direta de Luiz Lessa, jornalista, com base
          em Belo Horizonte. Não há colaboradores formais nem informais. Não há equipe oculta.
          É um operador, com nome, e-mail, CPF, CNPJ e endereço público.
        </P>
        <P>
          O modelo econômico é simples: os dados de origem são públicos e permanecem públicos.
          O que cobramos, em planos pagos, é pelo serviço de curadoria — limpeza, cruzamento,
          busca, API, alertas, infraestrutura e análise. Assinantes são jornalistas, pesquisadores,
          organizações de fiscalização e redações. Não aceitamos financiamento que comprometa essa
          equação.
        </P>

        <H2>O que prometemos — e como você verifica</H2>
        <P>
          <strong style={{ color: "hsl(var(--text-headline))" }}>Independência financeira.</strong>{" "}
          Zero recursos públicos, zero repasses partidários, zero patrocínios de gabinete parlamentar.
          A receita vem exclusivamente de assinantes e clientes institucionais — sempre divulgados
          quando ultrapassarem 10% da receita do exercício.
        </P>
        <P>
          <strong style={{ color: "hsl(var(--text-headline))" }}>Metodologia auditável.</strong>{" "}
          Toda métrica composta tem documentação técnica pública com fórmula, pesos, exemplo de
          cálculo e limitações declaradas. A metodologia do Score de Risco está aberta em{" "}
          <Link href="/risco/metodologia" style={{ color: "hsl(var(--brand-rust))", textDecoration: "underline" }}>
            /risco/metodologia
          </Link>
          . Discordou de um peso? Tem um canal formal pra contestar.
        </P>
        <P>
          <strong style={{ color: "hsl(var(--text-headline))" }}>Correção como processo formal.</strong>{" "}
          Qualquer pessoa — cidadão, parlamentar, assessoria, redação concorrente — pode contestar
          dado publicado pelo canal de{" "}
          <Link href="/correcoes" style={{ color: "hsl(var(--brand-rust))", textDecoration: "underline" }}>
            correções
          </Link>
          , com prazo de resposta definido por severidade. Direito de resposta de parlamentar
          identificado é garantido por escrito, publicado integralmente na própria página afetada,
          independentemente do nosso acordo com o argumento.
        </P>
        <P>
          <strong style={{ color: "hsl(var(--text-headline))" }}>Código aberto.</strong>{" "}
          Os scripts de ingestão, agregação e cálculo do Score de Risco estão{" "}
          <a
            href="https://github.com/luizlessa-dev/transparencia-federal"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "hsl(var(--brand-rust))", textDecoration: "underline" }}
          >
            no GitHub
          </a>
          . Qualquer pesquisador pode replicar localmente, validar contra as fontes primárias e
          publicar críticas. Não há mistério no que fazemos.
        </P>
        <P>
          <strong style={{ color: "hsl(var(--text-headline))" }}>Cobertura sem partido.</strong>{" "}
          O projeto não endossa, ataca ou se opõe a candidatos, mandatos ou projetos de lei.
          Indicadores são derivações quantitativas — não juízos políticos. Um parlamentar com Score
          de Risco alto é, no nosso vocabulário, alguém cujo conjunto de dimensões públicas
          combinadas merece inspeção. Não é alguém culpado de algo.
        </P>

        <H2>O que não somos</H2>
        <P>
          Não somos veículo de imprensa partidário. Não somos think tank ideológico. Não somos
          ferramenta de advocacy de causa. Não somos consultoria política, lobby ou assessoria
          parlamentar.
        </P>
        <P>
          Não somos, sob nenhuma circunstância, vinculados ao Governo Federal, à Câmara dos
          Deputados, ao Senado Federal ou a qualquer órgão público. O termo &quot;federal&quot;
          presente no nome anterior do projeto (Transparência Federal) referia-se exclusivamente ao
          escopo dos dados — Congresso Nacional — e não a qualquer relação institucional com o
          Estado. O rebranding para The BR Insider, em maio de 2026, eliminou definitivamente essa
          ambiguidade.
        </P>

        <H2>Convite</H2>
        <P>
          Para jornalistas, pesquisadores e ativistas independentes: assinaturas começam em R$ 29
          por mês, com cancelamento livre a qualquer momento. Detalhes em{" "}
          <Link href="/planos" style={{ color: "hsl(var(--brand-rust))", textDecoration: "underline" }}>
            /planos
          </Link>
          .
        </P>
        <P>
          Para redações, veículos de imprensa e organizações de monitoramento: contratos
          institucionais incluem API REST, suporte por e-mail e briefings sob demanda. Conversa por{" "}
          <a
            href="mailto:contato@thebrinsider.com"
            style={{ color: "hsl(var(--brand-rust))", textDecoration: "underline" }}
          >
            contato@thebrinsider.com
          </a>
          .
        </P>
        <P>
          Para cidadãos: o ranking nacional dos 594 parlamentares, os perfis individuais e o
          top 10 do Score de Risco são gratuitos, sem login, sem paywall.
        </P>
        <P>
          Para pesquisadores acadêmicos: dados estruturados, metodologia auditável, código
          aberto. Qualquer trabalho que cite The BR Insider pode fazê-lo pela bibliografia padrão
          descrita em{" "}
          <Link href="/about" style={{ color: "hsl(var(--brand-rust))", textDecoration: "underline" }}>
            /about
          </Link>
          .
        </P>

        <hr
          style={{
            border: "none",
            borderTop: "1px solid hsl(var(--border))",
            margin: "3rem 0 1.5rem",
          }}
        />

        <p
          style={{
            fontSize: "0.875rem",
            color: "hsl(var(--text-caption))",
            fontStyle: "italic",
            fontFamily: "var(--font-display)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Este texto é o primeiro publicado sob a marca The BR Insider. Permanecerá disponível
          como referência permanente. Atualizações materiais serão registradas com data e
          justificativa, no rodapé desta página.
        </p>

        <div style={{ marginTop: "2rem" }}>
          <IndependenceNotice variant="card" />
        </div>
      </article>
    </>
  );
}
