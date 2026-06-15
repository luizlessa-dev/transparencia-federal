import { MetadataRoute } from "next";
import { listarParlamentares } from "~/services/ranking";

const BASE = "https://www.thebrinsider.com";

const STATIC_PAGES: MetadataRoute.Sitemap = [
  {
    url: BASE,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "daily",
    priority: 1.0,
  },
  {
    url: `${BASE}/risco`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "weekly",
    priority: 0.9,
  },
  {
    url: `${BASE}/frentes`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.7,
  },
  {
    url: `${BASE}/planos`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE}/about`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.5,
  },
  {
    url: `${BASE}/citizens`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${BASE}/journalists`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${BASE}/researchers`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${BASE}/ngos`,
    lastModified: new Date("2026-05-22"),
    changeFrequency: "monthly",
    priority: 0.6,
  },
  {
    url: `${BASE}/risco/metodologia`,
    lastModified: new Date("2026-05-25"),
    changeFrequency: "monthly",
    priority: 0.8,
  },
  {
    url: `${BASE}/correcoes`,
    lastModified: new Date("2026-05-25"),
    changeFrequency: "yearly",
    priority: 0.4,
  },
  {
    url: `${BASE}/termos`,
    lastModified: new Date("2026-05-25"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${BASE}/privacidade`,
    lastModified: new Date("2026-05-25"),
    changeFrequency: "yearly",
    priority: 0.3,
  },
  {
    url: `${BASE}/manifesto`,
    lastModified: new Date("2026-05-25"),
    changeFrequency: "yearly",
    priority: 0.7,
  },
];

// Módulo de fiscalização do Executivo de Minas Gerais (/mg/*).
const MG_LASTMOD = new Date("2026-06-01");
const MG_PAGES: MetadataRoute.Sitemap = ([
  { url: `${BASE}/mg`, priority: 0.9, changeFrequency: "daily" },
  { url: `${BASE}/mg/fornecedores`, priority: 0.9, changeFrequency: "weekly" },
  { url: `${BASE}/mg/supersalarios`, priority: 0.8, changeFrequency: "weekly" },
  { url: `${BASE}/mg/contratos-sancionados`, priority: 0.8, changeFrequency: "weekly" },
  { url: `${BASE}/mg/pagamentos-sancionados`, priority: 0.8, changeFrequency: "weekly" },
  { url: `${BASE}/mg/licitacoes`, priority: 0.8, changeFrequency: "weekly" },
  { url: `${BASE}/mg/emendas-federais`, priority: 0.8, changeFrequency: "weekly" },
  { url: `${BASE}/mg/obras`, priority: 0.7, changeFrequency: "weekly" },
  { url: `${BASE}/mg/convenios`, priority: 0.7, changeFrequency: "weekly" },
  { url: `${BASE}/mg/covid`, priority: 0.7, changeFrequency: "monthly" },
  { url: `${BASE}/mg/terceirizados`, priority: 0.7, changeFrequency: "monthly" },
  { url: `${BASE}/mg/reparacao`, priority: 0.7, changeFrequency: "monthly" },
  { url: `${BASE}/mg/lrf`, priority: 0.7, changeFrequency: "monthly" },
  { url: `${BASE}/mg/restos`, priority: 0.7, changeFrequency: "monthly" },
  { url: `${BASE}/mg/diarias`, priority: 0.7, changeFrequency: "monthly" },
] as MetadataRoute.Sitemap).map((p) => ({ ...p, lastModified: MG_LASTMOD }));

// Eixo Convênios Federais (/convenios/*).
const CONVENIOS_PAGES: MetadataRoute.Sitemap = ([
  { url: `${BASE}/convenios/fornecedores`, priority: 0.7, changeFrequency: "monthly" },
] as MetadataRoute.Sitemap).map((p) => ({ ...p, lastModified: new Date("2026-06-15") }));

// Eixo Mercado de Capitais (/mercado-de-capitais/*).
const MERCADO_PAGES: MetadataRoute.Sitemap = ([
  { url: `${BASE}/mercado-de-capitais`, priority: 0.9, changeFrequency: "weekly" },
  { url: `${BASE}/mercado-de-capitais/galo-forte`, priority: 0.9, changeFrequency: "weekly" },
  { url: `${BASE}/mercado-de-capitais/emissores-sancionados`, priority: 0.8, changeFrequency: "weekly" },
] as MetadataRoute.Sitemap).map((p) => ({ ...p, lastModified: new Date("2026-06-01") }));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Índice de parlamentares + um perfil por parlamentar ativo (Câmara + Senado).
  // É o ativo de SEO principal: cada político tem URL própria indexável.
  const indice: MetadataRoute.Sitemap = [
    { url: `${BASE}/parlamentares`, changeFrequency: "daily", priority: 0.9 },
  ];

  let perfis: MetadataRoute.Sitemap = [];
  try {
    const parlamentares = await listarParlamentares();
    perfis = parlamentares.map((p) => ({
      url: `${BASE}/parlamentares/${p.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    perfis = []; // se a consulta falhar, mantém o sitemap estático válido
  }

  return [...STATIC_PAGES, ...MG_PAGES, ...CONVENIOS_PAGES, ...MERCADO_PAGES, ...indice, ...perfis];
}
