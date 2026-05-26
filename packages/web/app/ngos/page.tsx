export const metadata = {
  title: "Para ONGs e Sociedade Civil — Dados para Advocacy e Monitoramento | The BR Insider",
  description:
    "Use dados abertos do Congresso para relatórios de impacto, campanhas de advocacy e monitoramento de emendas parlamentares. Acesso gratuito sob licença CC-BY-4.0.",
  alternates: { canonical: "/ngos" },
};

export default function NGOsPage() {
  return (
    <section className="section">
      <h1 className="page-title">Para Organizações</h1>
      <p className="lead">
        Ferramentas e dados para advocacy, monitoramento e campanhas de impacto
      </p>

      <h2>Como Usar The BR Insider</h2>
      <p>
        Organizações da sociedade civil podem usar The BR Insider em:
      </p>
      <ul>
        <li>
          <strong>Relatórios de Impacto:</strong> Demonstre o uso de recursos públicos em educação,
          saúde, meio ambiente ou outra área de foco
        </li>
        <li>
          <strong>Campanhas de Advocacy:</strong> Identifique padrões de gasto e questione decisões
          de seus representantes com dados concretos
        </li>
        <li>
          <strong>Monitoramento:</strong> Acompanhe emendas relacionadas à sua causa ao longo do tempo
        </li>
        <li>
          <strong>Responsabilização:</strong> Crie bases para cobranças públicas usando dados verificados
        </li>
        <li>
          <strong>Pesquisa:</strong> Analise tendências em políticas públicas para sua área de atuação
        </li>
      </ul>

      <h2>Exemplos de Uso</h2>
      <p>
        <strong>Organização de Educação:</strong> Analise emendas aprovadas para educação por estado,
        compare investimento per capita por aluno, identifique regiões com menor priorização.
      </p>

      <p>
        <strong>Organização Ambiental:</strong> Consulte emendas para projetos ambientais,
        monitore se foram executadas e qual impacto tiveram.
      </p>

      <p>
        <strong>Organização de Direitos Humanos:</strong> Rastreie recursos para políticas públicas
        de direitos humanos e compare com outras prioridades orçamentárias.
      </p>

      <h2>Dados Abertos para ONGs</h2>
      <p>
        The BR Insider oferece acesso gratuito a todos os dados sob licença CC-BY-4.0.
        Você pode:
      </p>
      <ul>
        <li>✓ Usar dados em relatórios e publicações</li>
        <li>✓ Criar visualizações e infográficos</li>
        <li>✓ Compartilhar datasets com membros e parceiros</li>
        <li>✓ Integrar em seus próprios sites</li>
        <li>✓ Fazer análises customizadas</li>
      </ul>

      <p>
        O único requisito é dar crédito: cite "The BR Insider" e o link para este site.
      </p>

      <h2>APIs e Integrações</h2>
      <p>
        Se sua organização quer integrar dados em um painel próprio ou aplicativo,
        oferecemos APIs REST gratuitas e sem limite de requisições para ONGs.
      </p>

      <p>
        Exemplos de integração:
      </p>
      <ul>
        <li>Painel de monitoramento customizado</li>
        <li>Alertas automáticos para emendas relacionadas à sua causa</li>
        <li>Relatórios periódicos gerados automaticamente</li>
        <li>Visualizações interativas no seu site</li>
      </ul>

      <h2>Registro de Organizações</h2>
      <p>
        Para ativar features especiais para ONGs (como alertas customizados),
        registre sua organização:
      </p>
      <ul>
        <li>Nome e CNPJ da organização</li>
        <li>Website e redes sociais</li>
        <li>Áreas de foco (educação, saúde, ambiente, etc)</li>
        <li>Como pretende usar os dados</li>
      </ul>

      <p>
        Para iniciar uma conversa sobre integração de dados, entre em contato pelo{" "}
        <a href="/about">formulário de contato</a>.
      </p>

      <h2>Comunidade</h2>
      <p>
        Faça parte de uma comunidade de organizações usando dados abertos para impacto social.
        Compartilhe suas análises e colabore em projetos de transparência pública.
      </p>
    </section>
  );
}
