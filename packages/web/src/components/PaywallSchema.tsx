/**
 * PaywallSchema — JSON-LD para páginas com conteúdo pago.
 *
 * Implementa o padrão Google "Subscription and paywalled content":
 * https://developers.google.com/search/docs/appearance/structured-data/paywalled-content
 *
 * Sem este markup, o Googlebot pode detectar "cloaking" (conteúdo diferente
 * para bot vs. usuário) e penalizar o ranking. Com ele, o Google entende que
 * a restrição é legítima (paywall declarado) e mantém a indexação do teaser.
 */

interface Props {
  /** URL canônica da página (ex.: "https://www.thebrinsider.com/dossie/220559") */
  url: string;
  /** Título da página para o schema */
  headline: string;
  /** Seletor CSS da seção paga (ex.: ".paywall-section") */
  paywallSelector?: string;
  /** Tipo de schema — WebPage por padrão; NewsArticle para matérias */
  type?: "WebPage" | "NewsArticle" | "ProfilePage";
}

export function PaywallSchema({
  url,
  headline,
  paywallSelector = ".bloomberg-card",
  type = "WebPage",
}: Props) {
  const schema = {
    "@context": "https://schema.org",
    "@type": type,
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "headline": headline,
    "isAccessibleForFree": "False",
    "hasPart": {
      "@type": "WebPageElement",
      "isAccessibleForFree": "False",
      "cssSelector": paywallSelector,
    },
    "publisher": {
      "@type": "Organization",
      "name": "The BR Insider",
      "url": "https://www.thebrinsider.com",
    },
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
