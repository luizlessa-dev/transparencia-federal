/**
 * Configuração de identidade visual + nav por domínio.
 *
 * Quando o host do request é um subdomínio estadual (almg./alesp./alerj.),
 * o layout root troca o header e o footer pelos valores aqui definidos.
 *
 * O middleware já faz rewrite de `/` → `/<segmento>/` para subdomínios,
 * então os hrefs aqui são relativos (`/`, `/ranking`, etc.) e funcionam
 * tanto no subdomínio quanto via deep link `thebrinsider.com/<segmento>/...`.
 */

export interface SiteNavLink {
  label: string;
  /** Quando ausente, o item é tratado como cabeçalho de dropdown (precisa `children`). */
  href?: string;
  external?: boolean;
  /** Se presente, vira um dropdown agrupado em vez de link direto. */
  children?: SiteNavLink[];
}

export interface SiteFooterCol {
  label: string;
  links: SiteNavLink[];
}

export interface SiteConfig {
  /** Sigla curta usada no badge quadrado do header. */
  badge: string;
  /** Nome curto usado no título do header (linha 2). */
  shortName: string;
  /** Texto pequeno em caps acima do shortName ("Observatório Parlamentar"). */
  kicker: string;
  /** Frase do footer (1 linha) sob o logo. */
  tagline: string;
  /** Itens do menu principal (renderizados no <NavLinks />). */
  nav: SiteNavLink[];
  /** Colunas do footer. */
  footer: SiteFooterCol[];
  /** Texto da barra de copyright à esquerda. */
  copyLeft: string;
  /** Texto da barra de copyright à direita. */
  copyRight: string;
}

// ── Federal (default) ─────────────────────────────────────────────────────

export const FEDERAL_CONFIG: SiteConfig = {
  // "BR" é renderizado pelo componente <Logo />; o campo segue no schema porque
  // ALMG/ALESP/ALERJ continuam usando selos de UF.
  badge: "BR",
  shortName: "The BR Insider",
  kicker: "Inteligência sobre o poder público",
  tagline: "Dados, análises e radar do Congresso Nacional — sob curadoria jornalística independente.",
  nav: [
    { label: "Parlamentares", href: "/parlamentares" },
    { label: "Ranking", href: "/ranking" },
    {
      label: "Despesas",
      children: [
        { label: "CEAP Câmara", href: "/expenses" },
        { label: "CEAP Senado", href: "/senate-expenses" },
        { label: "Emendas Parlamentares", href: "/amendments" },
        { label: "Orçamento Secreto (RP9)", href: "/rp9" },
        { label: "Financiamento Eleitoral", href: "/funding" },
      ],
    },
    {
      label: "Atividade",
      children: [
        { label: "Votações em Plenário", href: "/voting" },
        { label: "Proposições", href: "/proposicoes" },
        { label: "Frentes Parlamentares", href: "/frentes" },
        { label: "Score de Risco G5", href: "/risco" },
      ],
    },
    {
      label: "Mais",
      children: [
        { label: "Empresas Sancionadas", href: "/sancionados" },
        { label: "Planos", href: "/planos" },
        { label: "Sobre o Projeto", href: "/about" },
      ],
    },
  ],
  footer: [
    {
      label: "Explorar",
      links: [
        { label: "Score de Risco", href: "/risco" },
        { label: "Frentes Parlamentares", href: "/frentes" },
        { label: "Ranking Nacional", href: "/ranking" },
        { label: "Emendas Parlamentares", href: "/amendments" },
        { label: "CEAP Câmara", href: "/expenses" },
        { label: "CEAP Senado", href: "/senate-expenses" },
      ],
    },
    {
      label: "Institucional",
      links: [
        { label: "Manifesto editorial", href: "/manifesto" },
        { label: "Sobre o Projeto", href: "/about" },
        { label: "Metodologia do Score", href: "/risco/metodologia" },
        { label: "Planos", href: "/planos" },
        { label: "Política de Correção", href: "/correcoes" },
        { label: "Termos de Uso", href: "/termos" },
        { label: "Política de Privacidade", href: "/privacidade" },
      ],
    },
    {
      label: "Fontes de Dados",
      links: [
        { label: "Portal da Transparência", href: "https://portaldatransparencia.gov.br", external: true },
        { label: "Câmara dos Deputados", href: "https://dadosabertos.camara.leg.br", external: true },
        { label: "Senado Federal", href: "https://legis.senado.leg.br/dadosabertos", external: true },
      ],
    },
  ],
  copyLeft: "Projeto independente · Sem vínculo com o Governo Federal",
  copyRight: "Lessa Labs Tecnologia Ltda. · CNPJ 65.659.055/0001-53 · contato@thebrinsider.com",
};

