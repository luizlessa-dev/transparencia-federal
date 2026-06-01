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

  return [...STATIC_PAGES, ...indice, ...perfis];
}
