/**
 * Busca deputados em exercício da ALEBA.
 * Fonte: API NoPaper — https://albalegis.nopapercloud.com.br/api/publico/parlamentar/
 * Formato: JSON paginado (pg, qtd)
 */

export interface DeputadoAleba {
  id_aleba: string;
  nome: string;
  nome_parlamentar: string | null;
  partido: string | null;
}

const BASE_URL = "https://albalegis.nopapercloud.com.br/api/publico/parlamentar/";
const PAGE_SIZE = 100;

export async function fetchDeputadosAleba(): Promise<DeputadoAleba[]> {
  const out: DeputadoAleba[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}?pg=${page}&qtd=${PAGE_SIZE}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "TransparenciaFederal/aleba-ingest (luiz@gastronomizae.com)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);

    const data = await res.json() as { total?: number; parlamentares?: any[] };
    const items: any[] = data.parlamentares ?? [];

    for (const item of items) {
      const id = String(item.parlamentarID ?? "").trim();
      if (!id) continue;
      out.push({
        id_aleba: id,
        nome: item.parlamentarRazaoSocial ?? "",
        nome_parlamentar: item.parlamentarNome ?? null,
        partido: item.partidoSigla ?? null,
      });
    }

    if (items.length < PAGE_SIZE) break;
    page++;
    await new Promise((r) => setTimeout(r, 500));
  }

  return out;
}
