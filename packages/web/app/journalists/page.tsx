export default function JournalistsPage() {
  return (
    <section className="section">
      <h1 className="page-title">Para Jornalistas</h1>
      <p className="lead">
        Dados estruturados e documentação técnica para investigações de qualidade
      </p>

      <h2>Recursos Disponíveis</h2>
      <p>
        Transparência Federal oferece dados estruturados que facilitam investigações jornalísticas:
      </p>
      <ul>
        <li><strong>Séries Históricas:</strong> Emendas e despesas desde 2023 com contexto temporal</li>
        <li><strong>Dados de Parceiros:</strong> Informações de fornecedores, empresas e pessoas jurídicas</li>
        <li><strong>APIs REST:</strong> Acesso programático a todos os dados para análises customizadas</li>
        <li><strong>Exportação em CSV:</strong> Dados tabulares prontos para análise em Excel ou R</li>
        <li><strong>Cruzamento de Dados:</strong> Links entre emendas, despesas, votações e deputados</li>
      </ul>

      <h2>Ideias de Pautas</h2>
      <p>
        Transparência Federal pode apoiar investigações sobre:
      </p>
      <ul>
        <li>Deputados com maior volume de emendas/despesas — existe concentração de poder orçamentário?</li>
        <li>Padrões regionais — estados menos desenvolvidos recebem menos recursos?</li>
        <li>Parceiros recorrentes — quais fornecedores mais recebem recursos de gabinetes?</li>
        <li>Comparações entre partidos — há diferenças de gasto por ideologia?</li>
        <li>Evolução de gastos — como mudaram despesas durante a pandemia ou crises econômicas?</li>
        <li>Deputados novatos — qual impacto na aprovação de suas emendas?</li>
      </ul>

      <h2>Documentação Técnica</h2>
      <p>
        Consulte nossa documentação de API em:
      </p>
      <pre style={{
        background: "#f5f5f5",
        padding: "1rem",
        borderRadius: "6px",
        overflow: "auto",
        fontSize: "0.875rem"
      }}>
{`GET /api/amendments?year=2024&state=SP
GET /api/deputy/[id]/expenses
GET /api/deputy/[id]/votes
GET /api/stats/summary`}
      </pre>

      <h2>Contato</h2>
      <p>
        Tem dúvidas sobre os dados ou precisa de um formato específico?
        Entre em contato conosco para discussões sobre investigações.
      </p>
    </section>
  );
}
