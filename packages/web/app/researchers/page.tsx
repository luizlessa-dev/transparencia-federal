export const metadata = {
  title: "Para Pesquisadores — Datasets do Congresso Nacional | The BR Insider",
  description:
    "Datasets públicos sobre emendas parlamentares (2015–2026), despesas CEAP (2019–2026), votações e financiamento eleitoral TSE. Fontes primárias verificadas, licença CC-BY-4.0.",
  alternates: { canonical: "/researchers" },
};

export default function ResearchersPage() {
  return (
    <section className="section">
      <h1 className="page-title">Para Pesquisadores</h1>
      <p className="lead">
        Dados públicos do Congresso cruzados, verificados e com cobertura histórica desde 2015
      </p>

      <h2>Datasets Disponíveis</h2>
      <p>
        Os dados exibidos no The BR Insider são coletados de fontes oficiais abertas e
        processados para facilitar análises. As coberturas atuais são:
      </p>
      <ul>
        <li>
          <strong>Emendas Parlamentares:</strong> 2015–2026 — Portal da Transparência (API e CSV
          bulk). Campos: parlamentar, valor empenhado, valor pago, beneficiário, modalidade,
          função orçamentária
        </li>
        <li>
          <strong>Despesas CEAP — Câmara:</strong> 2019–2026 — CSV bulk anual (histórico) e API
          por deputado (57ª legislatura). Campos: deputado, tipo de despesa, fornecedor,
          CNPJ/CPF, valor líquido, data
        </li>
        <li>
          <strong>Despesas CEAP — Senado:</strong> 2019–2026 — CSV anual do Senado Federal
        </li>
        <li>
          <strong>Votações Plenárias:</strong> fev/2023–atual — API da Câmara. Campos: votação,
          deputado, voto, orientação de bancada, data
        </li>
        <li>
          <strong>Proposições Legislativas:</strong> 2019–2026 — proposições de autoria por
          deputado federal
        </li>
        <li>
          <strong>Financiamento Eleitoral TSE:</strong> 2018 e 2022 — receitas de campanha de
          deputados federais e senadores com origem dos recursos
        </li>
        <li>
          <strong>Bens Declarados ao TSE:</strong> 2018 e 2022 — patrimônio declarado por
          candidatos eleitos
        </li>
        <li>
          <strong>Score de Risco G5:</strong> índice composto por cinco dimensões — CEAP (30%),
          presença (20%), produção legislativa (15%), financiamento (20%) e emendas RP9 (15%)
        </li>
        <li>
          <strong>Frentes Parlamentares e Comissões:</strong> 319 frentes e 30 comissões
          permanentes da 57ª Legislatura com membros e scores individuais
        </li>
      </ul>

      <h2>Fontes Primárias</h2>
      <p>
        Todos os dados podem ser acessados diretamente nas fontes oficiais para verificação
        independente ou coleta própria:
      </p>
      <ul>
        <li>
          <a href="https://portaldatransparencia.gov.br/download-de-dados/emendas-parlamentares" target="_blank" rel="noopener noreferrer">
            Portal da Transparência — Emendas (CSV bulk)
          </a>
        </li>
        <li>
          <a href="https://dadosabertos.camara.leg.br/swagger/api.html" target="_blank" rel="noopener noreferrer">
            API da Câmara dos Deputados (dadosabertos.camara.leg.br)
          </a>
        </li>
        <li>
          <a href="https://www.camara.leg.br/cotas" target="_blank" rel="noopener noreferrer">
            CEAP Câmara — CSVs anuais (camara.leg.br/cotas)
          </a>
        </li>
        <li>
          <a href="https://legis.senado.leg.br/dadosabertos" target="_blank" rel="noopener noreferrer">
            Dados Abertos do Senado Federal
          </a>
        </li>
        <li>
          <a href="https://dadosabertos.tse.jus.br" target="_blank" rel="noopener noreferrer">
            Dados Abertos do TSE — financiamento e bens
          </a>
        </li>
      </ul>

      <h2>Citação Recomendada</h2>
      <pre style={{
        background: "hsl(var(--muted))",
        padding: "1rem",
        borderRadius: "6px",
        overflow: "auto",
        fontSize: "0.875rem",
        lineHeight: "1.6",
      }}>
{`The BR Insider. (2026). Base de dados de emendas
parlamentares, despesas CEAP e votações do Congresso Nacional.
https://www.thebrinsider.com

Dados coletados de:
- Portal da Transparência (portaldatransparencia.gov.br)
- Câmara dos Deputados (dadosabertos.camara.leg.br)
- Senado Federal (legis.senado.leg.br/dadosabertos)
- TSE (dadosabertos.tse.jus.br)`}
      </pre>

      <h2>Condições de Uso</h2>
      <p>
        Os dados exibidos são públicos e originalmente licenciados pelas fontes oficiais. O
        The BR Insider os reproduz sob os mesmos termos:
      </p>
      <ul>
        <li>✓ Uso acadêmico e educacional</li>
        <li>✓ Análises de políticas públicas</li>
        <li>✓ Pesquisa científica</li>
        <li>✓ Jornalismo de investigação</li>
        <li>✓ Citação com atribuição à fonte original e ao The BR Insider</li>
        <li>✗ Revenda de dados ou uso comercial sem autorização</li>
      </ul>

      <h2>Acesso Completo</h2>
      <p>
        O plano gratuito exibe o top 10 do Score de Risco e a listagem de frentes. Para acesso
        completo aos perfis individuais, votações detalhadas e filtros avançados, consulte os{" "}
        <a href="/planos">planos disponíveis</a>.
      </p>

      <h2>Contato</h2>
      <p>
        Dúvidas sobre metodologia, cobertura dos dados ou inconsistências? Entre em contato
        pela página <a href="/about">Sobre o Projeto</a>.
      </p>
    </section>
  );
}