// ── ALMG · Minas Gerais ───────────────────────────────────────────────────

export const ALMG_CONFIG: SiteConfig = {
  badge: "MG",
  shortName: "ALMG — Minas Gerais",
  kicker: "The BR Insider · Estados",
  tagline: "Verba indenizatória dos 77 deputados estaduais de Minas Gerais, nota a nota.",
  nav: [
    { label: "Início", href: "/" },
    { label: "Ranking", href: "/ranking" },
    { label: "Federal ↗", href: "https://www.thebrinsider.com", external: true },
  ],
  footer: [
    {
      label: "Explorar",
      links: [
        { label: "Ranking de Gastos", href: "/ranking" },
        { label: "Início", href: "/" },
      ],
    },
    {
      label: "Fontes de Dados",
      links: [
        { label: "Portal de Transparência ALMG", href: "https://transparencia.almg.gov.br/", external: true },
        { label: "ALMG — Site oficial", href: "https://www.almg.gov.br/", external: true },
      ],
    },
  ],
  copyLeft: "Projeto independente · Sem vínculo com a ALMG",
  copyRight: "Lessa Labs Tecnologia Ltda. · CNPJ 65.659.055/0001-53 · contato@thebrinsider.com",
};

// ── ALESP · São Paulo ─────────────────────────────────────────────────────

export const ALESP_CONFIG: SiteConfig = {
  badge: "SP",
  shortName: "ALESP — São Paulo",
  kicker: "The BR Insider · Estados",
  tagline: "611 mil despesas de gabinete da ALESP, 11 anos de histórico, cruzáveis por CNPJ.",
  nav: [
    { label: "Início", href: "/" },
    { label: "Ranking", href: "/ranking" },
    { label: "Federal ↗", href: "https://www.thebrinsider.com", external: true },
  ],
  footer: [
    {
      label: "Explorar",
      links: [
        { label: "Ranking de Gastos", href: "/ranking" },
        { label: "Início", href: "/" },
      ],
    },
    {
      label: "Fontes de Dados",
      links: [
        { label: "Portal de Transparência ALESP", href: "https://www.al.sp.gov.br/transparencia/", external: true },
        { label: "ALESP — Site oficial", href: "https://www.al.sp.gov.br/", external: true },
      ],
    },
  ],
  copyLeft: "Projeto independente · Sem vínculo com a ALESP",
  copyRight: "Lessa Labs Tecnologia Ltda. · CNPJ 65.659.055/0001-53 · contato@thebrinsider.com",
};

// ── ALERJ · Rio de Janeiro ────────────────────────────────────────────────

export const ALERJ_CONFIG: SiteConfig = {
  badge: "RJ",
  shortName: "ALERJ — Rio de Janeiro",
  kicker: "The BR Insider · Estados",
  tagline: "A única assembleia do Sudeste sem dados abertos de despesas. LAI em curso.",
  nav: [
    { label: "Início", href: "/" },
    { label: "Pedido LAI", href: "/lai" },
    { label: "Federal ↗", href: "https://www.thebrinsider.com", external: true },
  ],
  footer: [
    {
      label: "Acompanhar",
      links: [
        { label: "Pedido LAI", href: "/lai" },
        { label: "Início", href: "/" },
      ],
    },
    {
      label: "Fontes",
      links: [
        { label: "Portal ALERJ", href: "https://www.alerj.rj.gov.br/", external: true },
        { label: "Lei de Acesso", href: "https://www.gov.br/acessoainformacao/", external: true },
      ],
    },
  ],
  copyLeft: "Projeto independente · Sem vínculo com a ALERJ",
  copyRight: "Lessa Labs Tecnologia Ltda. · CNPJ 65.659.055/0001-53 · contato@thebrinsider.com",
};

// ── Router de host → config ───────────────────────────────────────────────

export function getSiteConfigForHost(host: string | null | undefined): SiteConfig {
  if (!host) return FEDERAL_CONFIG;
  const h = host.toLowerCase();
  if (h.startsWith("almg.")) return ALMG_CONFIG;
  if (h.startsWith("alesp.")) return ALESP_CONFIG;
  if (h.startsWith("alerj.")) return ALERJ_CONFIG;
  return FEDERAL_CONFIG;
}
