export default function ResearchersPage() {
  return (
    <section className="section">
      <h1 className="page-title">Para Pesquisadores</h1>
      <p className="lead">
        Datasets, APIs e documentação para análises científicas de dados públicos
      </p>

      <h2>Acesso aos Dados</h2>
      <p>
        Todos os dados do Transparência Federal estão disponíveis sob licença aberta (CC-BY-4.0)
        para fins de pesquisa, educação e não-comerciais.
      </p>

      <h2>Opções de Acesso</h2>
      <ul>
        <li>
          <strong>API REST:</strong> Acesso programático em tempo real com respostas em JSON.
          Ideal para análises automáticas e pipelines de dados.
        </li>
        <li>
          <strong>Exports em CSV:</strong> Todos os datasets disponíveis em formato tabular.
          Compatível com R, Python, STATA e Excel.
        </li>
        <li>
          <strong>Banco de Dados SQL:</strong> Acesso via PostgreSQL. Consulte nossa documentação
          para credenciais de pesquisadores.
        </li>
      </ul>

      <h2>Documentação de API</h2>
      <p>
        <strong>Base URL:</strong> <code>https://api.transparenciafederal.org/v1</code>
      </p>

      <h3>Endpoints Principais</h3>
      <pre style={{
        background: "#f5f5f5",
        padding: "1rem",
        borderRadius: "6px",
        overflow: "auto",
        fontSize: "0.875rem"
      }}>
{`# Listar emendas com filtros
GET /amendments?year=2024&state=SP&limit=100&offset=0

# Detalhes de um deputado
GET /deputies/[id]
GET /deputies/[id]/amendments
GET /deputies/[id]/expenses
GET /deputies/[id]/votes

# Estatísticas agregadas
GET /stats/summary
GET /stats/amendments?group_by=state
GET /stats/expenses?group_by=deputy

# Exportar dataset completo
GET /exports/amendments.csv
GET /exports/expenses.csv`}
      </pre>

      <h2>Datasets Disponíveis</h2>
      <ul>
        <li>
          <strong>Deputados:</strong> ~513 registros com dados básicos, contato e legislatura
        </li>
        <li>
          <strong>Emendas:</strong> ~11.7K registros (2023-2024) com detalhes de aprovação e execução
        </li>
        <li>
          <strong>Despesas CEAPS:</strong> ~558K registros (2023-2025) com categoria, fornecedor e valor
        </li>
        <li>
          <strong>Votações:</strong> Histórico de votações de cada deputado em projetos-chave
        </li>
      </ul>

      <h2>Citação Recomendada</h2>
      <pre style={{
        background: "#f5f5f5",
        padding: "1rem",
        borderRadius: "6px",
        overflow: "auto",
        fontSize: "0.875rem"
      }}>
{`Transparência Federal. (2024). Brazilian Congressional
Amendments and Spending Database.
https://transparenciafederal.org

Dados coletados de:
- Portal da Transparência (gov.br/transparencia)
- Câmara dos Deputados API (dadosabertos.camara.leg.br)`}
      </pre>

      <h2>Condições de Uso</h2>
      <ul>
        <li>✓ Uso acadêmico e educacional</li>
        <li>✓ Análises de políticas públicas</li>
        <li>✓ Pesquisa científica</li>
        <li>✓ Jornalismo de investigação</li>
        <li>✗ Fins comerciais sem autorização</li>
        <li>✗ Revenda de dados</li>
      </ul>

      <h2>Registro de Pesquisadores</h2>
      <p>
        Para acesso prioritário, APIs sem throttling e suporte técnico dedicado, registre seu projeto.
        Envie email com:
      </p>
      <ul>
        <li>Nome e instituição</li>
        <li>Descrição breve da pesquisa</li>
        <li>Datasets que pretende usar</li>
      </ul>

      <h2>Contato Técnico</h2>
      <p>
        Dúvidas sobre a API ou dados? Abra uma issue no{" "}
        <a href="https://github.com" target="_blank">repositório GitHub</a>.
      </p>
    </section>
  );
}
