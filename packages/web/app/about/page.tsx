export default function AboutPage() {
  return (
    <section className="section">
      <h1 className="page-title">Sobre Transparência Federal</h1>

      <h2>O Projeto</h2>
      <p>
        <strong>Transparência Federal</strong> reúne e organiza dados públicos sobre o Congresso Nacional,
        com foco em emendas parlamentares, despesas de gabinete e registros votivos. Nossa missão é oferecer
        uma visão clara e acessível desses dados para cidadãos, jornalistas, pesquisadores e organizações
        da sociedade civil.
      </p>

      <h2>Fontes de Dados</h2>
      <p>Os dados são coletados de fontes oficiais e públicas:</p>
      <ul>
        <li>
          <strong>Portal da Transparência</strong> — Emendas parlamentares, transferências voluntárias
          e informações de execução orçamentária ({" "}
          <a href="https://www.gov.br/transparencia" target="_blank">gov.br/transparencia</a>)
        </li>
        <li>
          <strong>Câmara dos Deputados — API Dados Abertos</strong> — Informações de deputados,
          despesas CEAPS e registros votivos ({" "}
          <a href="https://dadosabertos.camara.leg.br" target="_blank">dadosabertos.camara.leg.br</a>)
        </li>
        <li>
          <strong>Senado Federal</strong> — Dados de senadores e votações (em integração)
        </li>
      </ul>

      <h2>Tecnologia</h2>
      <p>
        Transparência Federal é construído com tecnologias modernas e abertas:
      </p>
      <ul>
        <li><strong>Frontend:</strong> Next.js + React com design responsivo</li>
        <li><strong>Backend:</strong> Node.js + TypeScript com ingestão de dados via APIs públicas</li>
        <li><strong>Banco de Dados:</strong> Supabase (PostgreSQL)</li>
        <li><strong>Deploy:</strong> Vercel</li>
        <li><strong>Licença:</strong> Código aberto (veja repositório GitHub)</li>
      </ul>

      <h2>Público-Alvo</h2>
      <p>
        Transparência Federal foi desenvolvida para atender diferentes públicos:
      </p>
      <ul>
        <li>
          <strong>Cidadãos</strong> — Entender como deputados gastam recursos públicos e exercer fiscalização
        </li>
        <li>
          <strong>Jornalistas</strong> — Dados estruturados para investigações e reportagens
        </li>
        <li>
          <strong>Pesquisadores</strong> — APIs e datasets para análises científicas
        </li>
        <li>
          <strong>ONGs</strong> — Monitoramento e campanhas de advocacy
        </li>
      </ul>

      <h2>Contato e Feedback</h2>
      <p>
        Tem sugestões ou encontrou um erro? Abra uma issue no{" "}
        <a href="https://github.com" target="_blank">repositório GitHub</a> ou envie um email com sua contribuição.
      </p>

      <h2>Disclaimer</h2>
      <p>
        Os dados apresentados neste site foram coletados de fontes públicas e oficiais. Ainda que tenhamos
        o cuidado de garantir a integridade das informações, não oferecemos garantias sobre a precisão
        completa ou atual dos dados. Sempre consulte as fontes originais para validações críticas.
      </p>
    </section>
  );
}
