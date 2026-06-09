import { MetadataRoute } from "next";
import { listarAnalises, getRanking } from "~/lib/radar-fab";

// Servido em radar.thebrinsider.com/sitemap.xml (via proxy /radar/sitemap.xml)
const BASE = "https://radar.thebrinsider.com";

export const revalidate = 86400;

export default async function radarSitemap(): Promise<MetadataRoute.Sitemap> {
  const estaticas: MetadataRoute.Sitemap = [
    { url: `${BASE}/`,            changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/ranking`,     changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/destinos`,    changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/frota`,       changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/busca`,       changeFrequency: "weekly",  priority: 0.6 },
    { url: `${BASE}/historico`,   changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/metodologia`, changeFrequency: "monthly", priority: 0.6 },
  ];

  // Análises mensais (uma URL por mês)
  let meses: MetadataRoute.Sitemap = [];
  try {
    const analises = await listarAnalises();
    meses = analises.map(a => ({
      url: `${BASE}/${a.mes}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));
  } catch { /* mantém sitemap válido se falhar */ }

  // Perfis de autoridade (uma URL por cargo com detalhe)
  let autoridades: MetadataRoute.Sitemap = [];
  try {
    const r = await getRanking();
    autoridades = (r?.ranking ?? [])
      .filter(x => x.slug)
      .map(x => ({
        url: `${BASE}/autoridade/${x.slug}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));
  } catch { /* idem */ }

  return [...estaticas, ...meses, ...autoridades];
}
