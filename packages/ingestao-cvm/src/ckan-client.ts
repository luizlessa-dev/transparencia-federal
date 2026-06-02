/**
 * Cliente do CKAN de dados abertos da CVM (Comissão de Valores Mobiliários).
 *
 * Base padrão: https://dados.cvm.gov.br  (CKAN real, licença ODbL — aberta,
 * pode redistribuir). Confirmado que a CVM NÃO bloqueia IP de datacenter (ao
 * contrário do CKAN de MG/ALMG), então roda em qualquer ambiente.
 *
 * Detalhe de formato: além da action API, a CVM serve os arquivos brutos em
 * listagem HTTP (/dados/...). Os bulk costumam ser ZIP anuais ou mensais
 * (ex. cda_fi_202504.zip, inf_trimestral_fip_2025.zip) contendo vários CSVs
 * latin-1 separados por `;`. O download/unzip dos bulk é tratado nos jobs;
 * aqui só batemos na action API (package_list/show/search) pro discover.
 *
 * Override por env:
 *   CVM_CKAN_BASE   (default https://dados.cvm.gov.br)
 *   CVM_USER_AGENT  (default identifica o The BR Insider)
 *   CVM_THROTTLE_MS (default 800)
 *   CVM_RETRIES     (default 4)
 */
import { gunzipSync } from "zlib";
import { Throttle } from "./throttle.js";

const BASE = (process.env.CVM_CKAN_BASE ?? "https://dados.cvm.gov.br").replace(/\/+$/, "");
const USER_AGENT =
  process.env.CVM_USER_AGENT ??
  "TheBRInsider/1.0 (+https://thebrinsider.com; jornalismo de dados; contato via site)";

const throttle = new Throttle({ minIntervalMs: Number(process.env.CVM_THROTTLE_MS ?? 800) });

const RETRIES = Number(process.env.CVM_RETRIES ?? 4);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch com retry/backoff em 5xx/429/erro de rede. */
async function fetchRetry(url: string, init: RequestInit): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await throttle.run(() => fetch(url, init));
      const retriable = res.status >= 500 || res.status === 429;
      if (!retriable || attempt === RETRIES) return res;
      console.warn(`  ↻ HTTP ${res.status} em ${url.slice(0, 80)} — tentativa ${attempt}/${RETRIES}`);
    } catch (e) {
      lastErr = e;
      if (attempt === RETRIES) throw e;
      console.warn(`  ↻ erro de rede (${(e as Error).message?.slice(0, 60)}) — tentativa ${attempt}/${RETRIES}`);
    }
    await sleep(1500 * attempt);
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetchRetry esgotou tentativas");
}

export type CkanResource = {
  id: string;
  name: string | null;
  format: string | null;
  url: string | null;
  datastore_active?: boolean;
  last_modified?: string | null;
};

export type CkanPackage = {
  name: string;
  title: string | null;
  notes?: string | null;
  organization?: { title?: string | null } | null;
  num_resources?: number;
  resources: CkanResource[];
};

async function action<T>(name: string, params: Record<string, string | number> = {}): Promise<T> {
  const qs = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
  const url = `${BASE}/api/3/action/${name}${qs ? `?${qs}` : ""}`;
  const res = await fetchRetry(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  const txt = await res.text();
  if (!res.ok) {
    throw new Error(`CKAN ${name} HTTP ${res.status} — ${txt.slice(0, 200)}`);
  }
  let body: any;
  try {
    body = JSON.parse(txt);
  } catch {
    throw new Error(`CKAN ${name}: resposta não-JSON. Início: ${txt.slice(0, 120)}`);
  }
  if (!body?.success) {
    throw new Error(`CKAN ${name}: success=false — ${JSON.stringify(body?.error ?? {}).slice(0, 200)}`);
  }
  return body.result as T;
}

/** Lista todos os nomes (slugs) de dataset do catálogo. */
export function packageList(): Promise<string[]> {
  return action<string[]>("package_list");
}

/** Busca datasets por texto livre. */
export async function packageSearch(q: string, rows = 50): Promise<{ count: number; results: CkanPackage[] }> {
  const r = await action<{ count: number; results: CkanPackage[] }>("package_search", { q, rows });
  return { count: r.count, results: r.results ?? [] };
}

/** Detalhe de um dataset (inclui resources com id/format/url). */
export function packageShow(id: string): Promise<CkanPackage> {
  return action<CkanPackage>("package_show", { id });
}

/**
 * Baixa o conteúdo bruto de um resource. Trata gzip (.gz / magic 1f 8b) e
 * decodifica latin-1 ou utf-8. ⚠️ ZIP (formato dos bulk da CVM) NÃO é tratado
 * aqui — os jobs que consomem ZIP descompactam por conta própria (fflate/unzip).
 */
export async function fetchResourceText(
  url: string,
  encoding: "utf-8" | "latin1" = "latin1",
): Promise<string> {
  const res = await fetchRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`download resource HTTP ${res.status} — ${url}`);
  let buf = Buffer.from(await res.arrayBuffer());
  const isGzip = /\.gz(\?|$)/i.test(url) || (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b);
  if (isGzip) buf = Buffer.from(gunzipSync(buf));
  return new TextDecoder(encoding).decode(buf);
}

/** Baixa o conteúdo bruto como Buffer (pros jobs que precisam descompactar ZIP). */
export async function fetchResourceBuffer(url: string): Promise<Buffer> {
  const res = await fetchRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`download resource HTTP ${res.status} — ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export const ckanBase = BASE;
