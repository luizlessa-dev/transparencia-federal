/**
 * Cliente do CKAN de dados abertos do Estado de Minas Gerais.
 *
 * Base padrão: https://dados.mg.gov.br  (catálogo CKAN da CGE, licença CC-BY-4.0).
 * O endpoint "/api/3" do portal NOVO (transparencia.mg.gov.br) é fachada de uma
 * SPA Angular — NÃO é CKAN. Use o `dados.mg.gov.br` aqui.
 *
 * ATENÇÃO IP: o CKAN bloqueia IP de datacenter (responde 403). Rode de IP
 * residencial BR (cron local launchd) OU configure MG_CKAN_BASE apontando pro
 * Cloudflare Worker proxy (ver workers/almg-proxy).
 *
 * Override por env:
 *   MG_CKAN_BASE   (default https://dados.mg.gov.br)
 *   MG_USER_AGENT  (default identifica o The BR Insider)
 */
import { gunzipSync } from "zlib";
import { Throttle } from "./throttle.js";

const BASE = (process.env.MG_CKAN_BASE ?? "https://dados.mg.gov.br").replace(/\/+$/, "");
const USER_AGENT =
  process.env.MG_USER_AGENT ??
  "TheBRInsider/1.0 (+https://thebrinsider.com; jornalismo de dados; contato via site)";

const throttle = new Throttle({ minIntervalMs: Number(process.env.MG_THROTTLE_MS ?? 1500) });

const RETRIES = Number(process.env.MG_RETRIES ?? 4);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * fetch com retry/backoff. O CKAN de MG é instável (502/503/504 do nginx,
 * 429 de rate-limit, quedas de conexão). Repete em 5xx/429/erro de rede;
 * devolve a resposta (mesmo ruim) na última tentativa pra o caller logar.
 */
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
    throw new Error(
      `CKAN ${name}: resposta não-JSON (provável bloqueio de IP/SPA). Início: ${txt.slice(0, 120)}`,
    );
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
 * Busca registros estruturados via Datastore (quando datastore_active=true).
 * Retorna { fields, records, total }. Pagina com offset/limit.
 */
export function datastoreSearch(
  resourceId: string,
  opts: { limit?: number; offset?: number; q?: string } = {},
): Promise<{ total: number; fields: { id: string; type: string }[]; records: Record<string, unknown>[] }> {
  const params: Record<string, string | number> = { resource_id: resourceId, limit: opts.limit ?? 1000 };
  if (opts.offset) params.offset = opts.offset;
  if (opts.q) params.q = opts.q;
  return action("datastore_search", params);
}

/**
 * Baixa o conteúdo bruto de um resource (CSV ou CSV.GZ), descompactando gzip
 * quando necessário e decodificando latin-1 ou utf-8. CKAN serve o arquivo
 * direto pela `url` do resource.
 */
export async function fetchResourceText(
  url: string,
  encoding: "utf-8" | "latin1" = "utf-8",
): Promise<string> {
  const res = await fetchRetry(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`download resource HTTP ${res.status} — ${url}`);
  let buf = Buffer.from(await res.arrayBuffer());
  // .gz pela URL ou pelo magic number (1f 8b).
  const isGzip = /\.gz(\?|$)/i.test(url) || (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b);
  if (isGzip) buf = Buffer.from(gunzipSync(buf));
  return new TextDecoder(encoding).decode(buf);
}

export const ckanBase = BASE;
