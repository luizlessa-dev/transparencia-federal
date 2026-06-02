/**
 * Cliente do share público (Nextcloud WebDAV) dos dados abertos CNPJ da Receita.
 *
 * O portal migrou pra Nextcloud; o path direto antigo morreu. O acesso atual é
 * via WebDAV do share público, com o TOKEN do share como usuário do basic-auth
 * (senha vazia). Confirmado 01/jun/2026:
 *   curl -u "TOKEN:" https://arquivos.receitafederal.gov.br/public.php/webdav/YYYY-MM/Socios0.zip
 * → 206 + magic PK (zip real). Suporta range.
 *
 * Override por env:
 *   RECEITA_SHARE_BASE   (default https://arquivos.receitafederal.gov.br/public.php/webdav)
 *   RECEITA_SHARE_TOKEN  (default YggdBLfdninEJX9 — share oficial da RFB)
 */
import { writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";

const BASE = (process.env.RECEITA_SHARE_BASE ?? "https://arquivos.receitafederal.gov.br/public.php/webdav").replace(/\/+$/, "");
const TOKEN = process.env.RECEITA_SHARE_TOKEN ?? "YggdBLfdninEJX9";
const UA = process.env.CVM_USER_AGENT ?? "TheBRInsider/1.0 (+https://thebrinsider.com)";
const authHeader = "Basic " + Buffer.from(`${TOKEN}:`).toString("base64");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Lista os meses (pastas) disponíveis no share via PROPFIND. */
export async function listarMeses(): Promise<string[]> {
  const res = await fetch(`${BASE}/`, {
    method: "PROPFIND",
    headers: { Authorization: authHeader, Depth: "1", "User-Agent": UA },
  });
  if (!res.ok && res.status !== 207) throw new Error(`PROPFIND HTTP ${res.status}`);
  const xml = await res.text();
  const meses = [...xml.matchAll(/\/public\.php\/webdav\/(\d{4}-\d{2})\//g)].map((m) => m[1]);
  return [...new Set(meses)].sort();
}

/**
 * Baixa um arquivo do share (ex. "2026-04/Socios0.zip") pra um destino local.
 * Retorna o caminho. Reusa o arquivo se já existir em disco. Retry em rede/5xx.
 */
export async function baixar(pathRel: string, destDir = tmpdir()): Promise<string> {
  const dest = resolve(destDir, pathRel.replace(/\//g, "_"));
  if (existsSync(dest)) return dest;
  let lastErr: unknown;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const res = await fetch(`${BASE}/${pathRel}`, { headers: { Authorization: authHeader, "User-Agent": UA } });
      if (!res.ok) {
        if (res.status >= 500 && tentativa < 4) { await sleep(2000 * tentativa); continue; }
        throw new Error(`download ${pathRel} HTTP ${res.status}`);
      }
      const buf = Buffer.from(await res.arrayBuffer());
      // sanity: ZIP começa com "PK"
      if (buf.length < 4 || buf[0] !== 0x50 || buf[1] !== 0x4b) {
        throw new Error(`${pathRel}: resposta não é ZIP (${buf.length}b) — token/share pode ter mudado`);
      }
      writeFileSync(dest, buf);
      return dest;
    } catch (e) {
      lastErr = e;
      if (tentativa === 4) throw e;
      await sleep(2000 * tentativa);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("baixar: falhou");
}

export const receitaBase = BASE;
export const receitaToken = TOKEN;
