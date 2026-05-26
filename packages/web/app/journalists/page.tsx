export const metadata = {
  title: "Para Jornalistas — Dados Estruturados para Investigações | The BR Insider",
  description:
    "Emendas parlamentares, despesas CEAP e votações do Congresso em formato estruturado. Séries históricas desde 2015, cruzamento de dados e Score de Risco para investigações jornalísticas.",
  alternates: { canonical: "/journalists" },
};

export default function JournalistsPage() {
  return (
    <section className="section">
      <h1 className="page-title">Para Jornalistas</h1>
      <p className="lead">
        Dados cruzados do Congresso Nacional para investigações com profundidade histórica
      </p>

      <h2>O Que Está Disponível</h2>
      <p>
        The BR Insider reúne e cruza dados de quatro fontes públicas oficiais:
      </p>
      <ul>
        <li>
          <strong>Emendas Parlamentares (2015–2026):</strong> histórico completo via Portal da
          Transparência, com valor, beneficiário, modalidade e execução orçamentária
        </li>
        <li>
          <strong>Despesas CEAP da Câmara (2019–2026):</strong> gastos de gabinete por deputado,
          categoria de despesa e fornecedor — incluindo legislaturas anteriores
        </li>
        <li>
          <strong>Despesas CEAP do Senado (2019–2026):</strong> cota parlamentar dos senadores
        </li>
        <li>
          <strong>Votações Plenárias (fev/2023–atual):</strong> histórico de votos nominais da
          57ª Legislatura com orientação de bancada
        </li>
        <li>
          <strong>Financiamento Eleitoral TSE (2018 e 2022):</strong> receitas de campanha de
          deputados federais e senadores com origem dos doadores
        </li>
        <li>
          <strong>Bens Declarados ao TSE (2018 e 2022):</strong> patrimônio declarado por
          candidatos eleitos
        </li>
        <li>
          <strong>Score de Risco Composto (G5):</strong> índice que cruza CEAP, presença,
          produção legislativa, financiamento e emendas RP9 para cada deputado
        </li>
      </ul>

      <h2>Ideias de Pautas</h2>
      <p>
        Os dados cruzados do The BR Insider permitem investigar:
      </p>
      <ul>
        <li>Deputados com maior volume de emendas RP9 (Pix) — quem são os maiores beneficiários?</li>
        <li>Padrões regionais — estados menos desenvolvidos recebem menos recursos de emendas?</li>
        <li>Fornecedores recorrentes — quais empresas mais recebem verbas de gabinetes?</li>
        <li>Financiadores e votos — doadores de campanha têm correlação com orientação de voto?</li>
        <li>Evolução de gastos — como variaram as despesas CEAP ao longo das legislaturas?</li>
        <li>Frentes parlamentares e emendas — membros de frentes específicas concentram recursos?</li>
      </ul>

      <h2>Fontes Primárias</h2>
      <p>
        Todos os dados exibidos são coletados diretamente das fontes oficiais e podem ser
        verificados independentemente:
      </p>
      <ul>
        <li>
          <a href="https://portaldatransparencia.gov.br" target="_blank" rel="noopener noreferrer">
            Portal da Transparência
          </a>{" "}
          — emendas parlamentares
        </li>
        <li>
          <a href="https://dadosabertos.camara.leg.br" target="_blank" rel="noopener noreferrer">
            Dados Abertos da Câmara
          </a>{" "}
          — CEAP, votações, proposições e frentes
        </li>
        <li>
          <a href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noopener noreferrer">
            Dados Abertos do Senado
          </a>{" "}
          — CEAP do Senado
        </li>
        <li>
          <a href="https://dadosabertos.tse.jus.br" target="_blank" rel="noopener noreferrer">
            Dados Abertos do TSE
          </a>{" "}
          — financiamento eleitoral e bens declarados
        </li>
      </ul>

      <h2>Acesso</h2>
      <p>
        O plano gratuito dá acesso ao ranking dos 10 deputados com maior score de risco e à
        listagem completa de frentes parlamentares. Para investigações completas — perfil
        detalhado de cada parlamentar, histórico de votações, CEAP por fornecedor e emendas
        individuais — consulte os{" "}
        <a href="/planos">planos disponíveis</a>.
      </p>

      <h2>Contato</h2>
      <p>
        Tem dúvidas sobre metodologia ou encontrou inconsistência nos dados?
        Entre em contato pela página{" "}
        <a href="/about">Sobre o Projeto</a>.
      </p>
    </section>
  );
}
