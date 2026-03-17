export default function CitizensPage() {
  return (
    <section className="section">
      <h1 className="page-title">Para Cidadãos</h1>
      <p className="lead">
        Fiscalize seus representantes e entenda como recursos públicos são gastos
      </p>

      <h2>Por Que Importa</h2>
      <p>
        Como cidadão, você tem o direito de saber como seus representantes usam dinheiro público.
        Emendas parlamentares e despesas de gabinete são financiadas com recursos dos impostos que
        você paga. Transparência Federal te ajuda a:
      </p>
      <ul>
        <li>Encontrar informações sobre seu deputado e senador</li>
        <li>Entender quanto eles gastaram e em quê</li>
        <li>Comparar gastos e prioridades entre representantes</li>
        <li>Questionar decisões de forma informada</li>
      </ul>

      <h2>Como Começar</h2>
      <p>
        1. Acesse a seção <a href="/amendments">Emendas Parlamentares</a> e procure seu deputado
      </p>
      <p>
        2. Veja quais emendas ele aprovou nos últimos anos
      </p>
      <p>
        3. Confira em <a href="/expenses">Despesas de Gabinete</a> como o dinheiro foi gasto
      </p>
      <p>
        4. Compare com outros deputados da sua região ou partido
      </p>

      <h2>Perguntas Frequentes</h2>
      <p>
        <strong>O que é uma emenda parlamentar?</strong>
      </p>
      <p>
        Uma emenda é uma alteração proposta por um deputado ao orçamento anual do governo.
        Se aprovada, reserva dinheiro para um projeto específico (construção de escola,
        aquisição de equipamentos, etc).
      </p>

      <p>
        <strong>O que é CEAPS?</strong>
      </p>
      <p>
        CEAPS (Cota para Exercício da Atividade Parlamentar) é uma verba mensal que cada deputado
        pode usar com pessoal de gabinete, aluguel, combustível, telefone e outras despesas de atividade parlamentar.
      </p>

      <p>
        <strong>Como denunciar gastos suspeitos?</strong>
      </p>
      <p>
        Se encontrar informações que achar irregular, você pode:
      </p>
      <ul>
        <li>Denunciar à Polícia Federal (site: dpf.gov.br)</li>
        <li>Comunicar ao Ministério Público (site: mp.br)</li>
        <li>Entrar em contato com jornalistas de investigação</li>
      </ul>
    </section>
  );
}
